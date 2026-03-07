package com.cronos.formflow_api.api.dto.request;

import com.cronos.formflow_api.domain.form.FormLayout;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateFormRequest {
    @NotBlank private String title;
    private String description;
    private FormLayout layout;
}
