package com.acadpredict.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "projects")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String projectName;

    @Column(length = 2000)
    private String description;

    private String projectType;
    private String status = "PENDING_REVIEW";
    private int progress = 0;

    @Column(length = 20)
    private String delayRisk;

    private Double riskProbability;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_id", foreignKey = @ForeignKey(name = "fk_projects_owner"))
    @JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    private User owner;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "faculty_guide_id", foreignKey = @ForeignKey(name = "fk_projects_faculty_guide"))
    @JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    private User facultyGuide;

    @Column(length = 2000)
    private String reviewFeedback;

    @Column(length = 100)
    private String reviewedBy;

    private java.time.LocalDateTime reviewedAt;

    @Column(length = 2000)
    private String coordinatorNotes;

    @Column(length = 100)
    private String coordinatorNotesAuthor;

    private java.time.LocalDateTime coordinatorNotesUpdatedAt;

    @OneToMany(mappedBy = "project")
    @JsonIgnore
    private List<Task> tasks = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Prediction> predictions = new ArrayList<>();

    public Project() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProjectName() { return projectName; }
    public void setProjectName(String projectName) { this.projectName = projectName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getProjectType() { return projectType; }
    public void setProjectType(String projectType) { this.projectType = projectType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getProgress() { return progress; }
    public void setProgress(int progress) { this.progress = progress; }

    public String getDelayRisk() { return delayRisk; }
    public void setDelayRisk(String delayRisk) { this.delayRisk = delayRisk; }

    public Double getRiskProbability() { return riskProbability; }
    public void setRiskProbability(Double riskProbability) { this.riskProbability = riskProbability; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }

    @JsonProperty("ownerId")
    public Long getOwnerId() {
        return owner != null ? owner.getId() : null;
    }

    public User getFacultyGuide() { return facultyGuide; }
    public void setFacultyGuide(User facultyGuide) { this.facultyGuide = facultyGuide; }

    @JsonProperty("facultyGuideId")
    public Long getFacultyGuideId() {
        return facultyGuide != null ? facultyGuide.getId() : null;
    }

    @JsonProperty("facultyGuideName")
    public String getFacultyGuideName() {
        return facultyGuide != null ? facultyGuide.getName() : null;
    }

    @JsonProperty("facultyGuideEmail")
    public String getFacultyGuideEmail() {
        return facultyGuide != null ? facultyGuide.getEmail() : null;
    }

    public String getReviewFeedback() { return reviewFeedback; }
    public void setReviewFeedback(String reviewFeedback) { this.reviewFeedback = reviewFeedback; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public java.time.LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(java.time.LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getCoordinatorNotes() { return coordinatorNotes; }
    public void setCoordinatorNotes(String coordinatorNotes) { this.coordinatorNotes = coordinatorNotes; }

    public String getCoordinatorNotesAuthor() { return coordinatorNotesAuthor; }
    public void setCoordinatorNotesAuthor(String coordinatorNotesAuthor) { this.coordinatorNotesAuthor = coordinatorNotesAuthor; }

    public java.time.LocalDateTime getCoordinatorNotesUpdatedAt() { return coordinatorNotesUpdatedAt; }
    public void setCoordinatorNotesUpdatedAt(java.time.LocalDateTime coordinatorNotesUpdatedAt) { this.coordinatorNotesUpdatedAt = coordinatorNotesUpdatedAt; }

    public List<Task> getTasks() { return tasks; }
    public void setTasks(List<Task> tasks) { this.tasks = tasks; }

    public List<Prediction> getPredictions() { return predictions; }
    public void setPredictions(List<Prediction> predictions) { this.predictions = predictions; }
}
