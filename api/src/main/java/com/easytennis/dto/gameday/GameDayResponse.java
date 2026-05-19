package com.easytennis.dto.gameday;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record GameDayResponse(
        Long id,
        LocalDate date,
        Integer numberOfCourts,
        Integer numberOfHours,
        BigDecimal totalPrice,
        List<PlayerDto> players,
        LocalDateTime createdAt
) {
}
