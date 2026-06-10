package com.easytennis.dto.player;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PlayerProfileRequest(
        @NotBlank String name,
        @NotBlank @Email String email
) {
}
