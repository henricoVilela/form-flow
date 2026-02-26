package com.cronos.formflow_api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class AppConfig {
    // UserDetailsService é provido diretamente pelo AuthService (@Service + implements UserDetailsService)
    // AuthenticationManager é exposto no SecurityConfig
}
