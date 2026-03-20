package com.cronos.formflow_api.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cronos.formflow_api.domain.form.FormRespondent;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RespondentResponse {

    private UUID id;
    private UUID formId;
    private String name;
    private String token;
    private Integer maxResponses;
    private int responseCount;
    private boolean active;
    private LocalDateTime createdAt;

    public static RespondentResponse from(FormRespondent r) {
        return RespondentResponse.builder()
                .id(r.getId())
                .formId(r.getForm().getId())
                .name(r.getName())
                .token(r.getToken())
                .maxResponses(r.getMaxResponses())
                .responseCount(r.getResponseCount())
                .active(r.isActive())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
