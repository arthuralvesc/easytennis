package com.easytennis.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "Code must be exactly 6 digits") String code,
        @NotBlank @Size(min = 6, message = "Password must be at least 6 characters") String newPassword
) {}
