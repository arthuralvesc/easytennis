package com.easytennis.service;

import com.easytennis.dto.auth.ForgotPasswordRequest;
import com.easytennis.dto.auth.ResetPasswordRequest;
import com.easytennis.dto.auth.VerifyResetCodeRequest;
import com.easytennis.entity.PasswordResetCode;
import com.easytennis.entity.User;
import com.easytennis.repository.PasswordResetCodeRepository;
import com.easytennis.repository.RefreshTokenRepository;
import com.easytennis.repository.UserRepository;
import com.easytennis.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServicePasswordResetTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetCodeRepository passwordResetCodeRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtUtil jwtUtil;
    @Mock private EmailService emailService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordResetCodeRepository,
                refreshTokenRepository,
                passwordEncoder,
                authenticationManager,
                jwtUtil,
                emailService
        );
    }

    // --- sendResetCode ---

    @Test
    void sendResetCode_silentlyNoOpsWhenEmailNotFound() {
        // Anti–user-enumeration: an unknown email must NOT reveal itself via an error.
        // sendResetCode silently does nothing — no throw, no code persisted, no email sent.
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThatCode(() -> authService.sendResetCode(new ForgotPasswordRequest("unknown@example.com")))
                .doesNotThrowAnyException();

        verify(emailService, never()).sendPasswordResetCode(anyString(), anyString());
    }

    @Test
    void sendResetCode_callsEmailServiceWithCorrectRecipient() {
        User user = User.builder().email("user@example.com").name("Test").passwordHash("hash").build();
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        authService.sendResetCode(new ForgotPasswordRequest("user@example.com"));

        ArgumentCaptor<String> emailCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetCode(emailCaptor.capture(), codeCaptor.capture());

        assertThat(emailCaptor.getValue()).isEqualTo("user@example.com");
        assertThat(codeCaptor.getValue()).matches("\\d{6}");
    }

    @Test
    void sendResetCode_deletesOldCodesBeforeSavingNew() {
        User user = User.builder().email("user@example.com").name("Test").passwordHash("hash").build();
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        authService.sendResetCode(new ForgotPasswordRequest("user@example.com"));

        verify(passwordResetCodeRepository).deleteByEmail("user@example.com");
        verify(passwordResetCodeRepository).save(any(PasswordResetCode.class));
    }

    // --- verifyResetCode ---

    @Test
    void verifyResetCode_throwsWhenCodeNotFound() {
        when(passwordResetCodeRepository.findByEmailAndCode("user@example.com", "000000"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.verifyResetCode(new VerifyResetCodeRequest("user@example.com", "000000")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid or expired");
    }

    @Test
    void verifyResetCode_throwsWhenCodeExpired() {
        PasswordResetCode expired = PasswordResetCode.builder()
                .email("user@example.com")
                .code("123456")
                .expiresAt(LocalDateTime.now().minusMinutes(1))
                .build();
        when(passwordResetCodeRepository.findByEmailAndCode("user@example.com", "123456"))
                .thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.verifyResetCode(new VerifyResetCodeRequest("user@example.com", "123456")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid or expired");
    }

    @Test
    void verifyResetCode_succeedsWithValidCode() {
        PasswordResetCode valid = PasswordResetCode.builder()
                .email("user@example.com")
                .code("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();
        when(passwordResetCodeRepository.findByEmailAndCode("user@example.com", "123456"))
                .thenReturn(Optional.of(valid));

        authService.verifyResetCode(new VerifyResetCodeRequest("user@example.com", "123456"));
        // no exception expected
    }

    // --- resetPassword ---

    @Test
    void resetPassword_throwsWhenCodeExpired() {
        PasswordResetCode expired = PasswordResetCode.builder()
                .email("user@example.com")
                .code("123456")
                .expiresAt(LocalDateTime.now().minusMinutes(1))
                .build();
        when(passwordResetCodeRepository.findByEmailAndCode("user@example.com", "123456"))
                .thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.resetPassword(
                new ResetPasswordRequest("user@example.com", "123456", "newpass")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid or expired");

        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_updatesPasswordAndDeletesCode() {
        PasswordResetCode valid = PasswordResetCode.builder()
                .email("user@example.com")
                .code("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();
        User user = User.builder().email("user@example.com").name("Test").passwordHash("oldhash").build();

        when(passwordResetCodeRepository.findByEmailAndCode("user@example.com", "123456"))
                .thenReturn(Optional.of(valid));
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newpass")).thenReturn("newhash");

        authService.resetPassword(new ResetPasswordRequest("user@example.com", "123456", "newpass"));

        verify(userRepository).save(user);
        verify(passwordResetCodeRepository).deleteByEmail("user@example.com");
        assertThat(user.getPasswordHash()).isEqualTo("newhash");
    }
}
