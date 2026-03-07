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
     * Usado pelo UploadValidator para verificar se o limite foi atingido.
     */
    long countByFormIdAndStatusIn(UUID formId, Collection<UploadStatus> statuses);

    /**
     * Busca arquivos PENDING há mais de X horas (para limpeza de órfãos).
     * Uso: scheduled job de cleanup.
     */
    @Query("SELECT f FROM UploadedFile f WHERE f.status = 'PENDING' AND f.uploadedAt < :threshold")
    List<UploadedFile> findOrphanedPending(@Param("threshold") LocalDateTime threshold);

    /**
     * Marca arquivos como DELETED em lote (para cleanup).
     */
    @Modifying
    @Query("UPDATE UploadedFile f SET f.status = 'DELETED' WHERE f.id IN :ids")
    int markAsDeleted(@Param("ids") Collection<UUID> ids);
}
