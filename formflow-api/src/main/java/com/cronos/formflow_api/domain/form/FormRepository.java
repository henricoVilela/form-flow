package com.cronos.formflow_api.domain.form;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FormRepository extends JpaRepository<Form, UUID> {

    Page<Form> findByUserIdAndStatusNot(UUID userId, FormStatus status, Pageable pageable);

    @Query("SELECT f FROM Form f WHERE f.id = :id AND f.user.id = :userId")
    Optional<Form> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);
}

