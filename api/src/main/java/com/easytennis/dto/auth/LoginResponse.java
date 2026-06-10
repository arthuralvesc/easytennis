package com.easytennis.dto.auth;

public record LoginResponse(String token, String refreshToken) {
}
