package com.cronos.formflow_api.api.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import tools.jackson.databind.JsonNode;

@Data
public class SubmitResponseRequest {
    @NotNull private UUID formVersionId;
    @NotNull private JsonNode payload;
    private JsonNode metadata;
}
