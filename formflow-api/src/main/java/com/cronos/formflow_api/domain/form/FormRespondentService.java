package com.cronos.formflow_api.domain.form;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.api.dto.request.CreateRespondentRequest;
import com.cronos.formflow_api.api.dto.request.UpdateRespondentRequest;
import com.cronos.formflow_api.api.dto.response.RespondentResponse;
import com.cronos.formflow_api.domain.user.User;
import com.cronos.formflow_api.shared.exception.BusinessException;
import com.cronos.formflow_api.shared.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FormRespondentService {

    private final FormRespondentRepository respondentRepository;
    private final FormRepository formRepository;

    private static final SecureRandom RANDOM = new SecureRandom();

    public List<RespondentResponse> list(User user, UUID formId) {
        findFormOwnedBy(user, formId);
        return respondentRepository.findByFormIdOrderByCreatedAtAsc(formId)
                .stream().map(RespondentResponse::from).toList();
    }

    @Transactional
    public RespondentResponse create(User user, UUID formId, CreateRespondentRequest request) {
        Form form = findFormOwnedBy(user, formId);
        FormRespondent respondent = FormRespondent.builder()
                .form(form)
                .name(request.getName().trim())
                .token(generateToken())
                .maxResponses(request.getMaxResponses() != null && request.getMaxResponses() > 0
                        ? request.getMaxResponses() : null)
                .build();
        return RespondentResponse.from(respondentRepository.save(respondent));
    }

    @Transactional
    public RespondentResponse update(User user, UUID formId, UUID respondentId, UpdateRespondentRequest request) {
        findFormOwnedBy(user, formId);
        FormRespondent respondent = respondentRepository.findByIdAndFormId(respondentId, formId)
                .orElseThrow(() -> new ResourceNotFoundException("Respondente não encontrado"));
        respondent.setName(request.getName().trim());
        respondent.setMaxResponses(request.getMaxResponses() != null && request.getMaxResponses() > 0
                ? request.getMaxResponses() : null);
        if (request.getActive() != null) {
            respondent.setActive(request.getActive());
        }
        return RespondentResponse.from(respondentRepository.save(respondent));
    }

    @Transactional
    public void delete(User user, UUID formId, UUID respondentId) {
        findFormOwnedBy(user, formId);
        FormRespondent respondent = respondentRepository.findByIdAndFormId(respondentId, formId)
                .orElseThrow(() -> new ResourceNotFoundException("Respondente não encontrado"));
        respondentRepository.delete(respondent);
    }

    /**
     * Valida o token e retorna o respondente.
     * Lança exceção se inativo ou com limite atingido.
     */
    public FormRespondent validateToken(String token) {
        FormRespondent respondent = respondentRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException("TOKEN_INVALID", "Token de acesso inválido"));
        if (!respondent.isActive()) {
            throw new BusinessException("TOKEN_INVALID", "Token de acesso inválido ou inativo");
        }
        if (respondent.getMaxResponses() != null && respondent.getResponseCount() >= respondent.getMaxResponses()) {
            throw new BusinessException("RESPONDENT_LIMIT_REACHED", "O limite de respostas para este acesso foi atingido");
        }
        return respondent;
    }

    /**
     * Incrementa o contador de respostas do respondente.
     * Deve ser chamado dentro de uma transação após submissão confirmada.
     */
    @Transactional
    public void incrementResponseCount(FormRespondent respondent) {
        respondent.setResponseCount(respondent.getResponseCount() + 1);
        respondentRepository.save(respondent);
    }

    private Form findFormOwnedBy(User user, UUID formId) {
        return formRepository.findByIdAndUserId(formId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Formulário não encontrado"));
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
