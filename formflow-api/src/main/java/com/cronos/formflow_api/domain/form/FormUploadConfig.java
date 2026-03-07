package com.cronos.formflow_api.domain.form;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Configuração de upload por formulário.
 *
 * Define regras globais de upload que se aplicam a TODAS as questões
 * do tipo file_upload dentro deste formulário.
 *
 * Se um formulário não tem FormUploadConfig, o sistema usa os defaults
 * definidos em UploadProperties (application.yaml).
 *
 * Tabela: form_upload_configs (criada pela V10)
 */
@Entity
@Table(name = "form_upload_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormUploadConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id", nullable = false, unique = true)
    private Form form;

    /**
     * Tamanho máximo por arquivo em bytes.
     * Padrão: 10MB (10485760 bytes)
     */
    @Column(name = "max_file_size", nullable = false)
    @Builder.Default
    private Long maxFileSize = 10_485_760L;

    /**
     * Número máximo de arquivos por resposta completa.
     * Padrão: 20
     */
    @Column(name = "max_files_total", nullable = false)
    @Builder.Default
    private Integer maxFilesTotal = 20;

    /**
     * Array de MIME types permitidos.
     * Padrão: image/jpeg, image/png, application/pdf
     *
     * Suporta wildcards parciais: "image/*" aceita qualquer imagem.
     */
    @Column(name = "allowed_types", columnDefinition = "TEXT[]", nullable = false)
    @Builder.Default
    private String[] allowedTypes = {"image/jpeg", "image/png", "application/pdf"};

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
