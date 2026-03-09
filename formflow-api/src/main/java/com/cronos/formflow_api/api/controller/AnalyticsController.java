package com.cronos.formflow_api.api.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cronos.formflow_api.api.dto.response.AnalyticsResponse;
import com.cronos.formflow_api.domain.analytics.AnalyticsService;
import com.cronos.formflow_api.domain.user.User;

import lombok.RequiredArgsConstructor;

/**
 * Endpoints de dashboard e analytics para respostas de formulários.
 *
 * Todos os endpoints requerem autenticação e verificam ownership do formulário.
 */
@RestController
@RequestMapping("/forms/{formId}/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * Retorna analytics completo do formulário.
     *
     * Inclui:
     * - Summary: total de respostas, últimos 7/30 dias, primeira/última resposta
     * - Timeline: respostas por dia (padrão: últimos 30 dias)
     * - Per-question:
     *   - Choice (single/multi/dropdown): distribuição de opções
     *   - Number/Rating/Scale: média, min, max, mediana, desvio padrão
     *   - Text: comprimento médio, top 10 palavras mais frequentes
     *   - Date: data mais antiga e mais recente
     *   - File: total de arquivos e média por resposta
     *
     * @param formId UUID do formulário
     * @param days   dias para timeline (padrão 30, máximo 365)
     */
    @GetMapping
    public ResponseEntity<AnalyticsResponse> getAnalytics(
            @AuthenticationPrincipal User user,
            @PathVariable UUID formId,
            @RequestParam(defaultValue = "30") int days) {

        // Limita range do timeline
        if (days < 1) days = 1;
        if (days > 365) days = 365;

        return ResponseEntity.ok(analyticsService.getAnalytics(user, formId, days));
    }
}