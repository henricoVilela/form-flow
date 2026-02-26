package com.cronos.formflow_api.infrastructure.storage;

import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PresignResponse {
    private UUID fileId;
    private String presignedUrl;
    private Integer expiresIn;
}
