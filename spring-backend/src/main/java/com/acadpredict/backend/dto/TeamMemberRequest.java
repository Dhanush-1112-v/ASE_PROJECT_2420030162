package com.acadpredict.backend.dto;

public record TeamMemberRequest(
    String name,
    String email,
    String role
) {}
