package com.cronos.formflow_api.domain.form;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.security.crypto.password.PasswordEncoder;

import com.cronos.formflow_api.api.dto.request.CreateFormRequest;
import com.cronos.formflow_api.api.dto.request.UpdateFormRequest;
import com.cronos.formflow_api.api.dto.request.UpdateFormSettingsRequest;
import com.cronos.formflow_api.api.dto.response.DashboardStatsResponse;
import com.cronos.formflow_api.api.dto.response.FormResponse;
import com.cronos.formflow_api.api.dto.response.FormVersionResponse;
import com.cronos.formflow_api.api.dto.response.PublicFormResponse;
import com.cronos.formflow_api.api.dto.response.PublishResponse;
import com.cronos.formflow_api.domain.response.ResponseRepository;
import com.cronos.formflow_api.domain.form.validation.SchemaConditionValidator;
import com.cronos.formflow_api.domain.user.User;
import com.cronos.formflow_api.shared.exception.BusinessException;
import com.cronos.formflow_api.shared.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@Service
@RequiredArgsConstructor
@Slf4j
public class FormService {

    private final FormRepository formRepository;
    private final FormVersionRepository formVersionRepository;
    private final QuestionRepository questionRepository;
    private final SchemaConditionValidator schemaConditionValidator;
    private final PasswordEncoder passwordEncoder;
    private final FormRespondentService respondentService;
    private final ResponseRepository responseRepository;

    @Transactional
    public FormResponse create(User user, CreateFormRequest request) {
        Form form = Form.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .layout(request.getLayout() != null ? request.getLayout() : FormLayout.MULTI_STEP)
                .draftSchema(null)
                .build();
        return FormResponse.from(formRepository.save(form), null);
    }

    public DashboardStatsResponse getDashboardStats(User user) {
        java.time.LocalDateTime weekAgo = java.time.LocalDateTime.now().minusDays(7);
        long total = responseRepository.countByUserId(user.getId());
        long thisWeek = responseRepository.countByUserIdAndSubmittedAtAfter(user.getId(), weekAgo);
        return DashboardStatsResponse.builder()
                .totalResponses(total)
                .responsesThisWeek(thisWeek)
                .build();
    }

