package com.cronos.formflow_api.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cronos.formflow_api.api.dto.request.LoginRequest;
import com.cronos.formflow_api.api.dto.request.RegisterRequest;
import com.cronos.formflow_api.api.dto.request.UpdatePasswordRequest;
import com.cronos.formflow_api.api.dto.request.UpdateProfileRequest;
import com.cronos.formflow_api.api.dto.request.VerifyEmailRequest;
import com.cronos.formflow_api.api.dto.response.AuthResponse;
import com.cronos.formflow_api.api.dto.response.RegisterResponse;
import com.cronos.formflow_api.api.dto.response.UserResponse;
import com.cronos.formflow_api.domain.user.AuthService;
import com.cronos.formflow_api.domain.user.User;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request.getToken()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestHeader("X-Refresh-Token") String refreshToken) {
        return ResponseEntity.ok(authService.refresh(refreshToken));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(UserResponse.from(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(user, request));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> updatePassword(
            @AuthenticationPrincipal User user,
            @RequestBody UpdatePasswordRequest request) {
        authService.updatePassword(user, request.getNewPassword());
        return ResponseEntity.noContent().build();
    }
}
