package com.cronos.formflow_api.domain.webhook;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookService {

    /** Tentativas máximas antes de marcar como FAILED. */
    private static final int MAX_ATTEMPTS = 3;

    /** Backoff em minutos por número de tentativa (índice = attempts já realizados). */
    private static final int[] BACKOFF_MINUTES = {0, 5, 30};

    private final WebhookDeliveryRepository deliveryRepository;
    private final RestTemplate restTemplate;

    /**
     * Job que roda a cada 30 segundos e despacha entregas pendentes cujo
     * nextAttemptAt já passou.
     */
    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void dispatchPending() {
        List<WebhookDelivery> pending = deliveryRepository.findPendingDue(LocalDateTime.now());
        for (WebhookDelivery delivery : pending) {
            dispatch(delivery);
        }
    }

    private void dispatch(WebhookDelivery delivery) {
        delivery.setAttempts(delivery.getAttempts() + 1);
        log.debug("Webhook dispatch attempt={} deliveryId={} url={}",
                delivery.getAttempts(), delivery.getId(), delivery.getWebhookUrl());

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<JsonNode> entity = new HttpEntity<>(delivery.getPayload(), headers);

            var response = restTemplate.postForEntity(delivery.getWebhookUrl(), entity, String.class);
            int statusCode = response.getStatusCode().value();

            if (response.getStatusCode().is2xxSuccessful()) {
                delivery.setStatus(WebhookDeliveryStatus.DELIVERED);
                delivery.setDeliveredAt(LocalDateTime.now());
                delivery.setLastResponseStatus(statusCode);
                log.info("Webhook entregue deliveryId={} status={}", delivery.getId(), statusCode);
            } else {
                handleFailure(delivery, statusCode, "HTTP " + statusCode);
            }

        } catch (HttpStatusCodeException e) {
            handleFailure(delivery, e.getStatusCode().value(), e.getMessage());
        } catch (Exception e) {
            handleFailure(delivery, null, e.getMessage());
        }

        deliveryRepository.save(delivery);
    }

    private void handleFailure(WebhookDelivery delivery, Integer statusCode, String error) {
        delivery.setLastResponseStatus(statusCode);
        delivery.setLastError(error != null && error.length() > 500 ? error.substring(0, 500) : error);

        if (delivery.getAttempts() >= MAX_ATTEMPTS) {
            delivery.setStatus(WebhookDeliveryStatus.FAILED);
            log.warn("Webhook falhou definitivamente deliveryId={} após {} tentativas: {}",
                    delivery.getId(), delivery.getAttempts(), error);
        } else {
            int backoff = BACKOFF_MINUTES[delivery.getAttempts()];
            delivery.setNextAttemptAt(LocalDateTime.now().plusMinutes(backoff));
            log.warn("Webhook falhou deliveryId={} attempt={} próxima tentativa em {}min: {}",
                    delivery.getId(), delivery.getAttempts(), backoff, error);
        }
    }
}
