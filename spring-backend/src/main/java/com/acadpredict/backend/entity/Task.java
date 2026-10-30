package com.acadpredict.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "tasks")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(length = 2000)
    private String description;

    @Column(length = 20)
    private String priority = "MEDIUM";

    @Column(length = 50)
    private String dueDate;

    private String status = "PENDING";
    private int progress = 0;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id", foreignKey = @ForeignKey(name = "fk_tasks_project"))
    @JsonIgnoreProperties({"tasks", "hibernateLazyInitializer", "handler"})
    private Project project;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_to_id", foreignKey = @ForeignKey(name = "fk_tasks_assigned_to"))
    @JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    private User assignedTo;

    public Task() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getProgress() { return progress; }
    public void setProgress(int progress) { this.progress = progress; }

    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }

    @JsonProperty("projectId")
    public Long getProjectId() {
        return project != null ? project.getId() : null;
    }

    public User getAssignedTo() { return assignedTo; }
    public void setAssignedTo(User assignedTo) { this.assignedTo = assignedTo; }

    @JsonProperty("assignedToId")
    public Long getAssignedToId() {
        return assignedTo != null ? assignedTo.getId() : null;
    }

    @JsonProperty("assignedToName")
    public String getAssignedToName() {
        return assignedTo != null ? assignedTo.getName() : null;
    }
}
