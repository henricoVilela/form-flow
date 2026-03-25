package com.cronos.formflow_api.api.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cronos.formflow_api.api.dto.response.ResponseLookupResponse;
import com.cronos.formflow_api.domain.response.ResponseService;
import com.cronos.formflow_api.domain.user.User;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/responses")
@RequiredArgsConstructor
public class ResponseLookupController {

    private final ResponseService responseService;

    /**
     * Busca os dados completos de uma resposta pelo ID.
     *
     * Útil para identificar a qual resposta pertencem os arquivos de um export ZIP,
     * onde as pastas são nomeadas com o responseId (ex: arquivos/{responseId}/arquivo.pdf).
     *
     * GET /responses/{responseId}
     */
    @GetMapping("/{responseId}")
    public ResponseEntity<ResponseLookupResponse> getById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID responseId) {
        return ResponseEntity.ok(responseService.lookupById(user, responseId));
    }
}
