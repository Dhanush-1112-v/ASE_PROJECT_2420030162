
package com.acadpredict.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PredictionRequest(
    @JsonProperty("projectId")
    Long projectId,

    @NotNull @DecimalMin("0") @DecimalMax("100")
    Double attendance,

    @JsonProperty("studyHours")
    @NotNull @DecimalMin("0") @DecimalMax("50")
    Double studyHours,

    @JsonProperty("previousPerformance")
    @NotNull @DecimalMin("0") @DecimalMax("100")
    Double previousPerformance,

    @JsonProperty("taskCompletion")
    @NotNull @DecimalMin("0") @DecimalMax("100")
    Double taskCompletion,

    @JsonProperty("pendingTasks")
    @NotNull @Min(0)
    Integer pendingTasks,

    @JsonProperty("missedDeadlines")
    @NotNull @Min(0)
    Integer missedDeadlines,

    @JsonProperty("milestoneCompletion")
    @NotNull @DecimalMin("0") @DecimalMax("100")
    Double milestoneCompletion,

    @JsonProperty("daysRemaining")
    @NotNull @Min(0)
    Integer daysRemaining,

    @JsonProperty("teamSize")
    @NotNull @Min(1)
    Integer teamSize,

    @JsonProperty("projectType")
    @NotBlank
    String projectType,

    @JsonProperty("projectProgress")
    @NotNull @DecimalMin("0") @DecimalMax("100")
    Double projectProgress
) {
    public PredictionRequest(
        Double attendance,
        Double studyHours,
        Double previousPerformance,
        Double taskCompletion,
        Integer pendingTasks,
        Integer missedDeadlines,
        Double milestoneCompletion,
        Integer daysRemaining,
        Integer teamSize,
        String projectType,
        Double projectProgress
    ) {
        this(null, attendance, studyHours, previousPerformance, taskCompletion,
             pendingTasks, missedDeadlines, milestoneCompletion, daysRemaining,
             teamSize, projectType, projectProgress);
    }

    public PredictionRequest withProjectId(Long id) {
        return new PredictionRequest(
            id, attendance, studyHours, previousPerformance, taskCompletion,
            pendingTasks, missedDeadlines, milestoneCompletion, daysRemaining,
            teamSize, projectType, projectProgress
        );
    }

    public AiPayload toAiPayload() {
        return new AiPayload(
            attendance,
            studyHours,
            previousPerformance,
            taskCompletion,
            pendingTasks,
            missedDeadlines,
            milestoneCompletion,
            daysRemaining,
            teamSize,
            projectType,
            projectProgress
        );
    }

    public record AiPayload(
        Double attendance,
        @JsonProperty("studyHours") Double studyHours,
        @JsonProperty("previousPerformance") Double previousPerformance,
        @JsonProperty("taskCompletion") Double taskCompletion,
        @JsonProperty("pendingTasks") Integer pendingTasks,
        @JsonProperty("missedDeadlines") Integer missedDeadlines,
        @JsonProperty("milestoneCompletion") Double milestoneCompletion,
        @JsonProperty("daysRemaining") Integer daysRemaining,
        @JsonProperty("teamSize") Integer teamSize,
        @JsonProperty("projectType") String projectType,
        @JsonProperty("projectProgress") Double projectProgress
    ) {}
}
