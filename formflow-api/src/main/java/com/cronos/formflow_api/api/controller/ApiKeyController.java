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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cronos.formflow_api.api.dto.request.CreateApiKeyRequest;
import com.cronos.formflow_api.api.dto.response.ApiKeyCreatedResponse;
import com.cronos.formflow_api.api.dto.response.ApiKeyResponse;
import com.cronos.formflow_api.domain.apikey.ApiKeyService;
import com.cronos.formflow_api.domain.user.User;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api-keys")
@RequiredArgsConstructor
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    @PostMapping
    public ResponseEntity<ApiKeyCreatedResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateApiKeyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(apiKeyService.create(user, request));
    }

    @GetMapping
    public ResponseEntity<List<ApiKeyResponse>> list(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(apiKeyService.list(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revoke(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        apiKeyService.revoke(user, id);
        return ResponseEntity.noContent().build();
    }
}
