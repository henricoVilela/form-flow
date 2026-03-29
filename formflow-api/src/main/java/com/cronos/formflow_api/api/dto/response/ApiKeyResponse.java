package com.cronos.formflow_api.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cronos.formflow_api.domain.apikey.ApiKey;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ApiKeyResponse {

    private UUID id;
    private String name;
    private String keyPrefix;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime lastUsedAt;

    public static ApiKeyResponse from(ApiKey apiKey) {
        return ApiKeyResponse.builder()
                .id(apiKey.getId())
                .name(apiKey.getName())
                .keyPrefix(apiKey.getKeyPrefix())
                .active(apiKey.isActive())
                .createdAt(apiKey.getCreatedAt())
                .lastUsedAt(apiKey.getLastUsedAt())
                .build();
    }
}
