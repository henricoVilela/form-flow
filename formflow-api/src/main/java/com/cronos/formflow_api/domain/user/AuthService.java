package com.cronos.formflow_api.domain.user;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cronos.formflow_api.api.dto.request.LoginRequest;
import com.cronos.formflow_api.api.dto.request.RegisterRequest;
import com.cronos.formflow_api.api.dto.request.UpdateProfileRequest;
import com.cronos.formflow_api.api.dto.response.AuthResponse;
import com.cronos.formflow_api.api.dto.response.RegisterResponse;
import com.cronos.formflow_api.api.dto.response.UserResponse;
import com.cronos.formflow_api.infrastructure.mail.EmailService;
import com.cronos.formflow_api.infrastructure.security.JwtService;
import com.cronos.formflow_api.shared.exception.BusinessException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final ApplicationContext applicationContext;

    // Lazy via ApplicationContext para evitar dependência circular com SecurityConfig
    private AuthenticationManager getAuthManager() {
        return applicationContext.getBean(AuthenticationManager.class);
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado: " + email));
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("EMAIL_ALREADY_EXISTS", "E-mail já cadastrado");
        }

        String token = UUID.randomUUID().toString().replace("-", "");

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .emailVerified(false)
                .verificationToken(token)
                .verificationTokenExpiresAt(LocalDateTime.now().plusHours(24))
                .build();

        userRepository.save(user);
        emailService.sendVerificationEmail(user, token);

        return RegisterResponse.builder()
                .message("Conta criada! Verifique seu e-mail para ativar.")
                .email(request.getEmail())
                .build();
    }

    @Transactional
    public AuthResponse verifyEmail(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new BusinessException("INVALID_TOKEN", "Token de verificação inválido"));

        if (user.isEmailVerified()) {
            throw new BusinessException("ALREADY_VERIFIED", "E-mail já verificado");
        }

        if (user.getVerificationTokenExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("TOKEN_EXPIRED", "Token de verificação expirado");
        }

        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiresAt(null);
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("INVALID_CREDENTIALS", "E-mail ou senha inválidos"));

        if (!user.isEmailVerified()) {
            throw new BusinessException("EMAIL_NOT_VERIFIED", "Por favor, verifique seu e-mail antes de fazer login");
        }

        getAuthManager().authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        return buildAuthResponse(user);
    }

    public AuthResponse refresh(String refreshToken) {
        String email = jwtService.extractUsername(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));

        if (!jwtService.isTokenValid(refreshToken, user)) {
            throw new BusinessException("INVALID_TOKEN", "Refresh token inválido ou expirado");
        }

        return buildAuthResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(User currentUser, UpdateProfileRequest request) {
        currentUser.setName(request.getName());
        userRepository.save(currentUser);
        return UserResponse.from(currentUser);
    }

    @Transactional
    public void updatePassword(User currentUser, String newPassword) {
        currentUser.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(currentUser);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(UserResponse.from(user))
                .build();
    }
}
