package com.easytennis.dto.costsplit;

import java.util.List;

public record CostSplitResponse(
        Long gameDayId,
        List<PlayerSplitDto> playerAmounts
) {
}
