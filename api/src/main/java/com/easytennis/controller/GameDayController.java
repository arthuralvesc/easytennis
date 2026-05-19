package com.easytennis.controller;

import com.easytennis.dto.gameday.GameDayRequest;
import com.easytennis.dto.gameday.GameDayResponse;
import com.easytennis.service.GameDayService;
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
@RequestMapping("/game-days")
@RequiredArgsConstructor
public class GameDayController {

    private final GameDayService gameDayService;

    @PostMapping
    public ResponseEntity<GameDayResponse> create(@RequestBody @Valid GameDayRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gameDayService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<GameDayResponse>> list() {
        return ResponseEntity.ok(gameDayService.listForCurrentUser());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GameDayResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(gameDayService.getByIdForCurrentUser(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GameDayResponse> update(
            @PathVariable Long id,
            @RequestBody @Valid GameDayRequest request
    ) {
        return ResponseEntity.ok(gameDayService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        gameDayService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
