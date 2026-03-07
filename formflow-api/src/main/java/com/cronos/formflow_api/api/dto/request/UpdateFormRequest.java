package com.cronos.formflow_api.api.dto.request;

import com.cronos.formflow_api.domain.form.FormLayout;
import com.fasterxml.jackson.databind.JsonNode;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateFormRequest {
    @NotBlank private String title;
    private String description;
    private FormLayout layout;
    private JsonNode schema;
}
