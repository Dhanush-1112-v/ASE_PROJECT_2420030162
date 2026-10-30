package com.acadpredict.backend.dto;

import com.acadpredict.backend.entity.Task;

public record TaskResponse(
    Long id,
    String title,
    String description,
    String priority,
    String dueDate,
    String status,
    int progress,
    Long projectId,
    String projectName,
    Long assignedToId,
    String assignedToName
) {
    public static TaskResponse from(Task task) {
        if (task == null) return null;
        return new TaskResponse(
            task.getId(),
            task.getTitle(),
            task.getDescription(),
            task.getPriority() != null ? task.getPriority() : "MEDIUM",
            task.getDueDate(),
            task.getStatus(),
            task.getProgress(),
            task.getProject() != null ? task.getProject().getId() : null,
            task.getProject() != null ? task.getProject().getProjectName() : null,
            task.getAssignedTo() != null ? task.getAssignedTo().getId() : null,
            task.getAssignedTo() != null ? task.getAssignedTo().getName() : null
        );
    }
}
