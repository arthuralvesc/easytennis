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
        if (playerProfileRepository.existsByUserAndEmail(user, request.email())) {
            throw new IllegalArgumentException("A player with this email already exists in your list");
        }
        PlayerProfile profile = PlayerProfile.builder()
                .name(request.name())
                .email(request.email())
                .user(user)
                .build();
        return toResponse(playerProfileRepository.save(profile));
    }

    @Transactional
    public PlayerProfileResponse update(Long id, PlayerProfileRequest request) {
        User user = resolveAuthenticatedUser();
        PlayerProfile profile = findOwned(id, user);
        boolean emailChanged = !profile.getEmail().equalsIgnoreCase(request.email());
        if (emailChanged && playerProfileRepository.existsByUserAndEmail(user, request.email())) {
            throw new IllegalArgumentException("A player with this email already exists in your list");
        }
        profile.setName(request.name());
        profile.setEmail(request.email());
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
        return new PlayerProfileResponse(profile.getId(), profile.getName(), profile.getEmail());
    }
}
