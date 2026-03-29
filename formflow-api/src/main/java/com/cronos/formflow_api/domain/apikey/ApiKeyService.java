package com.cronos.formflow_api.domain.apikey;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.api.dto.request.CreateApiKeyRequest;
import com.cronos.formflow_api.api.dto.response.ApiKeyCreatedResponse;
import com.cronos.formflow_api.api.dto.response.ApiKeyResponse;
import com.cronos.formflow_api.domain.user.User;
import com.cronos.formflow_api.domain.user.UserRepository;
import com.cronos.formflow_api.shared.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String KEY_PREFIX_STR = "sk_";

    private final ApiKeyRepository apiKeyRepository;
    private final UserRepository userRepository;

    @Transactional
    public ApiKeyCreatedResponse create(User user, CreateApiKeyRequest request) {
        String rawKey = generateRawKey();
        String keyPrefix = rawKey.substring(0, KEY_PREFIX_STR.length() + 8); // e.g. "sk_a1b2c3d4"
        String keyHash = sha256(rawKey);

        ApiKey apiKey = ApiKey.builder()
                .user(user)
                .name(request.getName())
                .keyHash(keyHash)
                .keyPrefix(keyPrefix)
                .build();

        apiKeyRepository.save(apiKey);

        return ApiKeyCreatedResponse.builder()
                .id(apiKey.getId())
                .name(apiKey.getName())
                .keyPrefix(keyPrefix)
                .key(rawKey)
                .createdAt(apiKey.getCreatedAt())
                .build();
    }

    public List<ApiKeyResponse> list(User user) {
        return apiKeyRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(ApiKeyResponse::from)
                .toList();
    }

    @Transactional
    public void revoke(User user, UUID apiKeyId) {
        ApiKey apiKey = apiKeyRepository.findById(apiKeyId)
                .orElseThrow(() -> new ResourceNotFoundException("API Key não encontrada"));

        if (!apiKey.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("API Key não encontrada");
        }

        apiKey.setActive(false);
        apiKeyRepository.save(apiKey);
    }

    /** Resolve o usuário associado a uma chave bruta (para uso no filter). */
    @Transactional
    public User resolveUser(String rawKey) {
        String hash = sha256(rawKey);
        return apiKeyRepository.findByKeyHashAndActiveTrueWithUser(hash)
                .map(apiKey -> {
                    apiKey.setLastUsedAt(java.time.LocalDateTime.now());
                    apiKeyRepository.save(apiKey);
                    // Carrega o User diretamente para evitar proxy Hibernate sem sessão
                    return userRepository.findById(apiKey.getUser().getId()).orElse(null);
                })
                .orElse(null);
    }

    private String generateRawKey() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return KEY_PREFIX_STR + HexFormat.of().formatHex(bytes);
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 não disponível", e);
        }
    }
}
