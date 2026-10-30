package com.acadpredict.backend.dto;

public record TaskRequest(
    String title,
    Long projectId,
    String description,
    String priority,
    String dueDate,
    Long assignedToId
) {
    public TaskRequest(String title, Long projectId) {
        this(title, projectId, null, "MEDIUM", null, null);
    }

    public TaskRequest(String title, Long projectId, String description, String priority, String dueDate) {
        this(title, projectId, description, priority, dueDate, null);
    }
}
