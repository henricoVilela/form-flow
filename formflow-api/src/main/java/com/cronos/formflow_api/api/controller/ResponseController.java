package com.cronos.formflow_api.api.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cronos.formflow_api.api.dto.request.SubmitResponseRequest;
import com.cronos.formflow_api.api.dto.response.ResponseDetailResponse;
import com.cronos.formflow_api.api.dto.response.ResponseSummaryResponse;
import com.cronos.formflow_api.domain.response.ResponseService;
import com.cronos.formflow_api.domain.user.User;
import com.google.common.net.HttpHeaders;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/forms/{formId}/responses")
@RequiredArgsConstructor
public class ResponseController {

    private final ResponseService responseService;

    @PostMapping
    public ResponseEntity<ResponseDetailResponse> submit(
            @PathVariable UUID formId,
            @RequestParam(value = "t", required = false) String respondentToken,
            @Valid @RequestBody SubmitResponseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(responseService.submit(formId, request, respondentToken));
    }

    @GetMapping
    public ResponseEntity<Page<ResponseSummaryResponse>> list(
            @AuthenticationPrincipal User user,
            @PathVariable UUID formId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(responseService.list(user, formId, pageable));
    }

    @GetMapping("/{responseId}")
    public ResponseEntity<ResponseDetailResponse> getById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID formId,
            @PathVariable UUID responseId) {
        return ResponseEntity.ok(responseService.getById(user, formId, responseId));
    }

    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal User user,
            @PathVariable UUID formId) {
        byte[] csv = responseService.exportCsv(user, formId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"responses.csv\"")
                .body(csv);
    }
}
