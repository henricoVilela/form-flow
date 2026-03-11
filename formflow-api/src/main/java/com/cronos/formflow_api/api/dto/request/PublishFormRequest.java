package com.cronos.formflow_api.api.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import tools.jackson.databind.JsonNode;

@Data
public class PublishFormRequest {
    @NotNull private JsonNode schema;
}
