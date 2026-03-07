package com.cronos.formflow_api.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cronos.formflow_api.domain.form.Form;
import com.cronos.formflow_api.domain.form.FormLayout;
import com.cronos.formflow_api.domain.form.FormStatus;
import com.cronos.formflow_api.domain.form.FormVersion;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FormResponse {
    private UUID id;
    private String title;
    private String description;
    private FormStatus status;
    private FormLayout layout;
    private Integer currentVersion;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FormResponse from(Form form, FormVersion version) {
        return FormResponse.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .status(form.getStatus())
                .layout(form.getLayout())
                .currentVersion(version != null ? version.getVersion() : null)
                .publishedAt(form.getPublishedAt())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .build();
    }
}
