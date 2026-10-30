package com.acadpredict.backend.dto;

import com.acadpredict.backend.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
    @NotBlank(message = "Name is required")
    String name,

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid institutional address")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 72, message = "Password must be at least 8 characters")
    String password,

    Role role,

    Long assignProjectId
) {
    public CreateUserRequest(String name, String email, String password, Role role) {
        this(name, email, password, role, null);
    }
}
