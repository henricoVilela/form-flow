package com.cronos.formflow_api.api.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;
import tools.jackson.databind.JsonNode;

@Data
@Builder
public class ResponseLookupResponse {

    private UUID id;
    private UUID formId;
    private String formTitle;
    private UUID formVersionId;
    private LocalDateTime submittedAt;

    /** Payload bruto da resposta (valores de texto, escolhas, etc.) */
    private JsonNode payload;

    /** Arquivos resolvidos — associa cada arquivo à questão de origem */
    private List<FileEntry> files;

    public record FileEntry(
        UUID fileId,
        String questionId,
        String questionLabel,
        String originalName,
        String mimeType,
        Long sizeBytes
    ) {}
}
