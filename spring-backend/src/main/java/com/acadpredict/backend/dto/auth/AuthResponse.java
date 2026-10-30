package com.acadpredict.backend.dto.auth;

public record AuthResponse(
    String token,
    Long id,
    String name,
    String email,
    String role
) {}