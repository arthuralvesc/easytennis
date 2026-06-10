package com.easytennis.dto.gameday;

import jakarta.validation.constraints.NotBlank;

public record PlayerDto(
        @NotBlank String name,
        Long profileId
) {
}
