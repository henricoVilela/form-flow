package com.cronos.formflow_api.domain.form;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FormVersionRepository extends JpaRepository<FormVersion, UUID> {

    List<FormVersion> findByFormIdOrderByVersionDesc(UUID formId);

    @Query("SELECT MAX(fv.version) FROM FormVersion fv WHERE fv.form.id = :formId")
    Optional<Integer> findMaxVersionByFormId(@Param("formId") UUID formId);

    Optional<FormVersion> findByFormIdAndVersion(UUID formId, Integer version);

    @Query("SELECT fv FROM FormVersion fv WHERE fv.form.id = :formId ORDER BY fv.version DESC LIMIT 1")
    Optional<FormVersion> findLatestByFormId(@Param("formId") UUID formId);
}

