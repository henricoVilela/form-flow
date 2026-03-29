package com.cronos.formflow_api.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateApiKeyRequest {

    @NotBlank
    @Size(min = 1, max = 100)
    private String name;
}
