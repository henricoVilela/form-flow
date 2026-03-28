package com.cronos.formflow_api.api.dto.response;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UploadConfigResponse {
    private Long maxFileSizeMb;
    private Integer maxFilesTotal;
    private List<String> allowedTypes;
}
