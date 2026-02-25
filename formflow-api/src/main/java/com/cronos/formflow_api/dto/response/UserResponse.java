package com.cronos.formflow_api.dto.response;

import java.util.UUID;

import com.cronos.formflow_api.domain.user.User;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private UUID id;
    private String name;
    private String email;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .build();
    }
}
