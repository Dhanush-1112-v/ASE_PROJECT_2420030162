package com.acadpredict.backend.controller;

import com.acadpredict.backend.dto.ProjectRequest;
import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.entity.User;
import com.acadpredict.backend.repository.ProjectRepository;
import com.acadpredict.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import com.acadpredict.backend.dto.PredictionResultResponse;
import com.acadpredict.backend.dto.TaskResponse;
import com.acadpredict.backend.repository.PredictionRepository;
import com.acadpredict.backend.repository.TaskRepository;
import com.acadpredict.backend.repository.MilestoneRepository;
import com.acadpredict.backend.repository.TeamMemberRepository;
import com.acadpredict.backend.repository.DocumentRepository;
import com.acadpredict.backend.service.DocumentStorageService;
import com.acadpredict.backend.entity.Document;
import com.acadpredict.backend.entity.Role;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectRepository repository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final PredictionRepository predictionRepository;
    private final MilestoneRepository milestoneRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final DocumentRepository documentRepository;
    private final DocumentStorageService documentStorageService;

    @org.springframework.beans.factory.annotation.Autowired
    public ProjectController(
            ProjectRepository repository,
            UserRepository userRepository,
            TaskRepository taskRepository,
            PredictionRepository predictionRepository,
            MilestoneRepository milestoneRepository,
            TeamMemberRepository teamMemberRepository,
            DocumentRepository documentRepository,
            DocumentStorageService documentStorageService) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.predictionRepository = predictionRepository;
        this.milestoneRepository = milestoneRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.documentRepository = documentRepository;
        this.documentStorageService = documentStorageService;
    }

    public ProjectController(
            ProjectRepository repository,
            UserRepository userRepository,
            TaskRepository taskRepository,
            PredictionRepository predictionRepository) {
        this(repository, userRepository, taskRepository, predictionRepository, null, null, null, null);
    }

    public ProjectController(ProjectRepository repository, UserRepository userRepository, TaskRepository taskRepository) {
        this(repository, userRepository, taskRepository, null, null, null, null, null);
    }

    public ProjectController(ProjectRepository repository, UserRepository userRepository) {
        this(repository, userRepository, null, null, null, null, null, null);
    }

    public ProjectController(ProjectRepository repository) {
        this(repository, null, null, null, null, null, null, null);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Project create(@RequestBody ProjectRequest request, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        if (request.projectName() == null || request.projectName().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Project name is required");
        }

        String email = auth.getName();
        User owner = null;
        if (userRepository != null) {
            owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
        }

        Project project = new Project();
        project.setProjectName(request.projectName());
        project.setDescription(request.description());
        project.setProjectType(request.projectType());
        project.setOwner(owner);
        return repository.save(project);
    }

    @GetMapping("/{id}")
    public Project getById(@PathVariable Long id, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        Project project = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Project not found"));

        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (!isStaff) {
            if (project.getOwner() == null || !project.getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Access denied: you do not own this project");
            }
        }

        return project;
    }

    @GetMapping
    public List<Project> getAll(Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (isStaff) {
            return repository.findAll();
        }

        return repository.findByOwnerEmail(auth.getName());
    }

    @GetMapping("/{id}/tasks")
    public List<TaskResponse> getProjectTasks(@PathVariable Long id, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        Project project = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (!isStaff) {
            if (project.getOwner() == null || !project.getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this project");
            }
        }

        if (taskRepository == null) {
            return List.of();
        }

        return taskRepository.findByProjectId(id).stream()
            .map(TaskResponse::from)
            .toList();
    }

    @GetMapping("/{id}/predictions")
    public List<PredictionResultResponse> getProjectPredictions(
            @PathVariable Long id,
            Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        Project project = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (!isStaff) {
            if (project.getOwner() == null || !project.getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this project");
            }
        }

        if (predictionRepository == null) {
            return List.of();
        }

        return predictionRepository.findByProjectIdOrderByCreatedAtDesc(id).stream()
            .map(PredictionResultResponse::from)
            .toList();
    }

    public record ReviewRequest(String status, String feedback) {
        public ReviewRequest(String status) {
            this(status, null);
        }
    }

    public Project review(Long id, ReviewRequest request) {
        return review(id, request, null);
    }

    @PutMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('FACULTY', 'COORDINATOR')")
    public Project review(
        @PathVariable Long id,
        @RequestBody ReviewRequest request,
        Authentication authentication
    ) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Project project = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Project not found"));

        if (request.status() == null ||
            !(request.status().equalsIgnoreCase("APPROVED") ||
              request.status().equalsIgnoreCase("REJECTED"))) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Status must be APPROVED or REJECTED");
        }

        project.setStatus(request.status().toUpperCase());
        if (request.feedback() != null && !request.feedback().isBlank()) {
            project.setReviewFeedback(request.feedback().trim());
        }
        if (auth != null) {
            project.setReviewedBy(auth.getName());
        }
        project.setReviewedAt(java.time.LocalDateTime.now());
        return repository.save(project);
    }

    public record ProgressUpdateRequest(int progress) {}

    @PutMapping("/{id}/progress")
    public Project updateProgress(
        @PathVariable Long id,
        @RequestBody ProgressUpdateRequest request,
        Authentication authentication
    ) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        if (request.progress() < 0 || request.progress() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Progress must be between 0 and 100");
        }

        Project project = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        boolean isCoordinator = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_COORDINATOR"));
        boolean isFaculty = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY"));
        boolean isOwner = project.getOwner() != null && project.getOwner().getEmail().equalsIgnoreCase(auth.getName());
        boolean isAssignedGuide = project.getFacultyGuide() != null && project.getFacultyGuide().getEmail().equalsIgnoreCase(auth.getName());

        if (!isCoordinator && !isOwner && !(isFaculty && isAssignedGuide)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not have permission to update progress for this project");
        }

        project.setProgress(request.progress());
        return repository.save(project);
    }

    public record AssignGuideRequest(Long facultyId) {}

    @PutMapping("/{id}/assign-guide")
    @PreAuthorize("hasRole('COORDINATOR')")
    public Project assignGuide(
        @PathVariable Long id,
        @RequestBody AssignGuideRequest request,
        Authentication authentication
    ) {
        Project project = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        if (request.facultyId() == null) {
            project.setFacultyGuide(null);
        } else {
            if (userRepository == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "User repository unavailable");
            }
            User faculty = userRepository.findById(request.facultyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Faculty user not found"));

            if (faculty.getRole() != Role.FACULTY) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user must have the FACULTY role");
            }
            project.setFacultyGuide(faculty);
        }

        return repository.save(project);
    }

    public record FollowUpRequest(String notes) {}

    @PutMapping("/{id}/follow-up")
    @PreAuthorize("hasRole('COORDINATOR')")
    public Project updateFollowUp(
        @PathVariable Long id,
        @RequestBody FollowUpRequest request,
        Authentication authentication
    ) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Project project = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        project.setCoordinatorNotes(request.notes() != null ? request.notes().trim() : null);
        if (auth != null) {
            project.setCoordinatorNotesAuthor(auth.getName());
        }
        project.setCoordinatorNotesUpdatedAt(java.time.LocalDateTime.now());
        return repository.save(project);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        Project project = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        boolean isCoordinator = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_COORDINATOR"));
        boolean isFaculty = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY"));
        boolean isOwner = project.getOwner() != null && project.getOwner().getEmail().equalsIgnoreCase(auth.getName());
        boolean isAssignedGuide = project.getFacultyGuide() != null && project.getFacultyGuide().getEmail().equalsIgnoreCase(auth.getName());

        if (!isCoordinator && !isOwner && !(isFaculty && isAssignedGuide)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not have permission to delete this project");
        }

        // 1. Delete associated documents and clean up filesystem files safely
        if (documentRepository != null) {
            List<Document> docs = documentRepository.findByProjectId(id);
            for (Document doc : docs) {
                String storageKey = doc.getStorageKey();
                documentRepository.delete(doc);
                if (documentStorageService != null && storageKey != null && !storageKey.isBlank()) {
                    documentStorageService.deleteFile(storageKey);
                }
            }
        }

        // 2. Delete milestones
        if (milestoneRepository != null) {
            milestoneRepository.deleteAll(milestoneRepository.findByProjectId(id));
        }

        // 3. Delete team members
        if (teamMemberRepository != null) {
            teamMemberRepository.deleteAll(teamMemberRepository.findByProjectId(id));
        }

        // 4. Delete tasks
        if (taskRepository != null) {
            taskRepository.deleteAll(taskRepository.findByProjectId(id));
        }

        // 5. Delete predictions
        if (predictionRepository != null) {
            predictionRepository.deleteAll(predictionRepository.findByProjectIdOrderByCreatedAtDesc(id));
        }

        // 6. Delete project
        repository.delete(project);
    }
}
