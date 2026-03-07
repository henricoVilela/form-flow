package com.cronos.formflow_api.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cronos.formflow_api.domain.response.Response;
import com.fasterxml.jackson.databind.JsonNode;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResponseDetailResponse {
    private UUID id;
    private UUID formId;
    private UUID formVersionId;
    private JsonNode payload;
    private JsonNode metadata;
    private LocalDateTime submittedAt;

    public static ResponseDetailResponse from(Response r) {
        return ResponseDetailResponse.builder()
                .id(r.getId())
                .formId(r.getForm().getId())
                .formVersionId(r.getFormVersion().getId())
                .payload(r.getPayload())
                .metadata(r.getMetadata())
                .submittedAt(r.getSubmittedAt())
                .build();
    }
}