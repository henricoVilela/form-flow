package com.cronos.formflow_api.domain.response;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.api.dto.request.SubmitResponseRequest;
import com.cronos.formflow_api.api.dto.response.ResponseDetailResponse;
import com.cronos.formflow_api.api.dto.response.ResponseLookupResponse;
import com.cronos.formflow_api.api.dto.response.ResponseSummaryResponse;
import com.cronos.formflow_api.domain.form.Form;
import com.cronos.formflow_api.domain.form.FormRepository;
import com.cronos.formflow_api.domain.form.FormRespondent;
import com.cronos.formflow_api.domain.form.FormRespondentService;
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
import com.cronos.formflow_api.infrastructure.storage.StorageService;
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
    private final FormRespondentService respondentService;
    private final StorageService storageService;

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
    public ResponseDetailResponse submit(UUID formId, SubmitResponseRequest request, String respondentToken) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));

        if (form.getStatus() != FormStatus.PUBLISHED) {
            throw new BusinessException("FORM_NOT_PUBLISHED", "Este formulário não está disponível para respostas");
        }

        // Valida limite global de respostas do formulário
        if (form.getMaxResponses() != null) {
            long total = responseRepository.countByFormId(formId);
            if (total >= form.getMaxResponses()) {
                throw new BusinessException("FORM_RESPONSE_LIMIT_REACHED", "Este formulário atingiu o limite máximo de respostas");
            }
        }

        // Valida token de respondente se fornecido
        FormRespondent respondent = null;
        if (respondentToken != null && !respondentToken.isBlank()) {
            respondent = respondentService.validateToken(respondentToken);
            if (!respondent.getForm().getId().equals(formId)) {
                throw new BusinessException("TOKEN_INVALID", "Token não pertence a este formulário");
            }
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
                .respondent(respondent)
                .payload(payload)
                .metadata(request.getMetadata())
                .build();

        responseRepository.save(response);

        // Incrementa contador do respondente
        if (respondent != null) {
            respondentService.incrementResponseCount(respondent);
        }

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

    /**
     * Busca uma resposta pelo ID sem precisar informar o formId.
     * Retorna o payload com os arquivos resolvidos (nome original, tipo, tamanho e questão de origem).
     * Útil para correlacionar pastas de um export ZIP com os dados da resposta.
     */
    @Transactional(readOnly = true)
    public ResponseLookupResponse lookupById(User user, UUID responseId) {
        Response response = responseRepository.findById(responseId)
                .orElseThrow(() -> new ResourceNotFoundException("Resposta não encontrada"));

        if (!response.getForm().getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Resposta não encontrada");
        }

        List<Question> questions = questionRepository.findByFormVersionIdOrderByOrderIndex(
                response.getFormVersion().getId());

        List<ResponseLookupResponse.FileEntry> files = new ArrayList<>();
        for (Question q : questions) {
            if (!"file_upload".equals(q.getType())) continue;
            JsonNode answer = response.getPayload().path(q.getId().toString());
            if (answer.isMissingNode()) continue;
            answer.path("value").forEach(v -> {
                try {
                    UUID fileId = UUID.fromString(v.asString());
                    uploadedFileRepository.findById(fileId).ifPresent(file ->
                        files.add(new ResponseLookupResponse.FileEntry(
                            file.getId(),
                            q.getId().toString(),
                            q.getLabel(),
                            file.getOriginalName(),
                            file.getMimeType(),
                            file.getSizeBytes()
                        ))
                    );
                } catch (IllegalArgumentException ignored) {}
            });
        }

        return ResponseLookupResponse.builder()
                .id(response.getId())
                .formId(response.getForm().getId())
                .formTitle(response.getForm().getTitle())
                .formVersionId(response.getFormVersion().getId())
                .submittedAt(response.getSubmittedAt())
                .payload(response.getPayload())
                .files(files)
                .build();
    }

    /**
     * Exporta as respostas do formulário.
     * - Sem arquivos: retorna CSV direto.
     * - Com arquivos: retorna ZIP contendo o CSV + arquivos organizados por resposta.
     */
    public ExportResult exportResponses(User user, UUID formId) {
        validateFormOwnership(user, formId);

        List<Response> responses = responseRepository.findAllByFormIdForExport(formId);
        if (responses.isEmpty()) {
            return new ExportResult("Sem respostas".getBytes(StandardCharsets.UTF_8), false);
        }

        FormVersion latestVersion = formVersionRepository.findLatestByFormId(formId).orElseThrow();
        List<Question> questions = questionRepository.findByFormVersionIdOrderByOrderIndex(latestVersion.getId());

        List<UploadedFile> allFiles = uploadedFileRepository.findByFormIdAndStatus(formId, UploadStatus.CONFIRMED);

        // Mapa fileId → UploadedFile para exibir nomes originais no CSV
        Map<UUID, UploadedFile> fileById = allFiles.stream()
                .collect(Collectors.toMap(UploadedFile::getId, f -> f));

        // IDs das questões de arquivo para varrer os payloads
        Set<String> fileQuestionIds = questions.stream()
                .filter(q -> "file_upload".equals(q.getType()))
                .map(q -> q.getId().toString())
                .collect(Collectors.toSet());

        // Agrupa arquivos por responseId usando o payload (response_id pode estar nulo no uploaded_files)
        Map<UUID, List<UploadedFile>> filesByResponse = new java.util.HashMap<>();
        for (Response r : responses) {
            List<UploadedFile> responseFiles = new ArrayList<>();
            for (String questionId : fileQuestionIds) {
                JsonNode answer = r.getPayload().path(questionId);
                if (answer.isMissingNode()) continue;
                answer.path("value").forEach(v -> {
                    try {
                        UploadedFile file = fileById.get(UUID.fromString(v.asString()));
                        if (file != null) responseFiles.add(file);
                    } catch (IllegalArgumentException ignored) {}
                });
            }
            if (!responseFiles.isEmpty()) {
                filesByResponse.put(r.getId(), responseFiles);
            }
        }

        String csv = buildCsv(responses, questions, fileById);

        if (filesByResponse.isEmpty()) {
            return new ExportResult(csv.getBytes(StandardCharsets.UTF_8), false);
        }

        return new ExportResult(buildZip(csv, filesByResponse), true);
    }

    private String buildCsv(List<Response> responses, List<Question> questions, Map<UUID, UploadedFile> fileById) {
        StringBuilder csv = new StringBuilder();

        csv.append("ID,Submetido em");
        questions.forEach(q -> csv.append(",\"").append(q.getLabel().replace("\"", "\"\"")).append("\""));
        csv.append("\n");

        for (Response r : responses) {
            csv.append(r.getId()).append(",").append(r.getSubmittedAt());
            for (Question q : questions) {
                JsonNode answer = r.getPayload().path(q.getId().toString());
                String value = extractAnswerValue(answer, q.getType(), fileById);
                csv.append(",\"").append(value.replace("\"", "\"\"")).append("\"");
            }
            csv.append("\n");
        }

        return csv.toString();
    }

    private byte[] buildZip(String csv, Map<UUID, List<UploadedFile>> filesByResponse) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zip = new ZipOutputStream(baos)) {

            zip.putNextEntry(new ZipEntry("respostas.csv"));
            zip.write(csv.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();

            for (Map.Entry<UUID, List<UploadedFile>> entry : filesByResponse.entrySet()) {
                UUID responseId = entry.getKey();
                List<UploadedFile> files = entry.getValue();
                Set<String> usedNames = new HashSet<>();

                for (UploadedFile file : files) {
                    String fileName = resolveUniqueName(usedNames, file.getOriginalName());
                    zip.putNextEntry(new ZipEntry("arquivos/" + responseId + "/" + fileName));
                    try (InputStream is = storageService.downloadFile(file)) {
                        is.transferTo(zip);
                    } catch (Exception e) {
                        log.warn("Falha ao incluir arquivo {} no ZIP: {}", file.getId(), e.getMessage());
                    }
                    zip.closeEntry();
                }
            }

            zip.finish();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new BusinessException("EXPORT_ERROR", "Erro ao gerar arquivo de exportação");
        }
    }

    private String resolveUniqueName(Set<String> usedNames, String originalName) {
        if (usedNames.add(originalName)) return originalName;

        int dotIndex = originalName.lastIndexOf('.');
        String base = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
        String ext  = dotIndex > 0 ? originalName.substring(dotIndex) : "";

        int counter = 2;
        String candidate;
        do {
            candidate = base + " (" + counter++ + ")" + ext;
        } while (!usedNames.add(candidate));

        return candidate;
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
            case "number", "rating" ->
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
            case "matrix" -> {
                if (!value.isNull() && value.isObject()) {
                    builder.valueText(value.toString());
                }
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

    private String extractAnswerValue(JsonNode answer, String questionType, Map<UUID, UploadedFile> fileById) {
        if (answer == null || answer.isMissingNode()) return "";
        JsonNode value = answer.path("value");

        if ("file_upload".equals(questionType) && value.isArray()) {
            List<String> names = new ArrayList<>();
            value.forEach(v -> {
                try {
                    UploadedFile file = fileById.get(UUID.fromString(v.asString()));
                    names.add(file != null ? file.getOriginalName() : v.asString());
                } catch (IllegalArgumentException e) {
                    names.add(v.asString());
                }
            });
            return String.join(", ", names);
        }

        if (value.isArray()) {
            List<String> parts = new ArrayList<>();
            value.forEach(v -> parts.add(v.asString()));
            return String.join(", ", parts);
        }
        if (value.isObject()) {
            return value.toString();
        }
        return value.asString("");
    }
}
