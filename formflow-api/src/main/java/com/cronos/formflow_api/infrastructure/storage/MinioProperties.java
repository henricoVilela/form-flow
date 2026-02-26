package com.cronos.formflow_api.infrastructure.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

@Component
@ConfigurationProperties(prefix = "minio")
@Getter
@Setter
public class MinioProperties {
    private String endpoint;
    private String accessKey;
    private String secretKey;
    private String bucketUploads;
    private String bucketPublic;
    private Integer presignedUrlExpiry;
}

