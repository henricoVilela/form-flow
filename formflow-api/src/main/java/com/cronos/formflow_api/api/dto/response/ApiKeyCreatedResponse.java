package com.cronos.formflow_api.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

/**
 * Retornado apenas na criação — contém a chave bruta (plaintext).
 * Não é possível recuperá-la depois.
 */
@Getter
@Builder
public class ApiKeyCreatedResponse {

    private UUID id;
    private String name;
    private String keyPrefix;
    /** Chave bruta — exibida uma única vez. Não armazenada. */
    private String key;
    private LocalDateTime createdAt;
}
