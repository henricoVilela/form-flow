package com.cronos.formflow_api.infrastructure.ratelimit;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.cronos.formflow_api.config.RateLimitProperties;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.ObjectMapper;

/**
 * Filtro de rate limiting que protege endpoints públicos contra spam/abuso.
 *
 * <p>Endpoints protegidos (apenas POST):
 * <ul>
 *   <li>{@code /forms/{formId}/responses} — limita submissões por IP + formulário</li>
 *   <li>{@code /upload/presign} — limita geração de presigned URLs por IP</li>
 * </ul>
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    /** Matches /forms/{formId}/responses (com ou sem contexto no início). */
    private static final Pattern FORM_RESPONSE_PATTERN =
            Pattern.compile(".*/forms/([^/]+)/responses$");

    /** Matches /upload/presign. */
    private static final Pattern UPLOAD_PRESIGN_PATTERN =
            Pattern.compile(".*/upload/presign$");

    private final RateLimitService rateLimitService;
    private final RateLimitProperties properties;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        if (!properties.isEnabled() || !"POST".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String ip = extractClientIp(request);

        // Rate limit: submissão de respostas
        Matcher formMatcher = FORM_RESPONSE_PATTERN.matcher(path);
        if (formMatcher.matches()) {
            String formId = formMatcher.group(1);
            String key = "submit:" + ip + ":" + formId;
            if (!rateLimitService.isAllowed(key, properties.getSubmissionLimit(),
                    properties.getSubmissionWindowSeconds())) {
                log.warn("Rate limit excedido para submissão — ip={} formId={}", ip, formId);
                writeRateLimitResponse(response, request.getRequestURI(),
                        properties.getSubmissionWindowSeconds());
                return;
            }
        }

        // Rate limit: presign de upload
        if (UPLOAD_PRESIGN_PATTERN.matcher(path).matches()) {
            String key = "presign:" + ip;
            if (!rateLimitService.isAllowed(key, properties.getUploadPresignLimit(),
                    properties.getUploadPresignWindowSeconds())) {
                log.warn("Rate limit excedido para presign — ip={}", ip);
                writeRateLimitResponse(response, request.getRequestURI(),
                        properties.getUploadPresignWindowSeconds());
                return;
            }
        }

        chain.doFilter(request, response);
    }

    /**
     * Extrai o IP real do cliente, considerando proxies reversos via
     * {@code X-Forwarded-For}.
     */
    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /** Escreve a resposta 429 Too Many Requests no formato padrão da API. */
    private void writeRateLimitResponse(HttpServletResponse response,
                                        String path,
                                        int windowSeconds) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", String.valueOf(windowSeconds));

        var body = new RateLimitErrorResponse(
                LocalDateTime.now(),
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "RATE_LIMIT_EXCEEDED",
                "Muitas requisições. Aguarde " + windowSeconds + " segundos e tente novamente.",
                path
        );

        objectMapper.writeValue(response.getOutputStream(), body);
    }

    /** DTO de resposta de erro para 429. */
    record RateLimitErrorResponse(
            LocalDateTime timestamp,
            int status,
            String error,
            String message,
            String path
    ) {}
}
