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
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CostSplitService {

    private final GameDayRepository gameDayRepository;

    @Transactional(readOnly = true)
    public CostSplitResponse calculate(CostSplitRequest request) {
        User authenticatedUser = resolveAuthenticatedUser();
        GameDay gameDay = gameDayRepository.findByIdAndUser(request.gameDayId(), authenticatedUser)
                .orElseThrow(() -> new EntityNotFoundException("Game day not found: " + request.gameDayId()));

        Set<String> payingEmails = Set.copyOf(request.payingPlayerEmails());
        List<Player> payingPlayers = gameDay.getPlayers().stream()
                .filter(player -> payingEmails.contains(player.getEmail()))
                .toList();

        if (payingPlayers.isEmpty()) {
            throw new IllegalArgumentException("No matching players found for the provided emails");
        }

        BigDecimal amountPerPlayer = gameDay.getTotalPrice()
                .divide(BigDecimal.valueOf(payingPlayers.size()), 2, RoundingMode.HALF_UP);

        List<PlayerSplitDto> playerAmounts = payingPlayers.stream()
                .map(player -> new PlayerSplitDto(player.getName(), player.getEmail(), amountPerPlayer))
                .toList();

        return new CostSplitResponse(gameDay.getId(), playerAmounts);
    }

    private User resolveAuthenticatedUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
