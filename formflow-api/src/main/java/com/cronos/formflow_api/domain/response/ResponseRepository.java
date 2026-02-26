package com.cronos.formflow_api.domain.response;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ResponseRepository extends JpaRepository<Response, UUID>, JpaSpecificationExecutor<Response> {

    Page<Response> findByFormId(UUID formId, Pageable pageable);

    Optional<Response> findByIdAndFormId(UUID id, UUID formId);

    @Query("SELECT r FROM Response r WHERE r.form.id = :formId ORDER BY r.submittedAt DESC")
    List<Response> findAllByFormIdForExport(@Param("formId") UUID formId);
}
