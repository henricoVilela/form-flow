package com.cronos.formflow_api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.cronos.formflow_api.infrastructure.storage.MinioProperties;

import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class MinioConfig {

    private final MinioProperties minioProperties;

    @Bean
    MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(minioProperties.getEndpoint())
                .credentials(minioProperties.getAccessKey(), minioProperties.getSecretKey())
                .build();
    }
}