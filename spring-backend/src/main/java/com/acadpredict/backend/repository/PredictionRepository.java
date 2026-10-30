package com.acadpredict.backend.repository;

import com.acadpredict.backend.entity.Prediction;
import com.acadpredict.backend.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    List<Prediction> findByProjectOrderByCreatedAtDesc(Project project);

    @Query("SELECT p FROM Prediction p WHERE p.project.id = :projectId ORDER BY p.createdAt DESC")
    List<Prediction> findByProjectIdOrderByCreatedAtDesc(@Param("projectId") Long projectId);
}

