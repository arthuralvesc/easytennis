package com.easytennis.service;

import com.easytennis.dto.gameday.GameDayRequest;
import com.easytennis.dto.gameday.GameDayResponse;
import com.easytennis.dto.gameday.PlayerDto;
import com.easytennis.entity.GameDay;
import com.easytennis.entity.Player;
import com.easytennis.entity.User;
import com.easytennis.repository.GameDayRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GameDayService {

    private final GameDayRepository gameDayRepository;

    @Transactional
    public GameDayResponse create(GameDayRequest request) {
        User authenticatedUser = resolveAuthenticatedUser();
        List<Player> players = mapToPlayerEntities(request.players());

        GameDay gameDay = GameDay.builder()
                .date(request.date())
                .numberOfCourts(request.numberOfCourts())
                .numberOfHours(request.numberOfHours())
                .totalPrice(request.totalPrice())
                .players(players)
                .user(authenticatedUser)
                .build();

        return toResponse(gameDayRepository.save(gameDay));
    }

    @Transactional(readOnly = true)
    public List<GameDayResponse> listForCurrentUser() {
        User authenticatedUser = resolveAuthenticatedUser();
        return gameDayRepository.findAllByUserOrderByDateDesc(authenticatedUser)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GameDayResponse getByIdForCurrentUser(Long id) {
        User authenticatedUser = resolveAuthenticatedUser();
        GameDay gameDay = findOwnedGameDay(id, authenticatedUser);
        return toResponse(gameDay);
    }

    @Transactional
    public GameDayResponse update(Long id, GameDayRequest request) {
        User authenticatedUser = resolveAuthenticatedUser();
        GameDay gameDay = findOwnedGameDay(id, authenticatedUser);

        gameDay.setDate(request.date());
        gameDay.setNumberOfCourts(request.numberOfCourts());
        gameDay.setNumberOfHours(request.numberOfHours());
        gameDay.setTotalPrice(request.totalPrice());
        gameDay.getPlayers().clear();
        gameDay.getPlayers().addAll(mapToPlayerEntities(request.players()));

        return toResponse(gameDayRepository.save(gameDay));
    }

    @Transactional
    public void delete(Long id) {
        User authenticatedUser = resolveAuthenticatedUser();
        GameDay gameDay = findOwnedGameDay(id, authenticatedUser);
        gameDayRepository.delete(gameDay);
    }

    private GameDay findOwnedGameDay(Long id, User user) {
        return gameDayRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new EntityNotFoundException("Game day not found: " + id));
    }

    private User resolveAuthenticatedUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    private List<Player> mapToPlayerEntities(List<PlayerDto> playerDtos) {
        return playerDtos.stream()
                .map(dto -> Player.builder().name(dto.name()).email(dto.email()).build())
                .toList();
    }

    private GameDayResponse toResponse(GameDay gameDay) {
        List<PlayerDto> playerDtos = gameDay.getPlayers().stream()
                .map(player -> new PlayerDto(player.getName(), player.getEmail()))
                .toList();

        return new GameDayResponse(
                gameDay.getId(),
                gameDay.getDate(),
                gameDay.getNumberOfCourts(),
                gameDay.getNumberOfHours(),
                gameDay.getTotalPrice(),
                playerDtos,
                gameDay.getCreatedAt()
        );
    }
}
