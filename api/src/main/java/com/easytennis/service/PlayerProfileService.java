package com.easytennis.service;

import com.easytennis.dto.player.PlayerProfileRequest;
import com.easytennis.dto.player.PlayerProfileResponse;
import com.easytennis.entity.PlayerProfile;
import com.easytennis.entity.User;
import com.easytennis.repository.PlayerProfileRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlayerProfileService {

    private final PlayerProfileRepository playerProfileRepository;

    @Transactional(readOnly = true)
    public List<PlayerProfileResponse> list() {
        User user = resolveAuthenticatedUser();
        return playerProfileRepository.findAllByUserOrderByNameAsc(user)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PlayerProfileResponse create(PlayerProfileRequest request) {
        User user = resolveAuthenticatedUser();
        PlayerProfile profile = PlayerProfile.builder()
                .name(request.name())
                .user(user)
                .build();
        return toResponse(playerProfileRepository.save(profile));
    }

    @Transactional
    public PlayerProfileResponse update(Long id, PlayerProfileRequest request) {
        User user = resolveAuthenticatedUser();
        PlayerProfile profile = findOwned(id, user);
        profile.setName(request.name());
        return toResponse(playerProfileRepository.save(profile));
    }

    @Transactional
    public void delete(Long id) {
        User user = resolveAuthenticatedUser();
        PlayerProfile profile = findOwned(id, user);
        playerProfileRepository.delete(profile);
    }

    private PlayerProfile findOwned(Long id, User user) {
        return playerProfileRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + id));
    }

    private User resolveAuthenticatedUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    private PlayerProfileResponse toResponse(PlayerProfile profile) {
        return new PlayerProfileResponse(profile.getId(), profile.getName());
    }
}
