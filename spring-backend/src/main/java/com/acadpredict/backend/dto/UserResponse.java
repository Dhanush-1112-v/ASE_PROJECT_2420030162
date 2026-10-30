package com.acadpredict.backend.dto;

import com.acadpredict.backend.entity.Role;
import com.acadpredict.backend.entity.User;
import java.time.LocalDateTime;

public record UserResponse(
    Long id,
    String name,
    String email,
    Role role,
    LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        if (user == null) return null;
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole(),
            user.getCreatedAt()
        );
    }
}
