package com.acadpredict.backend.controller;

import com.acadpredict.backend.dto.MilestoneRequest;
import com.acadpredict.backend.dto.MilestoneResponse;
import com.acadpredict.backend.entity.Milestone;
import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.repository.MilestoneRepository;
import com.acadpredict.backend.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api")
public class MilestoneController {

    private final MilestoneRepository milestoneRepository;
    private final ProjectRepository projectRepository;

    public MilestoneController(MilestoneRepository milestoneRepository, ProjectRepository projectRepository) {
        this.milestoneRepository = milestoneRepository;
        this.projectRepository = projectRepository;
    }

    private void checkProjectAccess(Project project, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));
        if (!isStaff) {
            if (project.getOwner() == null || !project.getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this project");
            }
        }
    }

    @GetMapping("/projects/{projectId}/milestones")
    public List<MilestoneResponse> getProjectMilestones(@PathVariable Long projectId, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        checkProjectAccess(project, auth);

        return milestoneRepository.findByProjectId(projectId).stream()
            .map(MilestoneResponse::from)
            .toList();
    }

    @PostMapping("/projects/{projectId}/milestones")
    @ResponseStatus(HttpStatus.CREATED)
    public MilestoneResponse createMilestone(
        @PathVariable Long projectId,
        @RequestBody MilestoneRequest request,
        Authentication authentication
    ) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        checkProjectAccess(project, auth);

        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Milestone title is required");
        }

        Milestone milestone = new Milestone();
        milestone.setTitle(request.title().trim());
        milestone.setDescription(request.description());
        milestone.setStartDate(request.startDate());
        milestone.setDueDate(request.dueDate());
        milestone.setStatus(request.status() != null ? request.status() : "UPCOMING");
        milestone.setCompletion(request.completion() != null ? request.completion() : 0);
        milestone.setProject(project);

        return MilestoneResponse.from(milestoneRepository.save(milestone));
    }

    @PutMapping("/milestones/{id}")
    public MilestoneResponse updateMilestone(
        @PathVariable Long id,
        @RequestBody MilestoneRequest request,
        Authentication authentication
    ) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Milestone milestone = milestoneRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Milestone not found"));
        checkProjectAccess(milestone.getProject(), auth);

        if (request.title() != null && !request.title().isBlank()) {
            milestone.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            milestone.setDescription(request.description());
        }
        if (request.startDate() != null) {
            milestone.setStartDate(request.startDate());
        }
        if (request.dueDate() != null) {
            milestone.setDueDate(request.dueDate());
        }
        if (request.status() != null) {
            milestone.setStatus(request.status());
        }
        if (request.completion() != null) {
            milestone.setCompletion(Math.max(0, Math.min(100, request.completion())));
        }
        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));
        if (isStaff) {
            if (request.reviewStatus() != null) {
                milestone.setReviewStatus(request.reviewStatus());
            }
            if (request.reviewFeedback() != null) {
                milestone.setReviewFeedback(request.reviewFeedback());
                milestone.setReviewedBy(auth.getName());
                milestone.setReviewedAt(java.time.LocalDateTime.now());
            }
        }

        return MilestoneResponse.from(milestoneRepository.save(milestone));
    }

    public record MilestoneReviewRequest(String reviewStatus, String reviewFeedback) {}

    @PutMapping("/milestones/{id}/review")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('FACULTY', 'COORDINATOR')")
    public MilestoneResponse reviewMilestone(
        @PathVariable Long id,
        @RequestBody MilestoneReviewRequest request,
        Authentication authentication
    ) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        Milestone milestone = milestoneRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Milestone not found"));

        if (request.reviewStatus() != null && !request.reviewStatus().isBlank()) {
            milestone.setReviewStatus(request.reviewStatus().trim().toUpperCase());
        }
        if (request.reviewFeedback() != null) {
            milestone.setReviewFeedback(request.reviewFeedback().trim());
        }
        milestone.setReviewedBy(auth.getName());
        milestone.setReviewedAt(java.time.LocalDateTime.now());

        return MilestoneResponse.from(milestoneRepository.save(milestone));
    }

    @DeleteMapping("/milestones/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMilestone(@PathVariable Long id, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Milestone milestone = milestoneRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Milestone not found"));
        checkProjectAccess(milestone.getProject(), auth);

        milestoneRepository.delete(milestone);
    }
}
