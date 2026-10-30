package com.acadpredict.backend.dto;

import com.acadpredict.backend.entity.Milestone;

public record MilestoneResponse(
    Long id,
    String title,
    String description,
    String startDate,
    String dueDate,
    String status,
    int completion,
    String reviewFeedback,
    String reviewStatus,
    String reviewedBy,
    java.time.LocalDateTime reviewedAt,
    Long projectId,
    String projectName
) {
    public static MilestoneResponse from(Milestone milestone) {
        if (milestone == null) return null;
        return new MilestoneResponse(
            milestone.getId(),
            milestone.getTitle(),
            milestone.getDescription(),
            milestone.getStartDate(),
            milestone.getDueDate(),
            milestone.getStatus(),
            milestone.getCompletion(),
            milestone.getReviewFeedback(),
            milestone.getReviewStatus() != null ? milestone.getReviewStatus() : "PENDING_REVIEW",
            milestone.getReviewedBy(),
            milestone.getReviewedAt(),
            milestone.getProject() != null ? milestone.getProject().getId() : null,
            milestone.getProject() != null ? milestone.getProject().getProjectName() : null
        );
    }
}
