package com.easytennis.service;

import com.easytennis.dto.costsplit.CostSplitRequest;
import com.easytennis.dto.costsplit.CostSplitResponse;
import com.easytennis.dto.costsplit.PlayerSplitDto;
import com.easytennis.entity.GameDay;
import com.easytennis.entity.Player;
import com.easytennis.entity.User;
import com.easytennis.repository.GameDayRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CostSplitService {

    private final GameDayRepository gameDayRepository;

    @Transactional(readOnly = true)
    public CostSplitResponse calculate(CostSplitRequest request) {
        User authenticatedUser = resolveAuthenticatedUser();
        GameDay gameDay = gameDayRepository.findByIdAndUser(request.gameDayId(), authenticatedUser)
                .orElseThrow(() -> new EntityNotFoundException("Game day not found: " + request.gameDayId()));

        List<Player> players = gameDay.getPlayers();
        List<Integer> payingIndexes = request.payingPlayerIndexes().stream()
                .distinct()
                .toList();

        boolean anyOutOfRange = payingIndexes.stream()
                .anyMatch(index -> index == null || index < 0 || index >= players.size());
        if (anyOutOfRange) {
            throw new IllegalArgumentException("Invalid player selection for this game day");
        }

        BigDecimal amountPerPlayer = gameDay.getTotalPrice()
                .divide(BigDecimal.valueOf(payingIndexes.size()), 2, RoundingMode.HALF_UP);

        List<PlayerSplitDto> playerAmounts = payingIndexes.stream()
                .map(index -> new PlayerSplitDto(index, players.get(index).getName(), amountPerPlayer))
                .toList();

        return new CostSplitResponse(gameDay.getId(), playerAmounts);
    }

    private User resolveAuthenticatedUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
