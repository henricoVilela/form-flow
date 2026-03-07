package com.cronos.formflow_api.infrastructure.storage;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.cronos.formflow_api.domain.form.FormUploadConfig;
import com.cronos.formflow_api.domain.form.FormUploadConfigRepository;
import com.cronos.formflow_api.domain.response.UploadStatus;
import com.cronos.formflow_api.domain.response.UploadedFileRepository;
import com.cronos.formflow_api.shared.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Validações de upload executadas ANTES de gerar a presigned URL.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UploadValidator {

    private final UploadProperties uploadProperties;
    private final FormUploadConfigRepository formUploadConfigRepository;
    private final UploadedFileRepository uploadedFileRepository;

    /**
     * Valida todos os aspectos do upload.
     *
     * @param formId   ID do formulário
     * @param fileName nome original do arquivo
     * @param mimeType MIME type declarado pelo cliente
     * @param sizeBytes tamanho em bytes
     * @throws BusinessException com código específico para cada tipo de erro
     */
    public void validate(UUID formId, String fileName, String mimeType, Long sizeBytes) {
        List<String> errors = new ArrayList<>();

        // 1. Validações de segurança (sempre)
        validateSecurity(fileName, mimeType, errors);

        // 2. Busca config específica do formulário ou usa defaults
        FormUploadConfig formConfig = formUploadConfigRepository.findByFormId(formId).orElse(null);

        // 3. Valida MIME type
        validateMimeType(mimeType, formConfig, errors);

        // 4. Valida tamanho do arquivo
        validateFileSize(sizeBytes, formConfig, errors);

        // 5. Valida total de arquivos pendentes + confirmados para este form
        validateFileCount(formId, formConfig, errors);

        if (!errors.isEmpty()) {
            String message = String.join("; ", errors);
            throw new BusinessException("UPLOAD_VALIDATION_ERROR", message);
        }
    }

    private void validateSecurity(String fileName, String mimeType, List<String> errors) {
        // Nome do arquivo
        if (fileName == null || fileName.isBlank()) {
            errors.add("Nome do arquivo é obrigatório");
            return;
        }

        // Comprimento do nome
        if (fileName.length() > uploadProperties.getMaxFilenameLength()) {
            errors.add(String.format(
                    "Nome do arquivo excede o limite de %d caracteres",
                    uploadProperties.getMaxFilenameLength()
            ));
        }

        // Path traversal
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            errors.add("Nome do arquivo contém caracteres inválidos");
        }

        // Caracteres nulos
        if (fileName.contains("\0")) {
            errors.add("Nome do arquivo contém caracteres proibidos");
        }

        // Extensão bloqueada
        String extension = extractExtension(fileName).toLowerCase();
        if (uploadProperties.getBlockedExtensions().contains(extension)) {
            errors.add(String.format(
                    "Extensão '.%s' não é permitida por motivos de segurança", extension
            ));
        }

        // Dupla extensão suspeita (ex: foto.jpg.exe)
        if (hasSuspiciousDoubleExtension(fileName)) {
            errors.add("Arquivo com dupla extensão suspeita não é permitido");
        }

        // MIME type válido (formato tipo/subtipo)
        if (mimeType == null || !mimeType.matches("^[a-zA-Z0-9][a-zA-Z0-9!#$&.+\\-^_]*\\/[a-zA-Z0-9][a-zA-Z0-9!#$&.+\\-^_]*$")) {
            errors.add("MIME type inválido: " + mimeType);
        }
    }

    private void validateMimeType(String mimeType, FormUploadConfig formConfig, List<String> errors) {
        if (mimeType == null) return; // já reportado na segurança

        List<String> allowedTypes;

        if (formConfig != null && formConfig.getAllowedTypes() != null && formConfig.getAllowedTypes().length > 0) {
            allowedTypes = Arrays.asList(formConfig.getAllowedTypes());
        } else {
            allowedTypes = uploadProperties.getAllowedTypes();
        }

        boolean allowed = allowedTypes.stream().anyMatch(pattern -> matchesMimeType(mimeType, pattern));

        if (!allowed) {
            errors.add(String.format(
                    "Tipo de arquivo '%s' não é permitido. Tipos aceitos: %s",
                    mimeType, String.join(", ", allowedTypes)
            ));
        }
    }

    /**
     * Verifica se um MIME type corresponde a um pattern.
     * Suporta wildcard: "image/*" aceita "image/jpeg", "image/png", etc.
     */
    private boolean matchesMimeType(String mimeType, String pattern) {
        if (pattern.equals(mimeType)) return true;

        // Wildcard: "image/*"
        if (pattern.endsWith("/*")) {
            String prefix = pattern.substring(0, pattern.length() - 1); // "image/"
            return mimeType.startsWith(prefix);
        }

        return false;
    }

    // =============================================================
    // Validação de tamanho
    // =============================================================

    private void validateFileSize(Long sizeBytes, FormUploadConfig formConfig, List<String> errors) {
        if (sizeBytes == null || sizeBytes <= 0) {
            errors.add("Tamanho do arquivo deve ser maior que zero");
            return;
        }

        long maxSize;
        if (formConfig != null && formConfig.getMaxFileSize() != null) {
            maxSize = formConfig.getMaxFileSize();
        } else {
            maxSize = uploadProperties.getMaxFileSize();
        }

        if (sizeBytes > maxSize) {
            errors.add(String.format(
                    "Arquivo excede o tamanho máximo de %s. Tamanho enviado: %s",
                    formatBytes(maxSize), formatBytes(sizeBytes)
            ));
        }
    }

    private void validateFileCount(UUID formId, FormUploadConfig formConfig, List<String> errors) {
        int maxFiles;
        if (formConfig != null && formConfig.getMaxFilesTotal() != null) {
            maxFiles = formConfig.getMaxFilesTotal();
        } else {
            maxFiles = uploadProperties.getMaxFilesPerResponse();
        }

        long currentCount = uploadedFileRepository.countByFormIdAndStatusIn(
            formId,
            List.of(UploadStatus.PENDING, UploadStatus.CONFIRMED)
        );

        if (currentCount >= maxFiles) {
            errors.add(String.format(
                    "Limite de %d arquivos atingido para este formulário (%d existentes)",
                    maxFiles, currentCount
            ));
        }
    }

    private String extractExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot < 0 || lastDot == fileName.length() - 1) return "";
        return fileName.substring(lastDot + 1);
    }

    /**
     * Detecta dupla extensão suspeita onde a última extensão é perigosa.
     * Ex: "relatorio.pdf.exe" → true
     * Ex: "foto.backup.jpg" → false (jpg não é perigosa)
     */
    private boolean hasSuspiciousDoubleExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot <= 0) return false;

        String lastExt = fileName.substring(lastDot + 1).toLowerCase();
        if (!uploadProperties.getBlockedExtensions().contains(lastExt)) return false;

        // Tem outro ponto antes → dupla extensão com extensão perigosa
        String withoutLastExt = fileName.substring(0, lastDot);
        return withoutLastExt.contains(".");
    }

    /**
     * Formata bytes para exibição legível.
     * Ex: 10485760 → "10 MB"
     */
    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1_048_576) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1_073_741_824) return String.format("%.1f MB", bytes / 1_048_576.0);
        return String.format("%.1f GB", bytes / 1_073_741_824.0);
    }
}