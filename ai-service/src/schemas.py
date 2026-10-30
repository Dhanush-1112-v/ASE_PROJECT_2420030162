"""
schemas.py
===========
Pydantic v2 models for the FastAPI prediction endpoint.

Field naming
------------
The API accepts **camelCase** JSON keys (e.g. ``studyHours``) as shown
in the project specification.  Internally each field is mapped to the
**snake_case** column name used during model training (e.g.
``study_hours``).

Mapping (API field → training feature)
---------------------------------------
    attendance           → attendance
    studyHours           → study_hours
    previousPerformance  → previous_performance
    taskCompletion       → task_completion
    pendingTasks         → pending_tasks
    missedDeadlines      → missed_deadlines
    milestoneCompletion  → milestone_completion
    daysRemaining        → days_remaining
    teamSize             → team_size
    projectType          → project_type
    projectProgress      → project_progress
"""

from pydantic import BaseModel, Field
from typing import Literal


# ---------------------------------------------------------------------------
# Supported project types (must match the values used during training)
# ---------------------------------------------------------------------------
VALID_PROJECT_TYPES = {"Web", "AI", "Mobile", "Research", "IoT"}


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------
class PredictionRequest(BaseModel):
    """Input payload for POST /predict."""

    attendance: float = Field(
        ..., ge=0, le=100,
        description="Student attendance percentage (0–100).",
    )
    study_hours: float = Field(
        ..., ge=0, le=50, alias="studyHours",
        description="Average weekly study/project-work hours.",
    )
    previous_performance: float = Field(
        ..., ge=0, le=100, alias="previousPerformance",
        description="Previous academic performance percentage (0–100).",
    )
    task_completion: float = Field(
        ..., ge=0, le=100, alias="taskCompletion",
        description="Percentage of assigned tasks completed (0–100).",
    )
    pending_tasks: int = Field(
        ..., ge=0, alias="pendingTasks",
        description="Number of pending tasks (≥ 0).",
    )
    missed_deadlines: int = Field(
        ..., ge=0, alias="missedDeadlines",
        description="Number of missed deadlines (≥ 0).",
    )
    milestone_completion: float = Field(
        ..., ge=0, le=100, alias="milestoneCompletion",
        description="Percentage of milestones completed (0–100).",
    )
    days_remaining: int = Field(
        ..., ge=0, alias="daysRemaining",
        description="Days remaining before the project deadline (≥ 0).",
    )
    team_size: int = Field(
        ..., ge=1, alias="teamSize",
        description="Number of students in the project team (≥ 1).",
    )
    project_type: str = Field(
        ..., alias="projectType",
        description="Project type: Web, AI, Mobile, Research, or IoT.",
    )
    project_progress: float = Field(
        ..., ge=0, le=100, alias="projectProgress",
        description="Overall project progress percentage (0–100).",
    )

    model_config = {
        "populate_by_name": True,      # accept both camelCase & snake_case
        "json_schema_extra": {
            "examples": [
                {
                    "attendance": 70,
                    "studyHours": 15,
                    "previousPerformance": 65,
                    "taskCompletion": 50,
                    "pendingTasks": 7,
                    "missedDeadlines": 2,
                    "milestoneCompletion": 40,
                    "daysRemaining": 10,
                    "teamSize": 4,
                    "projectType": "AI",
                    "projectProgress": 45,
                }
            ]
        },
    }

    def to_model_dict(self) -> dict:
        """Return a dict whose keys match the training feature names."""
        return {
            "attendance": self.attendance,
            "study_hours": self.study_hours,
            "previous_performance": self.previous_performance,
            "task_completion": self.task_completion,
            "pending_tasks": self.pending_tasks,
            "missed_deadlines": self.missed_deadlines,
            "milestone_completion": self.milestone_completion,
            "days_remaining": self.days_remaining,
            "team_size": self.team_size,
            "project_type": self.project_type,
            "project_progress": self.project_progress,
        }


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------
class PredictionResponse(BaseModel):
    """Output payload returned by POST /predict.

    • ``risk``  – the predicted delay-risk class (LOW / MEDIUM / HIGH).
    • ``probability`` – the model's predicted probability **for the
      predicted class** (not necessarily the probability of HIGH).
      Values range from 0.0 to 1.0.
    """

    risk: Literal["LOW", "MEDIUM", "HIGH"] = Field(
        ..., description="Predicted delay-risk category.",
    )
    probability: float = Field(
        ..., ge=0.0, le=1.0,
        description=(
            "Probability of the *predicted* class, "
            "as estimated by the model (0–1)."
        ),
    )


# ---------------------------------------------------------------------------
# Health / status
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
