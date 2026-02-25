package com.cronos.formflow_api.config;

import com.cronos.formflow_api.domain.user.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.core.userdetails.UserDetailsService;

@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class AppConfig {

    private final AuthService authService;

    @Bean
    public UserDetailsService userDetailsService() {
        return authService;
    }
}
