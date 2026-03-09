package com.cronos.formflow_api.infrastructure.storage;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.domain.response.UploadedFile;
import com.cronos.formflow_api.domain.response.UploadedFileRepository;

import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Job agendado para limpeza de arquivos órfãos no MinIO.
 *
 * Um arquivo se torna "órfão" quando:
 * - O frontend solicitou presigned URL (status = PENDING)
 * - Mas nunca confirmou o upload (não chamou /upload/{id}/confirm)
 * - E nunca foi vinculado a uma resposta
 *
 * Isso acontece quando:
 * - O usuário cancelou o upload antes de concluir
 * - O navegador fechou durante o preenchimento
 * - Houve erro de rede no upload direto ao MinIO
 * - O usuário trocou o arquivo antes de submeter
 *
 * Regras:
 * - Só remove arquivos PENDING há mais de X horas (configurável)
 * - Remove do MinIO primeiro, depois marca como DELETED no banco
 * - Se falhar a remoção do MinIO, loga o erro mas marca como DELETED mesmo assim
 *   (para não tentar infinitamente; o MinIO tem lifecycle policies para limpeza)
 * - Processa em lotes para não sobrecarregar
 *
 * Frequência: a cada 1 hora (configurável via application.yaml)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrphanFileCleanupJob {

    private final UploadedFileRepository uploadedFileRepository;
    private final MinioClient minioClient;
    private final MinioProperties minioProperties;
    private final CleanupProperties cleanupProperties;

    /**
     * Executa a limpeza de arquivos órfãos.
     *
     * Frequência padrão: a cada 1 hora.
     * Configurável via:
     *   cleanup.cron: "0 0 * * * *"           (cron expression)
     *   cleanup.orphan-threshold-hours: 24     (horas para considerar órfão)
     *   cleanup.batch-size: 100                (máximo por execução)
     */
    @Scheduled(cron = "${cleanup.cron:0 0 * * * *}")
    @Transactional
    public void cleanOrphanedFiles() {
        LocalDateTime threshold = LocalDateTime.now()
                .minusHours(cleanupProperties.getOrphanThresholdHours());

        List<UploadedFile> orphans = uploadedFileRepository.findOrphanedPending(
                threshold,
                cleanupProperties.getBatchSize()
        );

        if (orphans.isEmpty()) {
            log.debug("Cleanup: nenhum arquivo órfão encontrado");
            return;
        }

        log.info("Cleanup: encontrados {} arquivos órfãos (PENDING há mais de {}h)",
                orphans.size(), cleanupProperties.getOrphanThresholdHours());

        int removedFromMinio = 0;
        int failedMinio = 0;
        List<UUID> idsToMarkDeleted = new java.util.ArrayList<>();

        for (UploadedFile orphan : orphans) {
            // Tenta remover do MinIO
            boolean removedFromStorage = removeFromMinio(orphan.getStorageKey());

            if (removedFromStorage) {
                removedFromMinio++;
            } else {
                failedMinio++;
                // Mesmo falhando no MinIO, marca como DELETED para não tentar de novo.
                // O MinIO pode ter lifecycle policies para limpar objetos antigos.
            }

            idsToMarkDeleted.add(orphan.getId());
        }

        // Marca todos como DELETED em lote
        if (!idsToMarkDeleted.isEmpty()) {
            int updated = uploadedFileRepository.markAsDeleted(idsToMarkDeleted);
            log.info("Cleanup concluído: {} marcados como DELETED, {} removidos do MinIO, {} falhas no MinIO",
                    updated, removedFromMinio, failedMinio);
        }
    }

    /**
     * Remove um objeto do MinIO.
     *
     * @param storageKey chave do objeto no bucket
     * @return true se removeu com sucesso ou se o objeto já não existia
     */
    private boolean removeFromMinio(String storageKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minioProperties.getBucketUploads())
                            .object(storageKey)
                            .build()
            );
            log.debug("Cleanup: removido do MinIO: {}", storageKey);
            return true;
        } catch (Exception e) {
            log.warn("Cleanup: falha ao remover do MinIO: {} - {}", storageKey, e.getMessage());
            return false;
        }
    }
}
