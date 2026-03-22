package com.cronos.formflow_api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "rate-limit")
public class RateLimitProperties {

    /** Habilita ou desabilita o rate limiting globalmente. */
    private boolean enabled = true;

    /**
     * Limite de submissões por IP por formulário.
     * Chave: submit:{ip}:{formId}
     */
    private int submissionLimit = 10;

    /** Janela em segundos para submissões. */
    private int submissionWindowSeconds = 60;

    /**
     * Limite de presign de upload por IP.
     * Chave: presign:{ip}
     */
    private int uploadPresignLimit = 20;

    /** Janela em segundos para presign de upload. */
    private int uploadPresignWindowSeconds = 60;
}
