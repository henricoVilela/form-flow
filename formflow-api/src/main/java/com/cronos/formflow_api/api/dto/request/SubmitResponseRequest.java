package com.cronos.formflow_api.api.dto.request;

import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubmitResponseRequest {
    @NotNull private UUID formVersionId;
    @NotNull private JsonNode payload;
    private JsonNode metadata;
}
