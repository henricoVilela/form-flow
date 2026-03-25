package com.cronos.formflow_api.infrastructure.storage;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.api.dto.response.FileInfoResponse;
import com.cronos.formflow_api.domain.form.Form;
import com.cronos.formflow_api.domain.form.FormRepository;
import com.cronos.formflow_api.domain.response.UploadStatus;
import com.cronos.formflow_api.domain.response.UploadedFile;
import com.cronos.formflow_api.domain.response.UploadedFileRepository;
import com.cronos.formflow_api.shared.exception.BusinessException;
import com.cronos.formflow_api.shared.exception.ResourceNotFoundException;

import io.minio.GetObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.http.Method;

import java.io.InputStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;
    private final UploadedFileRepository uploadedFileRepository;
    private final FormRepository formRepository;
    private final UploadValidator uploadValidator;

    /**
     * Valida o upload, registra na tabela uploaded_files e gera presigned URL.
     *
     * Fluxo:
     * 1. Verifica se o formulário existe
     * 2. Executa TODAS as validações via UploadValidator:
     *    - Segurança: extensão bloqueada, path traversal, dupla extensão
     *    - MIME type: verificado contra config do form ou defaults globais
     *    - Tamanho: verificado contra config do form ou defaults globais
     *    - Contagem: total de arquivos do formulário não excedido
     * 3. Gera storageKey único (forms/{formId}/{uuid}.ext)
     * 4. Gera presigned URL (PUT) com expiração configurável
     * 5. Salva registro como PENDING
     *
     * @param request dados do arquivo
     * @return fileId + presignedUrl + expiresIn
     * @throws BusinessException se qualquer validação falhar
     */
    @Transactional
    public PresignResponse presign(PresignRequest request) {
        Form form = formRepository.findById(request.getFormId())
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));

        uploadValidator.validate(
                form.getId(),
                request.getFileName(),
                request.getMimeType(),
                request.getSizeBytes()
        );

        String storageKey = buildStorageKey(form.getId(), request.getFileName());

        try {
            String presignedUrl = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.PUT)
                            .bucket(minioProperties.getBucketUploads())
                            .object(storageKey)
                            .expiry(minioProperties.getPresignedUrlExpiry(), TimeUnit.SECONDS)
                            .build()
            );

            UploadedFile uploadedFile = UploadedFile.builder()
                    .form(form)
                    .originalName(sanitizeFileName(request.getFileName()))
                    .mimeType(request.getMimeType())
                    .sizeBytes(request.getSizeBytes())
                    .storageKey(storageKey)
                    .status(UploadStatus.PENDING)
                    .build();

            uploadedFileRepository.save(uploadedFile);

            log.info("Presign gerado: formId={}, fileId={}, mime={}, size={}",
                    form.getId(), uploadedFile.getId(), request.getMimeType(), request.getSizeBytes());

            return PresignResponse.builder()
                    .fileId(uploadedFile.getId())
                    .presignedUrl(presignedUrl)
                    .expiresIn(minioProperties.getPresignedUrlExpiry())
                    .build();

        } catch (BusinessException e) {
            throw e; // re-throw validações
        } catch (Exception e) {
            log.error("Erro ao gerar presigned URL: {}", e.getMessage(), e);
            throw new BusinessException("STORAGE_ERROR", "Erro ao gerar URL de upload: " + e.getMessage());
        }
    }

    /**
     * Confirma que o upload direto ao MinIO foi concluído com sucesso.
     */
    @Transactional
    public void confirm(UUID fileId) {
        UploadedFile file = uploadedFileRepository.findByIdAndStatus(fileId, UploadStatus.PENDING)
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo não encontrado ou já confirmado"));

        file.setStatus(UploadStatus.CONFIRMED);
        file.setConfirmedAt(LocalDateTime.now());
        uploadedFileRepository.save(file);

        log.info("Upload confirmado: fileId={}, name={}", fileId, file.getOriginalName());
    }

    /**
     * Gera presigned URL temporária para download.
     */
    public String getDownloadUrl(UUID fileId) {
        UploadedFile file = uploadedFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo não encontrado"));

        if (file.getStatus() == UploadStatus.DELETED) {
            throw new BusinessException("FILE_DELETED", "Arquivo não está mais disponível");
        }

        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(minioProperties.getBucketUploads())
                            .object(file.getStorageKey())
                            .expiry(minioProperties.getPresignedUrlExpiry(), TimeUnit.SECONDS)
                            .build()
            );
        } catch (Exception e) {
            log.error("Erro ao gerar URL de download: fileId={}", fileId, e);
            throw new BusinessException("STORAGE_ERROR", "Erro ao gerar URL de download");
        }
    }

    /**
     * Retorna metadados do arquivo.
     */
    public FileInfoResponse getFileInfo(UUID fileId) {
        UploadedFile file = uploadedFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo não encontrado"));

        return FileInfoResponse.builder()
                .fileId(file.getId())
                .originalName(file.getOriginalName())
                .mimeType(file.getMimeType())
                .sizeBytes(file.getSizeBytes())
                .status(file.getStatus().name())
                .build();
    }

    /**
     * Retorna um InputStream para download direto do arquivo (usado no export ZIP).
     */
    public InputStream downloadFile(UploadedFile file) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(minioProperties.getBucketUploads())
                            .object(file.getStorageKey())
                            .build()
            );
        } catch (Exception e) {
            log.error("Erro ao baixar arquivo: fileId={}", file.getId(), e);
            throw new BusinessException("STORAGE_ERROR", "Erro ao ler arquivo: " + file.getId());
        }
    }

    /**
     * Retorna o tempo de expiração configurado para presigned URLs.
     */
    public Integer getPresignedUrlExpiry() {
        return minioProperties.getPresignedUrlExpiry();
    }

    // ── Helpers ────────────────────────────────────────────

    private String buildStorageKey(UUID formId, String fileName) {
        String ext = extractExtension(fileName);
        return String.format("forms/%s/%s%s", formId, UUID.randomUUID(), ext);
    }

    private String extractExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) return "";
        return fileName.substring(fileName.lastIndexOf('.'));
    }

    /**
     * Sanitiza o nome do arquivo, removendo caracteres perigosos
     * mas mantendo legível para o usuário.
     */
    private String sanitizeFileName(String fileName) {
        if (fileName == null) return "unnamed";

        // Remove path separators e caracteres de controle
        String sanitized = fileName
                .replaceAll("[/\\\\]", "_")
                .replaceAll("[\\x00-\\x1F\\x7F]", "")
                .trim();

        // Limita comprimento
        if (sanitized.length() > 255) {
            String ext = extractExtension(sanitized);
            sanitized = sanitized.substring(0, 255 - ext.length()) + ext;
        }

        return sanitized.isBlank() ? "unnamed" : sanitized;
    }
}
