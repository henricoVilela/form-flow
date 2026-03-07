package com.cronos.formflow_api.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cronos.formflow_api.domain.form.FormVersion;
import com.fasterxml.jackson.databind.JsonNode;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FormVersionResponse {
    private UUID id;
    private UUID formId;
    private Integer version;
    private JsonNode schema;
    private LocalDateTime createdAt;

    public static FormVersionResponse from(FormVersion v) {
        return FormVersionResponse.builder()
                .id(v.getId())
                .formId(v.getForm().getId())
                .version(v.getVersion())
                .schema(v.getSchema())
                .createdAt(v.getCreatedAt())
                .build();
    }
}