package com.cronos.formflow_api.infrastructure.ratelimit;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Serviço de rate limiting baseado em janela fixa por chave.
 *
 * <p>Cada chave mantém um contador e o timestamp de início da janela.
 * Quando a janela expira, o contador é zerado automaticamente na próxima
 * requisição. Um job agendado remove entradas antigas para evitar vazamento
 * de memória.
 */
@Service
public class RateLimitService {

    private record Bucket(AtomicInteger count, long windowStart) {}

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * Registra uma tentativa para a chave fornecida e retorna {@code true}
     * se o limite ainda não foi atingido.
     *
     * @param key           chave de identificação (ex: "submit:{ip}:{formId}")
     * @param limit         número máximo de requisições permitidas na janela
     * @param windowSeconds tamanho da janela em segundos
     * @return {@code true} se a requisição é permitida, {@code false} se excedeu o limite
     */
    public boolean isAllowed(String key, int limit, int windowSeconds) {
        long now = System.currentTimeMillis();
        long windowMs = windowSeconds * 1000L;

        int[] resultCount = {0};

        buckets.compute(key, (k, existing) -> {
            if (existing == null || (now - existing.windowStart()) >= windowMs) {
                Bucket fresh = new Bucket(new AtomicInteger(0), now);
                resultCount[0] = fresh.count().incrementAndGet();
                return fresh;
            }
            resultCount[0] = existing.count().incrementAndGet();
            return existing;
        });

        return resultCount[0] <= limit;
    }

    /** Remove entradas cujas janelas expiraram há mais de 1 hora. */
    @Scheduled(fixedDelay = 60_000)
    public void cleanup() {
        long now = System.currentTimeMillis();
        long maxAge = 3_600_000L; // 1 hora
        buckets.entrySet().removeIf(e -> (now - e.getValue().windowStart()) > maxAge);
    }
}
