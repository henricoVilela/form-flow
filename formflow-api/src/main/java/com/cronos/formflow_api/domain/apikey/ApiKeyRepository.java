package com.cronos.formflow_api.domain.apikey;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    List<ApiKey> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT a FROM ApiKey a JOIN FETCH a.user WHERE a.keyHash = :keyHash AND a.active = true"
    )
    Optional<ApiKey> findByKeyHashAndActiveTrueWithUser(@org.springframework.data.repository.query.Param("keyHash") String keyHash);
}
