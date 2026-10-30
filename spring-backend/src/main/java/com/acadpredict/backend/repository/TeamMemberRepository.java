package com.acadpredict.backend.repository;

import com.acadpredict.backend.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {

    @Query("SELECT tm FROM TeamMember tm WHERE tm.project.id = :projectId ORDER BY tm.id ASC")
    List<TeamMember> findByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT CASE WHEN COUNT(tm) > 0 THEN true ELSE false END FROM TeamMember tm WHERE tm.project.id = :projectId AND LOWER(tm.email) = LOWER(:email)")
    boolean existsByProjectIdAndEmail(@Param("projectId") Long projectId, @Param("email") String email);
}
