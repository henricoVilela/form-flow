package com.cronos.formflow_api.infrastructure.storage;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PresignRequest {
    @NotNull  private UUID formId;
    @NotBlank private String fileName;
    @NotBlank private String mimeType;
    @NotNull  private Long sizeBytes;
}

