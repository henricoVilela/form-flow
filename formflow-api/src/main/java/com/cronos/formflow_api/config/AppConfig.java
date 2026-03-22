package com.cronos.formflow_api.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
@EnableConfigurationProperties(RateLimitProperties.class)
public class AppConfig {
    // UserDetailsService é provido diretamente pelo AuthService (@Service + implements UserDetailsService)
    // AuthenticationManager é exposto no SecurityConfig
}
