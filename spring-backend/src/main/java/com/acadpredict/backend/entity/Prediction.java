package com.acadpredict.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "predictions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id", nullable = false, foreignKey = @ForeignKey(name = "fk_predictions_project"))
    @JsonIgnoreProperties({"tasks", "predictions", "hibernateLazyInitializer", "handler"})
    private Project project;

    @Column(nullable = false, length = 20)
    private String risk;

    @Column(nullable = false)
    private double probability;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Prediction() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }

    public String getRisk() { return risk; }
    public void setRisk(String risk) { this.risk = risk; }

    public double getProbability() { return probability; }
    public void setProbability(double probability) { this.probability = probability; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
