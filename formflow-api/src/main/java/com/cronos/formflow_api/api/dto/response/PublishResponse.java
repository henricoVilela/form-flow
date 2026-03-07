package com.cronos.formflow_api.api.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class PublishResponse {
    private UUID formId;
    private Integer version;
    private LocalDateTime publishedAt;
}
