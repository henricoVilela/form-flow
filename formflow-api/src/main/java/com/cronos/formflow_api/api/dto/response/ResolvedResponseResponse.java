package com.cronos.formflow_api.api.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;
import tools.jackson.databind.JsonNode;

@Data
@Builder
public class ResolvedResponseResponse {

    private UUID id;
    private UUID formId;
    private String formTitle;
    private UUID formVersionId;
    private Integer formVersion;
    private LocalDateTime submittedAt;
    private JsonNode metadata;
    private List<ResolvedAnswer> answers;

    @Data
    @Builder
    public static class ResolvedAnswer {
        private String questionId;
        private String questionLabel;
        private String questionType;
        /** Valor da resposta para todos os tipos exceto file_upload. */
        private JsonNode value;
        /** Arquivos resolvidos — presente apenas quando questionType = file_upload. */
        private List<ResolvedFile> files;
    }

    @Data
    @Builder
    public static class ResolvedFile {
        private UUID fileId;
        private String originalName;
        private String mimeType;
        private Long sizeBytes;
        /** URL pré-assinada para download direto. Null se o arquivo foi deletado. */
        private String downloadUrl;
        /** Tempo em segundos até a URL expirar. */
        private Integer downloadUrlExpiresIn;
    }
}
