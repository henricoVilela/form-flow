package com.cronos.formflow_api.infrastructure.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

/**
 * Configurações do job de limpeza de arquivos órfãos.
 */
@Component
@ConfigurationProperties(prefix = "cleanup")
@Getter
@Setter
public class CleanupProperties {

    /** Cron expression para agendamento (usado no @Scheduled via SpEL) */
    private String cron = "0 0 * * * *";

    /** Horas para considerar um arquivo PENDING como órfão */
    private int orphanThresholdHours = 24;

    /** Máximo de arquivos processados por execução */
    private int batchSize = 100;

    /** Habilita/desabilita o job */
    private boolean enabled = true;
}