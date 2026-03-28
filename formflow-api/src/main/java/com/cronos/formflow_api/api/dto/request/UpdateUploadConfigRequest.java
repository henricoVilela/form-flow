package com.cronos.formflow_api.api.dto.request;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUploadConfigRequest {

    @NotNull
    @Min(1)
    @Max(100)
    private Long maxFileSizeMb;

    @NotNull
    @Min(1)
    @Max(500)
    private Integer maxFilesTotal;

    @NotNull
    @Size(min = 1)
    private List<String> allowedTypes;
}
