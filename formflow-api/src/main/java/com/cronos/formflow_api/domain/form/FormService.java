package com.cronos.formflow_api.domain.form;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.api.dto.request.CreateFormRequest;
import com.cronos.formflow_api.api.dto.request.UpdateFormRequest;
import com.cronos.formflow_api.api.dto.response.FormResponse;
import com.cronos.formflow_api.api.dto.response.FormVersionResponse;
import com.cronos.formflow_api.api.dto.response.PublicFormResponse;
import com.cronos.formflow_api.api.dto.response.PublishResponse;
import com.cronos.formflow_api.domain.user.User;
import com.cronos.formflow_api.shared.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.JsonNode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FormService {

    private final FormRepository formRepository;
    private final FormVersionRepository formVersionRepository;
    private final QuestionRepository questionRepository;

    @Transactional
    public FormResponse create(User user, CreateFormRequest request) {
        Form form = Form.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .layout(request.getLayout() != null ? request.getLayout() : FormLayout.MULTI_STEP)
                .build();
        return FormResponse.from(formRepository.save(form), null);
    }

    public Page<FormResponse> listByUser(User user, Pageable pageable) {
        return formRepository
                .findByUserIdAndStatusNot(user.getId(), FormStatus.ARCHIVED, pageable)
                .map(form -> {
                    FormVersion latest = formVersionRepository.findLatestByFormId(form.getId()).orElse(null);
                    return FormResponse.from(form, latest);
                });
    }

    public FormResponse getById(User user, UUID id) {
        Form form = findFormOwnedBy(user, id);
        FormVersion latest = formVersionRepository.findLatestByFormId(id).orElse(null);
        return FormResponse.from(form, latest);
    }

    @Transactional
    public FormResponse update(User user, UUID id, UpdateFormRequest request) {
        Form form = findFormOwnedBy(user, id);
        form.setTitle(request.getTitle());
        if (request.getDescription() != null) form.setDescription(request.getDescription());
        if (request.getLayout() != null) form.setLayout(request.getLayout());
        return FormResponse.from(formRepository.save(form), null);
    }

    @Transactional
    public PublishResponse publish(User user, UUID id, JsonNode schema) {
        Form form = findFormOwnedBy(user, id);

        int nextVersion = formVersionRepository.findMaxVersionByFormId(id).orElse(0) + 1;

        FormVersion version = FormVersion.builder()
                .form(form)
                .version(nextVersion)
                .schema(schema)
                .build();

        formVersionRepository.save(version);

        // Extrai questões do schema para a tabela questions
        extractAndSaveQuestions(version, form, schema);

        form.setStatus(FormStatus.PUBLISHED);
        form.setPublishedAt(LocalDateTime.now());
        formRepository.save(form);

        return PublishResponse.builder()
                .formId(form.getId())
                .version(nextVersion)
                .publishedAt(form.getPublishedAt())
                .build();
    }

    @Transactional
    public void archive(User user, UUID id) {
        Form form = findFormOwnedBy(user, id);
        form.setStatus(FormStatus.ARCHIVED);
        formRepository.save(form);
    }

    public List<FormVersionResponse> listVersions(User user, UUID id) {
        findFormOwnedBy(user, id);
        return formVersionRepository.findByFormIdOrderByVersionDesc(id)
                .stream()
                .map(FormVersionResponse::from)
                .collect(Collectors.toList());
    }

    public FormVersionResponse getVersion(User user, UUID id, Integer version) {
        findFormOwnedBy(user, id);
        FormVersion fv = formVersionRepository.findByFormIdAndVersion(id, version)
                .orElseThrow(() -> new ResourceNotFoundException("Versão não encontrada"));
        return FormVersionResponse.from(fv);
    }

    // --- helpers ---

    private Form findFormOwnedBy(User user, UUID id) {
        return formRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));
    }

    private void extractAndSaveQuestions(FormVersion version, Form form, JsonNode schema) {
        JsonNode sections = schema.path("sections");
        if (!sections.isArray()) return;

        for (JsonNode section : sections) {
            String sectionId = section.path("id").asText();
            JsonNode questions = section.path("questions");
            if (!questions.isArray()) continue;

            int order = 0;
            for (JsonNode q : questions) {
                String questionId = q.path("id").asText();
                if (questionId.isBlank()) continue;

                Question question = Question.builder()
                        .id(UUID.fromString(questionId))
                        .formVersion(version)
                        .form(form)
                        .sectionId(sectionId)
                        .type(q.path("type").asText())
                        .label(q.path("label").asText())
                        .orderIndex(order++)
                        .build();

                questionRepository.save(question);
            }
        }
    }
    
    /**
     * Retorna os dados públicos de um formulário publicado.
     * Usado pelo endpoint público (sem autenticação).
     *
     * @param formId UUID do formulário
     * @return dados públicos com schema da última versão
     * @throws ResourceNotFoundException se não existir ou não estiver publicado
     */
    public PublicFormResponse getPublicForm(UUID formId) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));

        if (form.getStatus() != FormStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Formulário não está disponível");
        }

        FormVersion latestVersion = formVersionRepository.findLatestByFormId(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Nenhuma versão publicada encontrada"));

        return PublicFormResponse.from(form, latestVersion);
    }
}
