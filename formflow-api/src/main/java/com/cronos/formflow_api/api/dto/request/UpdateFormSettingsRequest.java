package com.cronos.formflow_api.api.dto.request;

import java.time.LocalDateTime;

import com.cronos.formflow_api.domain.form.FormVisibility;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateFormSettingsRequest {

    @NotNull
    private FormVisibility visibility;

    private String slug;
    private String password;
    private Integer maxResponses;
    private LocalDateTime expiresAt;
    private String welcomeMessage;
    private String thankYouMessage;
}
