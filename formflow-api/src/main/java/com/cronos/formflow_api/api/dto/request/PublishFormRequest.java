package com.cronos.formflow_api.api.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PublishFormRequest {
    @NotNull private JsonNode schema;
}
