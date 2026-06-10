package com.easytennis.service;

import com.easytennis.dto.auth.ForgotPasswordRequest;
import com.easytennis.dto.auth.LoginRequest;
import com.easytennis.dto.auth.LoginResponse;
import com.easytennis.dto.auth.RefreshRequest;
import com.easytennis.dto.auth.RegisterRequest;
import com.easytennis.dto.auth.ResetPasswordRequest;
import com.easytennis.dto.auth.VerifyResetCodeRequest;
import com.easytennis.entity.PasswordResetCode;
import com.easytennis.entity.RefreshToken;
import com.easytennis.entity.User;
import com.easytennis.repository.PasswordResetCodeRepository;
import com.easytennis.repository.RefreshTokenRepository;
import com.easytennis.repository.UserRepository;
import com.easytennis.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int CODE_EXPIRY_MINUTES = 15;
    private static final int REFRESH_TOKEN_EXPIRY_DAYS = 7;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetCodeRepository passwordResetCodeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered: " + request.email());
        }

        User newUser = User.builder()
                .name(request.name())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .build();

        userRepository.save(newUser);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (BadCredentialsException e) {
            log.warn("Failed login attempt for email={}", request.email());
            throw e;
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String accessToken = jwtUtil.generateToken(request.email(), user.getName());
        RefreshToken refreshToken = createRefreshToken(request.email());

        return new LoginResponse(accessToken, refreshToken.getToken());
    }

    @Transactional
    public LoginResponse refresh(RefreshRequest request) {
        RefreshToken stored = refreshTokenRepository.findByToken(request.refreshToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.deleteByToken(request.refreshToken());
            throw new IllegalArgumentException("Refresh token expired");
        }

        refreshTokenRepository.deleteByToken(stored.getToken());

        User user = userRepository.findByEmail(stored.getUserEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String accessToken = jwtUtil.generateToken(user.getEmail(), user.getName());
        RefreshToken newRefreshToken = createRefreshToken(user.getEmail());

        return new LoginResponse(accessToken, newRefreshToken.getToken());
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.deleteByToken(refreshToken);
    }

    @Transactional
    public void sendResetCode(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.email()).ifPresent(user -> {
            passwordResetCodeRepository.deleteByEmail(request.email());

            String code = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));

            PasswordResetCode resetCode = PasswordResetCode.builder()
                    .email(request.email())
                    .code(code)
                    .expiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES))
                    .build();

            passwordResetCodeRepository.save(resetCode);
            emailService.sendPasswordResetCode(request.email(), code);
        });
    }

    public void verifyResetCode(VerifyResetCodeRequest request) {
        PasswordResetCode resetCode = passwordResetCodeRepository
                .findByEmailAndCode(request.email(), request.code())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset code"));

        if (resetCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Invalid or expired reset code");
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetCode resetCode = passwordResetCodeRepository
                .findByEmailAndCode(request.email(), request.code())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset code"));

        if (resetCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Invalid or expired reset code");
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        passwordResetCodeRepository.deleteByEmail(request.email());
    }

    private RefreshToken createRefreshToken(String email) {
        RefreshToken refreshToken = RefreshToken.builder()
                .token(UUID.randomUUID().toString())
                .userEmail(email)
                .expiresAt(LocalDateTime.now().plusDays(REFRESH_TOKEN_EXPIRY_DAYS))
                .build();
        return refreshTokenRepository.save(refreshToken);
    }
}
