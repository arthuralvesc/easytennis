package com.easytennis.dto.costsplit;

import java.math.BigDecimal;

public record PlayerSplitDto(
        String name,
        String email,
        BigDecimal amountToPay
) {
}
