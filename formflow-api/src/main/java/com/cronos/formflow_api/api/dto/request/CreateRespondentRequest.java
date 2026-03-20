package com.cronos.formflow_api.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateRespondentRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    private Integer maxResponses;
}
