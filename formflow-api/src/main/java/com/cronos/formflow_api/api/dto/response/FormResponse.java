package com.cronos.formflow_api.api.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.cronos.formflow_api.domain.form.Form;
import com.cronos.formflow_api.domain.form.FormLayout;
import com.cronos.formflow_api.domain.form.FormStatus;
import com.cronos.formflow_api.domain.form.FormVersion;
import com.cronos.formflow_api.domain.form.FormVisibility;

import lombok.Builder;
import lombok.Data;
import tools.jackson.databind.JsonNode;

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
    private JsonNode draftSchema;
    private String welcomeMessage;
    private String thankYouMessage;
    private String thankYouRedirectUrl;
    private Integer thankYouRedirectDelay;
    private Boolean thankYouShowResubmit;
    private FormVisibility visibility;
    private String slug;
    private Integer maxResponses;
    private LocalDateTime expiresAt;
    private long responseCount;

    public static FormResponse from(Form form, FormVersion version) {
        return from(form, version, 0L);
    }

    public static FormResponse from(Form form, FormVersion version, long responseCount) {
        return FormResponse.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .status(form.getStatus())
                .layout(form.getLayout())
                .currentVersion(version != null ? version.getVersion() : null)
                .draftSchema(form.getDraftSchema())
                .publishedAt(form.getPublishedAt())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .welcomeMessage(form.getWelcomeMessage())
                .thankYouMessage(form.getThankYouMessage())
                .thankYouRedirectUrl(form.getThankYouRedirectUrl())
                .thankYouRedirectDelay(form.getThankYouRedirectDelay())
                .thankYouShowResubmit(form.getThankYouShowResubmit())
                .visibility(form.getVisibility())
                .slug(form.getSlug())
                .maxResponses(form.getMaxResponses())
                .expiresAt(form.getExpiresAt())
                .responseCount(responseCount)
                .build();
    }
}
