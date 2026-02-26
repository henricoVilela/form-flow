package com.cronos.formflow_api.infrastructure.storage;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.domain.form.Form;
import com.cronos.formflow_api.domain.form.FormRepository;
import com.cronos.formflow_api.domain.response.UploadStatus;
import com.cronos.formflow_api.domain.response.UploadedFile;
import com.cronos.formflow_api.domain.response.UploadedFileRepository;
import com.cronos.formflow_api.shared.exception.BusinessException;
import com.cronos.formflow_api.shared.exception.ResourceNotFoundException;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StorageService {

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;
    private final UploadedFileRepository uploadedFileRepository;
    private final FormRepository formRepository;

    @Transactional
    public PresignResponse presign(PresignRequest request) {
        Form form = formRepository.findById(request.getFormId())
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));

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
                    .originalName(request.getFileName())
                    .mimeType(request.getMimeType())
                    .sizeBytes(request.getSizeBytes())
                    .storageKey(storageKey)
                    .status(UploadStatus.PENDING)
                    .build();

            uploadedFileRepository.save(uploadedFile);

            return PresignResponse.builder()
                    .fileId(uploadedFile.getId())
                    .presignedUrl(presignedUrl)
                    .expiresIn(minioProperties.getPresignedUrlExpiry())
                    .build();

        } catch (Exception e) {
            throw new BusinessException("STORAGE_ERROR", "Erro ao gerar URL de upload: " + e.getMessage());
        }
    }

    @Transactional
    public void confirm(UUID fileId) {
        UploadedFile file = uploadedFileRepository.findByIdAndStatus(fileId, UploadStatus.PENDING)
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo não encontrado ou já confirmado"));

        file.setStatus(UploadStatus.CONFIRMED);
        file.setConfirmedAt(LocalDateTime.now());
        uploadedFileRepository.save(file);
    }

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
            throw new BusinessException("STORAGE_ERROR", "Erro ao gerar URL de download");
        }
    }

    private String buildStorageKey(UUID formId, String fileName) {
        String ext = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf('.')) : "";
        return String.format("forms/%s/%s%s", formId, UUID.randomUUID(), ext);
    }
}
