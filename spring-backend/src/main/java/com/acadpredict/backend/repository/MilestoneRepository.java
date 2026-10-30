package com.acadpredict.backend.repository;

import com.acadpredict.backend.entity.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {

    @Query("SELECT m FROM Milestone m WHERE m.project.id = :projectId ORDER BY m.id ASC")
    List<Milestone> findByProjectId(@Param("projectId") Long projectId);
}
