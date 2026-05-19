package com.easytennis.dto.gameday;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record GameDayRequest(
        @NotNull LocalDate date,
        @NotNull @Positive Integer numberOfCourts,
        @NotNull @Positive Integer numberOfHours,
        @NotNull @Positive BigDecimal totalPrice,
        @NotNull @Valid List<PlayerDto> players
) {
}
