package com.easytennis.controller;

import com.easytennis.dto.player.PlayerProfileRequest;
import com.easytennis.dto.player.PlayerProfileResponse;
import com.easytennis.service.PlayerProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/players")
@RequiredArgsConstructor
public class PlayerProfileController {

    private final PlayerProfileService playerProfileService;

    @GetMapping
    public ResponseEntity<List<PlayerProfileResponse>> list() {
        return ResponseEntity.ok(playerProfileService.list());
    }

    @PostMapping
    public ResponseEntity<PlayerProfileResponse> create(@RequestBody @Valid PlayerProfileRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(playerProfileService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlayerProfileResponse> update(
            @PathVariable Long id,
            @RequestBody @Valid PlayerProfileRequest request
    ) {
        return ResponseEntity.ok(playerProfileService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        playerProfileService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
