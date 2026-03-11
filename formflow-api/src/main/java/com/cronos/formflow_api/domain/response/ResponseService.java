package com.cronos.formflow_api.domain.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.api.dto.request.SubmitResponseRequest;
import com.cronos.formflow_api.api.dto.response.ResponseDetailResponse;
import com.cronos.formflow_api.api.dto.response.ResponseSummaryResponse;
import com.cronos.formflow_api.domain.form.Form;
import com.cronos.formflow_api.domain.form.FormRepository;
import com.cronos.formflow_api.domain.form.FormStatus;
import com.cronos.formflow_api.domain.form.FormVersion;
import com.cronos.formflow_api.domain.form.FormVersionRepository;
import com.cronos.formflow_api.domain.form.Question;
import com.cronos.formflow_api.domain.form.QuestionRepository;
import com.cronos.formflow_api.domain.form.validation.ConditionEvaluator;
import com.cronos.formflow_api.domain.notfication.EmailNotification;
import com.cronos.formflow_api.domain.notfication.EmailNotificationRepository;
import com.cronos.formflow_api.domain.response.validation.PayloadValidator;
import com.cronos.formflow_api.domain.user.User;
import com.cronos.formflow_api.shared.exception.BusinessException;
import com.cronos.formflow_api.shared.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResponseService {

    private final ResponseRepository responseRepository;
    private final FormRepository formRepository;
    private final FormVersionRepository formVersionRepository;
    private final QuestionRepository questionRepository;
    private final ResponseAnswerRepository responseAnswerRepository;
    private final UploadedFileRepository uploadedFileRepository;
    private final EmailNotificationRepository emailNotificationRepository;
    private final ConditionEvaluator conditionEvaluator;
    private final PayloadValidator payloadValidator;

    /**
     * Submete uma resposta ao formulário.
     *
     * Fluxo completo:
     * 1. Verifica se form existe e está PUBLISHED
     * 2. Verifica se formVersion pertence ao form
     * 3. Avalia condições → determina questões VISÍVEIS
     * 4. Valida payload completo via PayloadValidator:
     *    - Required (apenas questões visíveis)
     *    - Tipo (number, email, phone, url, date, choices, files, matrix, rating, scale)
     *    - Validações customizadas (minLength, maxLength, min, max, pattern, minSelections, etc.)
     * 5. Persiste Response + ResponseAnswers (apenas questões visíveis)
     * 6. Confirma arquivos referenciados (PENDING → CONFIRMED)
     * 7. Agenda notificação por e-mail
     */
    @Transactional
    public ResponseDetailResponse submit(UUID formId, SubmitResponseRequest request) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));

        if (form.getStatus() != FormStatus.PUBLISHED) {
            throw new BusinessException("FORM_NOT_PUBLISHED", "Este formulário não está disponível para respostas");
        }

        FormVersion formVersion = formVersionRepository.findById(request.getFormVersionId())
                .orElseThrow(() -> new ResourceNotFoundException("Versão do formulário não encontrada"));

        if (!formVersion.getForm().getId().equals(formId)) {
            throw new BusinessException("VERSION_MISMATCH", "Versão não pertence a este formulário");
        }

        JsonNode schema = formVersion.getSchema();
        JsonNode payload = request.getPayload();

        // Avalia quais questões estão visíveis com base nas condições + payload
        Set<String> visibleQuestionIds = conditionEvaluator.evaluateVisibleQuestions(schema, payload);

        payloadValidator.validate(schema, payload, visibleQuestionIds);

        Response response = Response.builder()
                .form(form)
                .formVersion(formVersion)
                .payload(payload)
                .metadata(request.getMetadata())
                .build();

        responseRepository.save(response);

        // Persiste respostas individuais (apenas questões visíveis)
        saveAnswers(response, form, payload, formVersion, visibleQuestionIds);

        // Confirma arquivos referenciados
        confirmFiles(response, payload);

        // Agenda notificação por email
        scheduleEmailNotification(response, form.getUser().getEmail());

        return ResponseDetailResponse.from(response);
    }

    public Page<ResponseSummaryResponse> list(User user, UUID formId, Pageable pageable) {
        validateFormOwnership(user, formId);
        return responseRepository.findByFormId(formId, pageable)
                .map(ResponseSummaryResponse::from);
    }

    public ResponseDetailResponse getById(User user, UUID formId, UUID responseId) {
        validateFormOwnership(user, formId);
        Response response = responseRepository.findByIdAndFormId(responseId, formId)
                .orElseThrow(() -> new ResourceNotFoundException("Resposta não encontrada"));
        return ResponseDetailResponse.from(response);
    }

    public byte[] exportCsv(User user, UUID formId) {
        validateFormOwnership(user, formId);

        List<Response> responses = responseRepository.findAllByFormIdForExport(formId);
        if (responses.isEmpty()) return "Sem respostas".getBytes();

        FormVersion latestVersion = formVersionRepository.findLatestByFormId(formId).orElseThrow();
        List<Question> questions = questionRepository.findByFormVersionIdOrderByOrderIndex(latestVersion.getId());

        StringBuilder csv = new StringBuilder();

        csv.append("ID,Submetido em");
        questions.forEach(q -> csv.append(",\"").append(q.getLabel().replace("\"", "\"\"")).append("\""));
        csv.append("\n");

        for (Response r : responses) {
            csv.append(r.getId()).append(",").append(r.getSubmittedAt());
            for (Question q : questions) {
                JsonNode answer = r.getPayload().path(q.getId().toString());
                String value = extractAnswerValue(answer);
                csv.append(",\"").append(value.replace("\"", "\"\"")).append("\"");
            }
            csv.append("\n");
        }

        return csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private void saveAnswers(
            Response response,
            Form form,
            JsonNode payload,
            FormVersion formVersion,
            Set<String> visibleQuestionIds
    ) {
        List<Question> questions = questionRepository.findByFormVersionIdOrderByOrderIndex(formVersion.getId());
        Map<UUID, Question> questionMap = questions.stream()
                .collect(Collectors.toMap(Question::getId, q -> q));

        payload.properties().forEach(entry -> {
            try {
                UUID questionId = UUID.fromString(entry.getKey());
                Question question = questionMap.get(questionId);
                if (question == null) return;

                // Ignora respostas de questões ocultas
                if (!visibleQuestionIds.contains(entry.getKey())) {
                    log.debug("Ignorando resposta de questão oculta: {}", entry.getKey());
                    return;
                }

                JsonNode answerNode = entry.getValue();
                ResponseAnswer answer = buildAnswer(response, form, question, answerNode);
                responseAnswerRepository.save(answer);
            } catch (IllegalArgumentException ignored) {}
        });
    }

    private ResponseAnswer buildAnswer(Response response, Form form, Question question, JsonNode answerNode) {
        ResponseAnswer.ResponseAnswerBuilder builder = ResponseAnswer.builder()
            .response(response)
            .form(form)
            .question(question)
            .questionType(question.getType());

        String type = question.getType();
        JsonNode value = answerNode.path("value");

        switch (type) {
            case "short_text", "long_text", "email", "phone", "url" ->
                    builder.valueText(value.asString(null));
            case "number" ->
                    builder.valueNumber(value.isNull() ? null : new BigDecimal(value.asString()));
            case "date" ->
                    builder.valueDate(value.isNull() ? null : LocalDate.parse(value.asString()));
            case "single_choice", "dropdown" ->
                    builder.valueOptions(new String[]{value.asString()});
            case "multi_choice" -> {
                List<String> opts = new ArrayList<>();
                value.forEach(v -> opts.add(v.asString()));
                builder.valueOptions(opts.toArray(new String[0]));
            }
            case "file_upload" -> {
                List<String> files = new ArrayList<>();
                value.forEach(v -> files.add(v.asString()));
                builder.valueFiles(files.toArray(new String[0]));
            }
        }

        return builder.build();
    }

    private void confirmFiles(Response response, JsonNode payload) {
        payload.properties().forEach(entry -> {
            JsonNode answerNode = entry.getValue();
            if ("file_upload".equals(answerNode.path("type").asString())) {
                answerNode.path("value").forEach(fileIdNode -> {
                    try {
                        UUID fileId = UUID.fromString(fileIdNode.asString());
                        uploadedFileRepository.findByIdAndStatus(fileId, UploadStatus.PENDING)
                            .ifPresent(file -> {
                                file.setStatus(UploadStatus.CONFIRMED);
                                file.setResponse(response);
                                file.setConfirmedAt(java.time.LocalDateTime.now());
                                uploadedFileRepository.save(file);
                            });
                    } catch (IllegalArgumentException ignored) {}
                });
            }
        });
    }

    private void scheduleEmailNotification(Response response, String recipientEmail) {
        EmailNotification notification = EmailNotification.builder()
            .response(response)
            .recipient(recipientEmail)
            .build();

        emailNotificationRepository.save(notification);
    }

    private void validateFormOwnership(User user, UUID formId) {
        formRepository.findByIdAndUserId(formId, user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));
    }

    private String extractAnswerValue(JsonNode answer) {
        if (answer == null || answer.isMissingNode()) return "";
        JsonNode value = answer.path("value");
        if (value.isArray()) {
            List<String> parts = new ArrayList<>();
            value.forEach(v -> parts.add(v.asString()));
            return String.join(", ", parts);
        }
        return value.asString("");
    }
}
