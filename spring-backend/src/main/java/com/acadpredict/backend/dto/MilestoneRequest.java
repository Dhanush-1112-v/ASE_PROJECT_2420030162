package com.acadpredict.backend.dto;

public record MilestoneRequest(
    String title,
    String description,
    String startDate,
    String dueDate,
    String status,
    Integer completion,
    Long projectId,
    String reviewFeedback,
    String reviewStatus
) {
    public MilestoneRequest(String title, String description, String startDate, String dueDate, String status, Integer completion, Long projectId) {
        this(title, description, startDate, dueDate, status, completion, projectId, null, null);
    }
}
