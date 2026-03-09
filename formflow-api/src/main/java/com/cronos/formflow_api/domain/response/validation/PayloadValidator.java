package com.cronos.formflow_api.domain.response.validation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

import org.springframework.stereotype.Component;

import com.cronos.formflow_api.shared.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

/**
 * Valida o payload de resposta contra o schema do formulário.
 *
 * Executa validações em 3 camadas para cada questão VISÍVEL:
 *
 * Questões ocultas por condição são IGNORADAS (recebe visibleQuestionIds).
 * Questões do tipo "statement" são IGNORADAS (sem resposta).
 *
 * Retorna erro 422 com lista estruturada de campos inválidos.
 */
@Component
@Slf4j
public class PayloadValidator {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"
    );

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "^[+]?[0-9\\s\\-().]{7,20}$"
    );

    private static final Pattern URL_PATTERN = Pattern.compile(
            "^https?://[\\w\\-]+(\\.[\\w\\-]+)+([\\w.,@?^=%&:/~+#\\-]*[\\w@?^=%&/~+#\\-])?$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern UUID_PATTERN = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    );

    /**
     * Valida todo o payload contra o schema, considerando apenas questões visíveis.
     *
     * @param schema             schema completo (sections → questions)
     * @param payload            payload do respondente
     * @param visibleQuestionIds IDs das questões visíveis (do ConditionEvaluator)
     * @throws BusinessException com código PAYLOAD_VALIDATION_ERROR e lista de erros
     */
    public void validate(JsonNode schema, JsonNode payload, Set<String> visibleQuestionIds) {
        List<FieldError> errors = new ArrayList<>();

        JsonNode sections = schema.path("sections");
        if (!sections.isArray()) return;

        for (JsonNode section : sections) {
            JsonNode questions = section.path("questions");
            if (!questions.isArray()) continue;

            for (JsonNode questionDef : questions) {
                String qId = questionDef.path("id").asText("");
                String type = questionDef.path("type").asText("");
                String label = questionDef.path("label").asText("Campo");
                boolean required = questionDef.path("required").asBoolean(false);

                // Ignora questões ocultas ou statement
                if (!visibleQuestionIds.contains(qId)) continue;
                if ("statement".equals(type)) continue;

                // Extrai resposta do payload
                JsonNode answerNode = payload.path(qId);
                JsonNode value = answerNode.isMissingNode() || answerNode.isNull()
                        ? null
                        : answerNode.path("value");

                boolean isEmpty = isValueEmpty(value);

                // 1. Obrigatoriedade
                if (required && isEmpty) {
                    errors.add(FieldError.builder()
                            .questionId(qId).field(label).code("REQUIRED")
                            .message("Campo obrigatório").build());
                    continue; // sem valor, não faz as demais validações
                }

                // Se não é obrigatório e está vazio, pula validações
                if (isEmpty) continue;

                // 2. Validação de tipo
                validateType(type, value, questionDef, qId, label, errors);

                // 3. Validações customizadas (bloco "validations")
                JsonNode validations = questionDef.path("validations");
                if (!validations.isMissingNode() && !validations.isNull()) {
                    validateCustomRules(type, value, validations, qId, label, errors);
                }
            }
        }

        if (!errors.isEmpty()) {
            throw new PayloadValidationException(errors);
        }
    }

    // =================================================================
    // 2. Validação por tipo
    // =================================================================
    private void validateType(
            String type, JsonNode value, JsonNode questionDef,
            String qId, String label, List<FieldError> errors
    ) {
        switch (type) {
            case "short_text", "long_text" -> validateText(value, qId, label, errors);
            case "email" -> validateEmail(value, qId, label, errors);
            case "phone" -> validatePhone(value, qId, label, errors);
            case "url" -> validateUrl(value, qId, label, errors);
            case "number" -> validateNumber(value, qId, label, errors);
            case "date" -> validateDate(value, qId, label, errors);
            case "single_choice", "dropdown" -> validateSingleChoice(value, questionDef, qId, label, errors);
            case "multi_choice" -> validateMultiChoice(value, questionDef, qId, label, errors);
            case "file_upload" -> validateFileUpload(value, qId, label, errors);
            case "matrix" -> validateMatrix(value, questionDef, qId, label, errors);
            case "rating" -> validateRating(value, questionDef, qId, label, errors);
            case "scale" -> validateScale(value, questionDef, qId, label, errors);
            default -> log.warn("Tipo de questão desconhecido: {} (questionId={})", type, qId);
        }
    }

    private void validateText(JsonNode value, String qId, String label, List<FieldError> errors) {
        if (!value.isTextual()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE", "Valor deve ser texto"));
        }
    }

    private void validateEmail(JsonNode value, String qId, String label, List<FieldError> errors) {
        if (!value.isTextual()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE", "Valor deve ser texto"));
            return;
        }
        String text = value.asText("").trim();
        if (!EMAIL_PATTERN.matcher(text).matches()) {
            errors.add(fieldError(qId, label, "INVALID_EMAIL", "Formato de e-mail inválido"));
        }
    }

    private void validatePhone(JsonNode value, String qId, String label, List<FieldError> errors) {
        if (!value.isTextual()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE", "Valor deve ser texto"));
            return;
        }
        String text = value.asText("").trim();
        if (!PHONE_PATTERN.matcher(text).matches()) {
            errors.add(fieldError(qId, label, "INVALID_PHONE", "Formato de telefone inválido"));
        }
    }

    private void validateUrl(JsonNode value, String qId, String label, List<FieldError> errors) {
        if (!value.isTextual()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE", "Valor deve ser texto"));
            return;
        }
        String text = value.asText("").trim();
        if (!URL_PATTERN.matcher(text).matches()) {
            errors.add(fieldError(qId, label, "INVALID_URL", "Formato de URL inválido. Use http:// ou https://"));
        }
    }

    private void validateNumber(JsonNode value, String qId, String label, List<FieldError> errors) {
        if (value.isNumber()) return; // OK

        if (value.isTextual()) {
            try {
                new BigDecimal(value.asText());
                return; // texto numérico, OK
            } catch (NumberFormatException ignored) {}
        }

        errors.add(fieldError(qId, label, "INVALID_NUMBER", "Valor deve ser numérico"));
    }

    private void validateDate(JsonNode value, String qId, String label, List<FieldError> errors) {
        if (!value.isTextual()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE", "Data deve ser texto no formato yyyy-MM-dd"));
            return;
        }
        try {
            LocalDate.parse(value.asText());
        } catch (DateTimeParseException e) {
            errors.add(fieldError(qId, label, "INVALID_DATE", "Formato de data inválido. Use yyyy-MM-dd"));
        }
    }

    private void validateSingleChoice(
            JsonNode value, JsonNode questionDef,
            String qId, String label, List<FieldError> errors
    ) {
        if (!value.isTextual()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE", "Valor deve ser texto (ID da opção)"));
            return;
        }

        Set<String> validOptions = extractOptionValues(questionDef);
        if (!validOptions.isEmpty() && !validOptions.contains(value.asText())) {
            errors.add(fieldError(qId, label, "INVALID_OPTION",
                    "Opção selecionada não é válida: " + value.asText()));
        }
    }

    private void validateMultiChoice(
            JsonNode value, JsonNode questionDef,
            String qId, String label, List<FieldError> errors
    ) {
        if (!value.isArray()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE", "Valor deve ser um array de opções"));
            return;
        }

        Set<String> validOptions = extractOptionValues(questionDef);
        if (validOptions.isEmpty()) return;

        for (JsonNode item : value) {
            String optionValue = item.asText("");
            if (!validOptions.contains(optionValue)) {
                errors.add(fieldError(qId, label, "INVALID_OPTION",
                        "Opção selecionada não é válida: " + optionValue));
            }
        }
    }

    private void validateFileUpload(JsonNode value, String qId, String label, List<FieldError> errors) {
        if (!value.isArray()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE", "Valor deve ser um array de IDs de arquivo"));
            return;
        }

        for (JsonNode item : value) {
            String fileId = item.asText("");
            if (!UUID_PATTERN.matcher(fileId).matches()) {
                errors.add(fieldError(qId, label, "INVALID_FILE_ID",
                        "ID de arquivo inválido: " + fileId));
            }
        }
    }

    private void validateMatrix(
            JsonNode value, JsonNode questionDef,
            String qId, String label, List<FieldError> errors
    ) {
        if (!value.isObject()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE",
                    "Valor da matriz deve ser um objeto (rowId → columnId)"));
            return;
        }

        // Extrai IDs válidos de rows e columns
        JsonNode matrixConfig = questionDef.path("matrixConfig");
        Set<String> validRowIds = new HashSet<>();
        Set<String> validColIds = new HashSet<>();

        JsonNode rows = matrixConfig.path("rows");
        if (rows.isArray()) {
            rows.forEach(r -> validRowIds.add(r.path("id").asText("")));
        }
        JsonNode columns = matrixConfig.path("columns");
        if (columns.isArray()) {
            columns.forEach(c -> validColIds.add(c.path("id").asText("")));
        }

        // Valida cada entrada
        value.properties().forEach(entry -> {
            String rowId = entry.getKey();
            String colId = entry.getValue().asText("");

            if (!validRowIds.isEmpty() && !validRowIds.contains(rowId)) {
                errors.add(fieldError(qId, label, "INVALID_MATRIX_ROW",
                        "Linha inválida na matriz: " + rowId));
            }
            if (!validColIds.isEmpty() && !validColIds.contains(colId)) {
                errors.add(fieldError(qId, label, "INVALID_MATRIX_COLUMN",
                        "Coluna inválida na matriz (linha " + rowId + "): " + colId));
            }
        });

        // Verifica se todas as rows obrigatórias foram respondidas
        boolean matrixRequired = questionDef.path("required").asBoolean(false);
        if (matrixRequired && !validRowIds.isEmpty()) {
            for (String rowId : validRowIds) {
                if (!value.has(rowId)) {
                    errors.add(fieldError(qId, label, "MATRIX_ROW_MISSING",
                            "Linha da matriz não respondida: " + rowId));
                }
            }
        }
    }

    private void validateRating(
            JsonNode value, JsonNode questionDef,
            String qId, String label, List<FieldError> errors
    ) {
        if (!value.isNumber() && !value.isTextual()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE", "Avaliação deve ser um número"));
            return;
        }

        try {
            int rating = value.isNumber() ? value.asInt() : Integer.parseInt(value.asText());
            int max = questionDef.path("ratingConfig").path("max").asInt(5);

            if (rating < 1 || rating > max) {
                errors.add(fieldError(qId, label, "OUT_OF_RANGE",
                        String.format("Avaliação deve ser entre 1 e %d", max)));
            }
        } catch (NumberFormatException e) {
            errors.add(fieldError(qId, label, "INVALID_NUMBER", "Avaliação deve ser um número inteiro"));
        }
    }

    private void validateScale(
            JsonNode value, JsonNode questionDef,
            String qId, String label, List<FieldError> errors
    ) {
        if (!value.isNumber() && !value.isTextual()) {
            errors.add(fieldError(qId, label, "INVALID_TYPE", "Escala deve ser um número"));
            return;
        }

        try {
            int scaleValue = value.isNumber() ? value.asInt() : Integer.parseInt(value.asText());
            JsonNode scaleConfig = questionDef.path("scaleConfig");
            int min = scaleConfig.path("min").asInt(1);
            int max = scaleConfig.path("max").asInt(10);

            if (scaleValue < min || scaleValue > max) {
                errors.add(fieldError(qId, label, "OUT_OF_RANGE",
                        String.format("Valor deve ser entre %d e %d", min, max)));
            }
        } catch (NumberFormatException e) {
            errors.add(fieldError(qId, label, "INVALID_NUMBER", "Escala deve ser um número inteiro"));
        }
    }

    // =================================================================
    // 3. Validações customizadas (bloco "validations" do schema)
    // =================================================================
    private void validateCustomRules(
            String type, JsonNode value, JsonNode validations,
            String qId, String label, List<FieldError> errors
    ) {
        if (value.isTextual()) {
            String text = value.asText("");

            if (validations.has("minLength")) {
                int minLength = validations.path("minLength").asInt(0);
                if (text.length() < minLength) {
                    errors.add(fieldError(qId, label, "TOO_SHORT",
                            String.format("Mínimo de %d caracteres (atual: %d)", minLength, text.length())));
                }
            }

            if (validations.has("maxLength")) {
                int maxLength = validations.path("maxLength").asInt(Integer.MAX_VALUE);
                if (text.length() > maxLength) {
                    errors.add(fieldError(qId, label, "TOO_LONG",
                            String.format("Máximo de %d caracteres (atual: %d)", maxLength, text.length())));
                }
            }

            // ── pattern (regex customizado) ──
            if (validations.has("pattern")) {
                String pattern = validations.path("pattern").asText("");
                if (!pattern.isBlank()) {
                    try {
                        if (!Pattern.matches(pattern, text)) {
                            String patternMessage = validations.path("patternMessage")
                                    .asText("Valor não corresponde ao formato esperado");
                            errors.add(fieldError(qId, label, "PATTERN_MISMATCH", patternMessage));
                        }
                    } catch (PatternSyntaxException e) {
                        log.warn("Regex inválido no schema: questionId={}, pattern={}", qId, pattern);
                    }
                }
            }
        }

        if ("number".equals(type) || "rating".equals(type) || "scale".equals(type)) {
            BigDecimal numValue = extractNumber(value);
            if (numValue != null) {
                if (validations.has("min")) {
                    BigDecimal min = new BigDecimal(validations.path("min").asText("0"));
                    if (numValue.compareTo(min) < 0) {
                        errors.add(fieldError(qId, label, "BELOW_MIN",
                                String.format("Valor mínimo é %s", min.toPlainString())));
                    }
                }

                if (validations.has("max")) {
                    BigDecimal max = new BigDecimal(validations.path("max").asText("999999999"));
                    if (numValue.compareTo(max) > 0) {
                        errors.add(fieldError(qId, label, "ABOVE_MAX",
                                String.format("Valor máximo é %s", max.toPlainString())));
                    }
                }
            }
        }

        if ("date".equals(type) && value.isTextual()) {
            try {
                LocalDate dateValue = LocalDate.parse(value.asText());

                if (validations.has("min")) {
                    LocalDate minDate = LocalDate.parse(validations.path("min").asText());
                    if (dateValue.isBefore(minDate)) {
                        errors.add(fieldError(qId, label, "DATE_BEFORE_MIN",
                                "Data não pode ser anterior a " + minDate));
                    }
                }

                if (validations.has("max")) {
                    LocalDate maxDate = LocalDate.parse(validations.path("max").asText());
                    if (dateValue.isAfter(maxDate)) {
                        errors.add(fieldError(qId, label, "DATE_AFTER_MAX",
                                "Data não pode ser posterior a " + maxDate));
                    }
                }
            } catch (DateTimeParseException ignored) {
                // Já reportado na validação de tipo
            }
        }

        if ("multi_choice".equals(type) && value.isArray()) {
            int count = value.size();

            if (validations.has("minSelections")) {
                int minSel = validations.path("minSelections").asInt(0);
                if (count < minSel) {
                    errors.add(fieldError(qId, label, "TOO_FEW_SELECTIONS",
                            String.format("Selecione no mínimo %d opções (selecionadas: %d)", minSel, count)));
                }
            }

            if (validations.has("maxSelections")) {
                int maxSel = validations.path("maxSelections").asInt(Integer.MAX_VALUE);
                if (count > maxSel) {
                    errors.add(fieldError(qId, label, "TOO_MANY_SELECTIONS",
                            String.format("Selecione no máximo %d opções (selecionadas: %d)", maxSel, count)));
                }
            }
        }

        if ("file_upload".equals(type) && value.isArray()) {
            if (validations.has("maxFiles")) {
                int maxFiles = validations.path("maxFiles").asInt(Integer.MAX_VALUE);
                if (value.size() > maxFiles) {
                    errors.add(fieldError(qId, label, "TOO_MANY_FILES",
                            String.format("Máximo de %d arquivos (enviados: %d)", maxFiles, value.size())));
                }
            }
        }
    }

    // =================================================================
    // Utilitários
    // =================================================================

    /**
     * Extrai todos os "value" das options de uma questão de choice.
     */
    private Set<String> extractOptionValues(JsonNode questionDef) {
        Set<String> values = new HashSet<>();
        JsonNode options = questionDef.path("options");
        if (options.isArray()) {
            for (JsonNode opt : options) {
                String v = opt.path("value").asText("");
                if (!v.isBlank()) values.add(v);
            }
        }
        return values;
    }

    private BigDecimal extractNumber(JsonNode value) {
        try {
            if (value.isNumber()) return value.decimalValue();
            if (value.isTextual()) return new BigDecimal(value.asText());
        } catch (NumberFormatException ignored) {}
        return null;
    }

    private boolean isValueEmpty(JsonNode value) {
        if (value == null || value.isMissingNode() || value.isNull()) return true;
        if (value.isTextual()) return value.asText("").isBlank();
        if (value.isArray()) return value.isEmpty();
        return false;
    }

    private FieldError fieldError(String qId, String label, String code, String message) {
        return FieldError.builder()
                .questionId(qId)
                .field(label)
                .code(code)
                .message(message)
                .build();
    }

    // =================================================================
    // DTOs de erro
    // =================================================================

    /**
     * Erro de validação de um campo específico.
     */
    @Data
    @Builder
    public static class FieldError {
        private String questionId;
        private String field;
        private String code;
        private String message;
    }

    /**
     * Exception específica de validação de payload.
     * Carrega a lista estruturada de erros para retorno ao frontend.
     */
    public static class PayloadValidationException extends BusinessException {
        private static final long serialVersionUID = 1L;
        private final List<FieldError> fieldErrors;

        public PayloadValidationException(List<FieldError> fieldErrors) {
            super("PAYLOAD_VALIDATION_ERROR", buildMessage(fieldErrors));
            this.fieldErrors = fieldErrors;
        }

        public List<FieldError> getFieldErrors() {
            return fieldErrors;
        }

        private static String buildMessage(List<FieldError> errors) {
            if (errors.size() == 1) {
                FieldError e = errors.get(0);
                return e.getField() + ": " + e.getMessage();
            }
            return errors.size() + " campos com erro de validação";
        }
    }
}
