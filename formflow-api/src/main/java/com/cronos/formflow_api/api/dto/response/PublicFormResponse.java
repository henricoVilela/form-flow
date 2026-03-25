package com.cronos.formflow_api.api.dto.response;

import java.util.UUID;

import com.cronos.formflow_api.domain.form.Form;
import com.cronos.formflow_api.domain.form.FormLayout;
import com.cronos.formflow_api.domain.form.FormVersion;

import lombok.Builder;
import lombok.Data;
import tools.jackson.databind.JsonNode;

/**
 * DTO com os dados mínimos necessários para renderizar um formulário publicado.
 * Não expõe dados sensíveis (userId, datas internas, etc).
 */
@Data
@Builder
public class PublicFormResponse {

    private UUID formId;
    private UUID formVersionId;
    private String title;
    private String description;
    private FormLayout layout;
    private Integer version;
    private JsonNode schema;
    private String welcomeMessage;
    private String thankYouMessage;
    private String thankYouRedirectUrl;
    private Integer thankYouRedirectDelay;
    private Boolean thankYouShowResubmit;

    public static PublicFormResponse from(Form form, FormVersion formVersion) {
        return PublicFormResponse.builder()
            .formId(form.getId())
            .formVersionId(formVersion.getId())
            .title(form.getTitle())
            .description(form.getDescription())
            .layout(form.getLayout())
            .version(formVersion.getVersion())
            .schema(formVersion.getSchema())
            .welcomeMessage(form.getWelcomeMessage())
            .thankYouMessage(form.getThankYouMessage())
            .thankYouRedirectUrl(form.getThankYouRedirectUrl())
            .thankYouRedirectDelay(form.getThankYouRedirectDelay())
            .thankYouShowResubmit(form.getThankYouShowResubmit())
            .build();
    }
}
