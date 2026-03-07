package com.cronos.formflow_api.domain.form;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FormUploadConfigRepository extends JpaRepository<FormUploadConfig, UUID> {
    Optional<FormUploadConfig> findByFormId(UUID formId);
}
