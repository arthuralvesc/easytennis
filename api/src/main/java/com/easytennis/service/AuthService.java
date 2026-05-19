package com.easytennis.service;

import com.easytennis.dto.auth.ForgotPasswordRequest;
import com.easytennis.dto.auth.LoginRequest;
import com.easytennis.dto.auth.LoginResponse;
import com.easytennis.dto.auth.RegisterRequest;
import com.easytennis.dto.auth.ResetPasswordRequest;
import com.easytennis.dto.auth.VerifyResetCodeRequest;
import com.easytennis.entity.PasswordResetCode;
import com.easytennis.entity.User;
import com.easytennis.repository.PasswordResetCodeRepository;
import com.easytennis.repository.UserRepository;
import com.easytennis.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int CODE_EXPIRY_MINUTES = 15;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetCodeRepository passwordResetCodeRepository;
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

    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String token = jwtUtil.generateToken(request.email(), user.getName());
        return new LoginResponse(token);
    }

    @Transactional
    public void sendResetCode(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("No account found for this email address"));

        passwordResetCodeRepository.deleteByEmail(request.email());

        String code = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));

        PasswordResetCode resetCode = PasswordResetCode.builder()
                .email(request.email())
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES))
                .build();

        passwordResetCodeRepository.save(resetCode);
        emailService.sendPasswordResetCode(request.email(), code);
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
}
