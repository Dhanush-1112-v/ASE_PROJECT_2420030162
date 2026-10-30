package com.acadpredict.backend.repository;

import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByOwner(User owner);
    List<Project> findByOwnerEmail(String email);
    List<Project> findByOwnerId(Long ownerId);
    List<Project> findByFacultyGuide(User facultyGuide);
    List<Project> findByFacultyGuideEmail(String email);
    List<Project> findByFacultyGuideId(Long facultyGuideId);
    long countByStatus(String status);
    long countByFacultyGuideIsNull();
}
