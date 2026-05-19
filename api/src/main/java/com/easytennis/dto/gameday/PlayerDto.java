package com.easytennis.dto.gameday;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PlayerDto(
        @NotBlank String name,
        @NotBlank @Email String email
) {
}
