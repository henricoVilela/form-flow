package com.cronos.formflow_api.api.controller;


import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cronos.formflow_api.api.dto.response.PublicFormResponse;
import com.cronos.formflow_api.domain.form.FormService;

import lombok.RequiredArgsConstructor;

/**
 * Controller público para acesso a formulários publicados.
 *
 * Esses endpoints NÃO requerem autenticação.
 * São usados pelo frontend para renderizar o formulário ao respondente.
 *
 * Rotas públicas devem ser adicionadas ao SecurityConfig:
 *   .requestMatchers(HttpMethod.GET, "/public/forms/**").permitAll()
 */
@RestController
@RequestMapping("/public/forms")
@RequiredArgsConstructor
public class PublicFormController {

    private final FormService formService;

    /**
     * Retorna os dados necessários para renderizar um formulário publicado.
     *
     * Inclui: título, descrição, layout, schema da última versão publicada,
     * e o formVersionId (necessário para submissão).
     *
     * Retorna 404 se o formulário não existir ou não estiver publicado.
     *
     * @param formId UUID do formulário
     * @return dados públicos do formulário com schema completo
     */
    @GetMapping("/{formId}")
    public ResponseEntity<PublicFormResponse> getPublicForm(
            @PathVariable UUID formId,
            @RequestHeader(value = "X-Form-Password", required = false) String password,
            @RequestParam(value = "t", required = false) String respondentToken) {
        return ResponseEntity.ok(formService.getPublicForm(formId, password, respondentToken));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<PublicFormResponse> getPublicFormBySlug(
            @PathVariable String slug,
            @RequestHeader(value = "X-Form-Password", required = false) String password,
            @RequestParam(value = "t", required = false) String respondentToken) {
        return ResponseEntity.ok(formService.getPublicFormBySlug(slug, password, respondentToken));
    }
}
