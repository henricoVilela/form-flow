package com.cronos.formflow_api.api.controller;

import java.util.List;
import java.util.UUID;

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

import com.cronos.formflow_api.api.dto.request.CreateRespondentRequest;
import com.cronos.formflow_api.api.dto.request.UpdateRespondentRequest;
import com.cronos.formflow_api.api.dto.response.RespondentResponse;
import com.cronos.formflow_api.domain.form.FormRespondentService;
import com.cronos.formflow_api.domain.user.User;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/forms/{formId}/respondents")
@RequiredArgsConstructor
public class RespondentController {

    private final FormRespondentService respondentService;

    @GetMapping
    public ResponseEntity<List<RespondentResponse>> list(
            @PathVariable UUID formId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(respondentService.list(user, formId));
    }

    @PostMapping
    public ResponseEntity<RespondentResponse> create(
            @PathVariable UUID formId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateRespondentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(respondentService.create(user, formId, request));
    }

    @PutMapping("/{respondentId}")
    public ResponseEntity<RespondentResponse> update(
            @PathVariable UUID formId,
            @PathVariable UUID respondentId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateRespondentRequest request) {
        return ResponseEntity.ok(respondentService.update(user, formId, respondentId, request));
    }

    @DeleteMapping("/{respondentId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID formId,
            @PathVariable UUID respondentId,
            @AuthenticationPrincipal User user) {
        respondentService.delete(user, formId, respondentId);
        return ResponseEntity.noContent().build();
    }
}