    public Page<FormResponse> listByUser(User user, Pageable pageable) {
        Page<Form> page = formRepository.findByUserIdAndStatusNot(user.getId(), FormStatus.ARCHIVED, pageable);

        List<UUID> formIds = page.getContent().stream().map(Form::getId).toList();
        Map<UUID, Long> countByFormId = responseRepository.countByFormIds(formIds).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (Long) row[1]
                ));

        return page.map(form -> {
            FormVersion latest = formVersionRepository.findLatestByFormId(form.getId()).orElse(null);
            return FormResponse.from(form, latest, countByFormId.getOrDefault(form.getId(), 0L));
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
        form.setDescription(request.getDescription());
        if (request.getLayout() != null) form.setLayout(request.getLayout());
        
        if (request.getSchema() != null && !form.getVersions().isEmpty()) {
        	
        	form.setDraftSchema(null);
        	
        	var lastVersion = form.getVersions().getLast();
        	lastVersion.setSchema(request.getSchema());
        	
        	formVersionRepository.save(lastVersion);
        } else if (form.getVersions().isEmpty()) {
        	form.setDraftSchema(request.getSchema());
        }
        
        return FormResponse.from(formRepository.save(form), null);
    }

    @Transactional
    public FormResponse updateSettings(User user, UUID id, UpdateFormSettingsRequest request) {
        Form form = findFormOwnedBy(user, id);

        form.setVisibility(request.getVisibility());

        String newSlug = request.getSlug() != null && !request.getSlug().isBlank()
                ? request.getSlug().trim().toLowerCase() : null;
        if (newSlug != null && formRepository.existsBySlugAndIdNot(newSlug, id)) {
            throw new BusinessException("SLUG_ALREADY_TAKEN", "O slug '" + newSlug + "' já está em uso por outro formulário.");
        }
        form.setSlug(newSlug);
        form.setMaxResponses(request.getMaxResponses() != null && request.getMaxResponses() > 0
                ? request.getMaxResponses() : null);
        form.setExpiresAt(request.getExpiresAt());
        form.setWelcomeMessage(request.getWelcomeMessage() != null && !request.getWelcomeMessage().isBlank()
                ? request.getWelcomeMessage() : null);
        form.setThankYouMessage(request.getThankYouMessage() != null && !request.getThankYouMessage().isBlank()
                ? request.getThankYouMessage() : null);

        if (request.getPassword() != null) {
            form.setPasswordHash(request.getPassword().isBlank()
                    ? null : passwordEncoder.encode(request.getPassword()));
        }

        FormVersion latest = formVersionRepository.findLatestByFormId(id).orElse(null);
        return FormResponse.from(formRepository.save(form), latest);
    }

    @Transactional
    public PublishResponse publish(User user, UUID id, JsonNode schema) {
        Form form = findFormOwnedBy(user, id);

        // Valida estrutura de condições antes de publicar
        schemaConditionValidator.validate(schema);

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

    public PublicFormResponse getPublicFormBySlug(String slug, String password, String respondentToken) {
        Form form = formRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));
        return buildPublicFormResponse(form, password, respondentToken);
    }

    public PublicFormResponse getPublicForm(UUID formId, String password, String respondentToken) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));
        return buildPublicFormResponse(form, password, respondentToken);
    }

    private PublicFormResponse buildPublicFormResponse(Form form, String password, String respondentToken) {
        if (form.getStatus() != FormStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Formulário não está disponível");
        }
        // Token de respondente tem precedência — bypassa verificação de senha
        if (respondentToken != null && !respondentToken.isBlank()) {
            respondentService.validateToken(respondentToken);
        } else if (form.getVisibility() == FormVisibility.PASSWORD_PROTECTED) {
            if (password == null || password.isBlank()) {
                throw new BusinessException("PASSWORD_REQUIRED", "Este formulário requer uma senha de acesso");
            }
            if (!passwordEncoder.matches(password, form.getPasswordHash())) {
                throw new BusinessException("WRONG_PASSWORD", "Senha incorreta");
            }
        }
        FormVersion latestVersion = formVersionRepository.findLatestByFormId(form.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Nenhuma versão publicada encontrada"));
        return PublicFormResponse.from(form, latestVersion);
    }

    /**
     * Duplica um formulário existente, criando uma cópia completa.
     *
     * O que é copiado:
     * - Título (com sufixo " (Cópia)")
     * - Descrição
     * - Layout (multi_step / single_page)
     * - Schema da última versão publicada (com novos UUIDs para sections e questions)
     *
     * O que NÃO é copiado:
     * - Respostas
     * - Arquivos uploadados
     * - Notificações
     * - Status (o clone sempre começa como DRAFT)
     * - publishedAt (null)
     * - Versões anteriores (só a última)
     *
     * O schema é deep-cloned com novos UUIDs para evitar conflito de IDs
     * na tabela questions quando o clone for publicado.
     *
     * @param user  usuário autenticado (dono do formulário original)
     * @param id    UUID do formulário a duplicar
     * @return FormResponse do novo formulário (DRAFT, sem versão publicada)
     */
    @Transactional
    public FormResponse duplicate(User user, UUID id) {
        Form original = findFormOwnedBy(user, id);

        // Cria o clone como DRAFT
        Form clone = Form.builder()
                .user(user)
                .title(original.getTitle() + " (Cópia)")
                .description(original.getDescription())
                .layout(original.getLayout())
                .status(FormStatus.DRAFT)
                .build();

        formRepository.save(clone);

        // Copia schema da última versão (se existir)
        FormVersion latestVersion = formVersionRepository.findLatestByFormId(id).orElse(null);
        FormVersion clonedVersion = null;

        if (latestVersion != null && latestVersion.getSchema() != null) {
            // Deep clone do schema com novos UUIDs
            JsonNode clonedSchema = regenerateSchemaIds(latestVersion.getSchema());

            clonedVersion = FormVersion.builder()
                    .form(clone)
                    .version(1)
                    .schema(clonedSchema)
                    .build();

            formVersionRepository.save(clonedVersion);

            log.info("Formulário duplicado: original={}, clone={}, versão clonada com novos IDs",
                    id, clone.getId());
        } else {
            log.info("Formulário duplicado: original={}, clone={}, sem schema (form vazio)",
                    id, clone.getId());
        }

        return FormResponse.from(clone, clonedVersion);
    }

    private Form findFormOwnedBy(User user, UUID id) {
        return formRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));
    }

    private void extractAndSaveQuestions(FormVersion version, Form form, JsonNode schema) {
        JsonNode sections = schema.path("sections");
        if (!sections.isArray()) return;

        for (JsonNode section : sections) {
            String sectionId = section.path("id").asString();
            JsonNode questions = section.path("questions");
            if (!questions.isArray()) continue;

            int order = 0;
            for (JsonNode q : questions) {
                String questionId = q.path("id").asString();
                if (questionId.isBlank()) continue;
                
                String documentType = q.path("numberConfig")
                        .path("documentType")
                        .asString(null);

                Question question = Question.builder()
                        .id(UUID.fromString(questionId))
                        .formVersion(version)
                        .form(form)
                        .sectionId(sectionId)
                        .type(q.path("type").asString())
                        .label(q.path("label").asString())
                        .documentType(documentType)
                        .orderIndex(order++)
                        .build();

                questionRepository.save(question);
            }
        }
    }

    /**
     * Deep-clone do schema JSON com regeneração de todos os UUIDs.
     *
     * Gera novos UUIDs para:
     * - Cada section.id
     * - Cada question.id
     * - Cada option.id
     *
     * Também atualiza referências em conditions:
     * Se uma condição aponta para questionId "old-uuid",
     * é atualizada para apontar para o novo UUID correspondente.
     *
     * Isso garante que ao publicar o clone, os IDs na tabela questions
     * não conflitem com os do formulário original.
     */
    private JsonNode regenerateSchemaIds(JsonNode originalSchema) {
        // Deep copy
        JsonNode schema = originalSchema.deepCopy();

        // Mapa de old UUID → new UUID (para atualizar referências em conditions)
        java.util.Map<String, String> idMapping = new java.util.HashMap<>();

        JsonNode sections = schema.path("sections");
        if (!sections.isArray()) return schema;

        // Primeira passada: gerar novos IDs e popular o mapa
        for (JsonNode sectionNode : sections) {
            ObjectNode section = (ObjectNode) sectionNode;

            // Novo ID para section
            String oldSectionId = section.path("id").asString("");
            String newSectionId = UUID.randomUUID().toString();
            section.put("id", newSectionId);
            if (!oldSectionId.isBlank()) {
                idMapping.put(oldSectionId, newSectionId);
            }

            JsonNode questions = section.path("questions");
            if (!questions.isArray()) continue;

            for (JsonNode questionNode : questions) {
                ObjectNode question = (ObjectNode) questionNode;

                // Novo ID para question
                String oldQuestionId = question.path("id").asString("");
                String newQuestionId = UUID.randomUUID().toString();
                question.put("id", newQuestionId);
                if (!oldQuestionId.isBlank()) {
                    idMapping.put(oldQuestionId, newQuestionId);
                }

                // Novos IDs para options
                JsonNode options = question.path("options");
                if (options.isArray()) {
                    for (JsonNode optNode : options) {
                        ObjectNode opt = (ObjectNode) optNode;
                        String oldOptId = opt.path("id").asString("");
                        String newOptId = UUID.randomUUID().toString();
                        opt.put("id", newOptId);
                        if (!oldOptId.isBlank()) {
                            idMapping.put(oldOptId, newOptId);
                        }
                    }
                }

                // Novos IDs para matrix rows/columns
                JsonNode matrixConfig = question.path("matrixConfig");
                if (!matrixConfig.isMissingNode()) {
                    regenerateArrayIds(matrixConfig.path("rows"), idMapping);
                    regenerateArrayIds(matrixConfig.path("columns"), idMapping);
                }
            }
        }

        // Segunda passada: atualizar referências de questionId em conditions
        for (JsonNode sectionNode : sections) {
            JsonNode questions = sectionNode.path("questions");
            if (!questions.isArray()) continue;

            for (JsonNode questionNode : questions) {
                JsonNode conditions = questionNode.path("conditions");
                if (conditions.isMissingNode() || conditions.isNull()) continue;

                updateConditionReferences(conditions, idMapping);
            }
        }

        return schema;
    }

    /**
     * Regenera IDs de um array de objetos com campo "id".
     */
    private void regenerateArrayIds(JsonNode array, java.util.Map<String, String> idMapping) {
        if (!array.isArray()) return;
        for (JsonNode node : array) {
            ObjectNode obj = (ObjectNode) node;
            String oldId = obj.path("id").asString("");
            String newId = UUID.randomUUID().toString();
            obj.put("id", newId);
            if (!oldId.isBlank()) {
                idMapping.put(oldId, newId);
            }
        }
    }

    /**
     * Atualiza referências de questionId dentro de conditions usando o mapa de IDs.
     */
    private void updateConditionReferences(JsonNode conditions, java.util.Map<String, String> idMapping) {
        JsonNode rules = conditions.path("rules");
        if (!rules.isArray()) return;

        for (JsonNode ruleNode : rules) {
            ObjectNode rule = (ObjectNode) ruleNode;
            String oldRef = rule.path("questionId").asString("");
            String newRef = idMapping.get(oldRef);
            if (newRef != null) {
                rule.put("questionId", newRef);
            }
        }
    }
}