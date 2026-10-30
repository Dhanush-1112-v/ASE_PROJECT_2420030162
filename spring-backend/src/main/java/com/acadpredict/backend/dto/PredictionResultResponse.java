package com.acadpredict.backend.dto;

import com.acadpredict.backend.entity.Prediction;
import java.time.LocalDateTime;

public record PredictionResultResponse(
    Long id,
    Long projectId,
    String projectName,
    String risk,
    double probability,
    LocalDateTime createdAt
) {
    public static PredictionResultResponse from(Prediction p) {
        if (p == null) return null;
        return new PredictionResultResponse(
            p.getId(),
            p.getProject() != null ? p.getProject().getId() : null,
            p.getProject() != null ? p.getProject().getProjectName() : null,
            p.getRisk(),
            p.getProbability(),
            p.getCreatedAt()
        );
    }
}
