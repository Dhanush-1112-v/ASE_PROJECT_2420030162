package com.acadpredict.backend.dto;

public record ProjectRequest(
    String projectName,
    String description,
    String projectType
) {}
