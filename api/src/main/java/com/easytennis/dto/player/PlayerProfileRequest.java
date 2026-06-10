package com.easytennis.dto.player;

import jakarta.validation.constraints.NotBlank;

public record PlayerProfileRequest(
        @NotBlank String name
) {
}
