package com.acadpredict.backend.repository;

import com.acadpredict.backend.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    @Query("SELECT d FROM Document d WHERE d.project.id = :projectId ORDER BY d.id DESC")
    List<Document> findByProjectId(@Param("projectId") Long projectId);
}
