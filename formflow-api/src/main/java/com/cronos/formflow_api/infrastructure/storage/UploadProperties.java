package com.cronos.formflow_api.infrastructure.storage;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

@Component
@ConfigurationProperties(prefix = "upload")
@Getter
@Setter
public class UploadProperties {

    /** Tamanho máximo por arquivo em bytes (padrão 10MB) */
    private long maxFileSize = 10_485_760L;

    /** Máximo de arquivos por resposta */
    private int maxFilesPerResponse = 20;

    /** MIME types permitidos por padrão */
    private List<String> allowedTypes = List.of(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv"
    );

    /** Extensões bloqueadas (sempre rejeitadas, mesmo que MIME type bata) */
    private List<String> blockedExtensions = List.of(
            "exe", "bat", "cmd", "sh", "ps1", "msi",
            "dll", "scr", "js", "vbs", "com", "pif"
    );

    /** Comprimento máximo do nome do arquivo */
    private int maxFilenameLength = 255;
}