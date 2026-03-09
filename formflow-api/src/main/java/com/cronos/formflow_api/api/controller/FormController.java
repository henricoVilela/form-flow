package com.cronos.formflow_api.api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cronos.formflow_api.api.dto.request.CreateFormRequest;
import com.cronos.formflow_api.api.dto.request.PublishFormRequest;
import com.cronos.formflow_api.api.dto.request.UpdateFormRequest;
import com.cronos.formflow_api.api.dto.response.FormResponse;
import com.cronos.formflow_api.api.dto.response.FormVersionResponse;
import com.cronos.formflow_api.api.dto.response.PublishResponse;
import com.cronos.formflow_api.domain.form.FormService;
import com.cronos.formflow_api.domain.user.User;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/forms")
@RequiredArgsConstructor
public class FormController {

    private final FormService formService;

    @PostMapping
    public ResponseEntity<FormResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateFormRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(formService.create(user, request));
    }

    @GetMapping
    public ResponseEntity<Page<FormResponse>> list(
            @AuthenticationPrincipal User user,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(formService.listByUser(user, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormResponse> getById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(formService.getById(user, id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FormResponse> update(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateFormRequest request) {
        return ResponseEntity.ok(formService.update(user, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> archive(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        formService.archive(user, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<PublishResponse> publish(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody PublishFormRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(formService.publish(user, id, request.getSchema()));
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<List<FormVersionResponse>> listVersions(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(formService.listVersions(user, id));
    }

    @GetMapping("/{id}/versions/{version}")
    public ResponseEntity<FormVersionResponse> getVersion(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @PathVariable Integer version) {
        return ResponseEntity.ok(formService.getVersion(user, id, version));
    }

    /**
     * Duplica um formulário existente.
     *
     * Cria uma cópia completa como DRAFT com título " (Cópia)".
     * O schema da última versão é clonado com novos UUIDs para
     * sections, questions e options (evita conflito ao publicar).
     * Referências em conditions são atualizadas automaticamente.
     *
     * Não copia: respostas, arquivos, notificações, versões anteriores.
     *
     * @param user usuário autenticado (deve ser dono do formulário original)
     * @param id   UUID do formulário a duplicar
     * @return FormResponse do novo formulário clonado
     */
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<FormResponse> duplicate(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(formService.duplicate(user, id));
    }
}
