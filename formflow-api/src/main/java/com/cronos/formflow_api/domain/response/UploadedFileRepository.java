package com.cronos.formflow_api.domain.response;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UploadedFileRepository extends JpaRepository<UploadedFile, UUID> {

    Optional<UploadedFile> findByIdAndStatus(UUID id, UploadStatus status);

    List<UploadedFile> findByResponseId(UUID responseId);

    /**
     * Conta arquivos de um formulário que estão nos status indicados.
     * Usado pelo UploadValidator para verificar limite de arquivos.
     */
    long countByFormIdAndStatusIn(UUID formId, Collection<UploadStatus> statuses);

    /**
     * Busca arquivos PENDING criados antes do threshold (órfãos).
     * Limitado por batch para não sobrecarregar.
     *
     * Um arquivo é considerado órfão se:
     * - Status = PENDING (nunca confirmado)
     * - uploadedAt < threshold (há mais de X horas)
     */
    @Query("""
        SELECT f FROM UploadedFile f
        WHERE f.status = com.cronos.formflow_api.domain.response.UploadStatus.PENDING
          AND f.uploadedAt < :threshold
        ORDER BY f.uploadedAt ASC
        LIMIT :limit
    """)
    List<UploadedFile> findOrphanedPending(
            @Param("threshold") LocalDateTime threshold,
            @Param("limit") int limit
    );

    /**
     * Marca arquivos como DELETED em lote.
     * Usado pelo OrphanFileCleanupJob após remover do MinIO.
     */
    @Modifying
    @Query("UPDATE UploadedFile f SET f.status = com.cronos.formflow_api.domain.response.UploadStatus.DELETED WHERE f.id IN :ids")
    int markAsDeleted(@Param("ids") Collection<UUID> ids);

    /**
     * Conta total de arquivos órfãos pendentes (para monitoramento/dashboard).
     */
    @Query("""
        SELECT COUNT(f) FROM UploadedFile f
        WHERE f.status = com.cronos.formflow_api.domain.response.UploadStatus.PENDING
          AND f.uploadedAt < :threshold
    """)
    long countOrphanedPending(@Param("threshold") LocalDateTime threshold);
}
