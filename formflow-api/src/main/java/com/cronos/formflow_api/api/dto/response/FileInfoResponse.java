package com.cronos.formflow_api.api.dto.response;

import java.util.UUID;

@lombok.Data
@lombok.Builder
public class FileInfoResponse {
    private UUID fileId;
    private String originalName;
    private String mimeType;
    private Long sizeBytes;
    private String status;
}