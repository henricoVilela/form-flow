package com.cronos.formflow_api.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cronos.formflow_api.domain.response.Response;

import lombok.Builder;
import lombok.Data;
import tools.jackson.databind.JsonNode;

@Data
@Builder
public class ResponseSummaryResponse {
    private UUID id;
    private UUID formVersionId;
    private Integer formVersion;
    private LocalDateTime submittedAt;
    private JsonNode metadata;

    public static ResponseSummaryResponse from(Response r) {
        return ResponseSummaryResponse.builder()
                .id(r.getId())
                .formVersionId(r.getFormVersion().getId())
                .formVersion(r.getFormVersion().getVersion())
                .submittedAt(r.getSubmittedAt())
                .metadata(r.getMetadata())
                .build();
    }
}
