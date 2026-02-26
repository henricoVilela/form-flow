package com.cronos.formflow_api.domain.response;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UploadedFileRepository extends JpaRepository<UploadedFile, UUID> {
    Optional<UploadedFile> findByIdAndStatus(UUID id, UploadStatus status);
    List<UploadedFile> findByResponseId(UUID responseId);
}
