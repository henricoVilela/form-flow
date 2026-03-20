package com.cronos.formflow_api.api.handle;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import com.cronos.formflow_api.domain.response.validation.PayloadValidator.PayloadValidationException;
import com.cronos.formflow_api.shared.exception.BusinessException;
import com.cronos.formflow_api.shared.exception.ResourceNotFoundException;

import lombok.Builder;
import lombok.Data;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request));
    }

    @ExceptionHandler(PayloadValidationException.class)
    public ResponseEntity<ErrorResponse> handlePayloadValidation(PayloadValidationException ex, WebRequest request) {
        List<ErrorDetail> details = ex.getFieldErrors().stream()
                .map(fe -> ErrorDetail.builder()
                        .questionId(fe.getQuestionId())
                        .field(fe.getField())
                        .code(fe.getCode())
                        .message(fe.getMessage())
                        .build())
                .toList();

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.UNPROCESSABLE_CONTENT.value())
                .error(ex.getCode())
                .message(ex.getMessage())
                .path(request.getDescription(false).replace("uri=", ""))
                .details(details)
                .build();

        return ResponseEntity.unprocessableContent().body(error);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException ex, WebRequest request) {
        HttpStatus status = resolveStatus(ex.getCode());
        return ResponseEntity.status(status)
                .body(ErrorResponse.of(status, ex.getCode(), ex.getMessage(), request));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, WebRequest request) {
        List<ErrorDetail> details = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> ErrorDetail.builder()
                        .field(f.getField())
                        .code(f.getCode())
                        .message(f.getDefaultMessage())
                        .build())
                .toList();

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.UNPROCESSABLE_CONTENT.value())
                .error("VALIDATION_ERROR")
                .message("Campos inválidos na requisição")
                .path(request.getDescription(false).replace("uri=", ""))
                .details(details)
                .build();

        return ResponseEntity.unprocessableContent().body(error);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex, WebRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "E-mail ou senha inválidos", request));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, WebRequest request) {
    	ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Erro interno do servidor", request));
    }

    private HttpStatus resolveStatus(String code) {
        return switch (code) {
            case "EMAIL_ALREADY_EXISTS", "SLUG_ALREADY_TAKEN" -> HttpStatus.CONFLICT;
            case "FORM_NOT_PUBLISHED", "VERSION_MISMATCH", "FILE_NOT_CONFIRMED" -> HttpStatus.CONFLICT;
            case "INVALID_TOKEN", "PASSWORD_REQUIRED", "TOKEN_INVALID" -> HttpStatus.UNAUTHORIZED;
            case "WRONG_PASSWORD" -> HttpStatus.FORBIDDEN;
            case "RESPONDENT_LIMIT_REACHED" -> HttpStatus.FORBIDDEN;
            default -> HttpStatus.UNPROCESSABLE_CONTENT;
        };
    }

    @Data
    @Builder
    public static class ErrorResponse {
        private LocalDateTime timestamp;
        private int status;
        private String error;
        private String message;
        private String path;
        private List<ErrorDetail> details;

        public static ErrorResponse of(HttpStatus httpStatus, String code, String message, WebRequest request) {
            return ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(httpStatus.value())
                    .error(code)
                    .message(message)
                    .path(request.getDescription(false).replace("uri=", ""))
                    .build();
        }
    }

    @Data
    @Builder
    public static class ErrorDetail {
        private String questionId;
        private String field;
        private String code;
        private String message;
    }
}
