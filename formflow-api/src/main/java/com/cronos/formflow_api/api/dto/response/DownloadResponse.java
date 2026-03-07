package com.cronos.formflow_api.api.dto.response;

import java.util.UUID;

@lombok.Data
@lombok.Builder
public class DownloadResponse {
    private UUID fileId;
    private String downloadUrl;
    private Integer expiresIn;
}
