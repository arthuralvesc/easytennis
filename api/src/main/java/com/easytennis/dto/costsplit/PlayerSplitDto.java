package com.easytennis.dto.costsplit;

import java.math.BigDecimal;

public record PlayerSplitDto(
        int playerIndex,
        String name,
        BigDecimal amountToPay
) {
}
