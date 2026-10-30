package com.acadpredict.backend.controller;

import com.acadpredict.backend.dto.TaskRequest;
import com.acadpredict.backend.dto.TaskResponse;
import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.entity.Task;
import com.acadpredict.backend.repository.ProjectRepository;
import com.acadpredict.backend.repository.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskRepository repository;
    private final ProjectRepository projectRepository;
    private final com.acadpredict.backend.repository.UserRepository userRepository;
    private final com.acadpredict.backend.repository.TeamMemberRepository teamMemberRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public TaskController(
            TaskRepository repository,
            ProjectRepository projectRepository,
            com.acadpredict.backend.repository.UserRepository userRepository,
            com.acadpredict.backend.repository.TeamMemberRepository teamMemberRepository) {
        this.repository = repository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.teamMemberRepository = teamMemberRepository;
    }

    public TaskController(TaskRepository repository, ProjectRepository projectRepository) {
        this(repository, projectRepository, null, null);
    }

    public TaskController(TaskRepository repository) {
        this(repository, null, null, null);
    }

    private com.acadpredict.backend.entity.User resolveAssignee(Long assignedToId, Project project) {
        if (assignedToId == null || assignedToId == 0) {
            return null;
        }
        com.acadpredict.backend.entity.User assignee = null;
        if (assignedToId == -1L || (project != null && project.getOwner() != null && project.getOwner().getId().equals(assignedToId))) {
            assignee = project.getOwner();
        } else if (userRepository != null) {
            assignee = userRepository.findById(assignedToId).orElse(null);
            if (assignee == null && teamMemberRepository != null) {
                com.acadpredict.backend.entity.TeamMember tm = teamMemberRepository.findById(assignedToId).orElse(null);
                if (tm != null && tm.getEmail() != null) {
                    assignee = userRepository.findByEmail(tm.getEmail().toLowerCase()).orElse(null);
                }
            }
        }

        if (assignee == null) {
            if (project != null && project.getOwner() != null && project.getOwner().getId().equals(assignedToId)) {
                assignee = project.getOwner();
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned user not found");
            }
        }

        if (project != null) {
            boolean isOwner = project.getOwner() != null && project.getOwner().getId().equals(assignee.getId());
            boolean isMember = (teamMemberRepository != null) &&
                teamMemberRepository.existsByProjectIdAndEmail(project.getId(), assignee.getEmail().toLowerCase());
            if (!isOwner && !isMember) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned user is not a member of this project");
            }
        }
        return assignee;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(@RequestBody TaskRequest request, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task title is required");
        }
        if (request.projectId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project ID is required");
        }

        Project project = (projectRepository != null)
            ? projectRepository.findById(request.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"))
            : null;

        if (project == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }

        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (!isStaff) {
            if (project.getOwner() == null || !project.getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this project");
            }
        }

        Task task = new Task();
        task.setTitle(request.title().trim());
        task.setDescription(request.description());
        if (request.priority() != null && !request.priority().isBlank()) {
            String p = request.priority().trim().toUpperCase();
            if (!List.of("LOW", "MEDIUM", "HIGH", "CRITICAL").contains(p)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Priority must be LOW, MEDIUM, HIGH, or CRITICAL");
            }
            task.setPriority(p);
        } else {
            task.setPriority("MEDIUM");
        }
        task.setDueDate(request.dueDate());
        task.setStatus("PENDING");
        task.setProgress(0);
        task.setProject(project);

        if (request.assignedToId() != null) {
            com.acadpredict.backend.entity.User assignee = resolveAssignee(request.assignedToId(), project);
            task.setAssignedTo(assignee);
        }

        Task saved = repository.save(task);
        return TaskResponse.from(saved);
    }

    @GetMapping("/{id}")
    public TaskResponse getById(@PathVariable Long id, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        Task task = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (!isStaff) {
            if (task.getProject() == null || task.getProject().getOwner() == null ||
                !task.getProject().getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this task");
            }
        }

        return TaskResponse.from(task);
    }

    @GetMapping("/project/{projectId}")
    public List<TaskResponse> getByProject(@PathVariable Long projectId, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        Project project = (projectRepository != null)
            ? projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"))
            : null;

        if (project == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }

        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (!isStaff) {
            if (project.getOwner() == null || !project.getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this project");
            }
        }

        return repository.findByProjectId(projectId).stream()
            .map(TaskResponse::from)
            .toList();
    }

    public record TaskUpdate(
        Integer progress,
        String title,
        String description,
        String priority,
        String dueDate,
        String status,
        Long assignedToId
    ) {
        public TaskUpdate(int progress) {
            this(progress, null, null, null, null, null, null);
        }
        public TaskUpdate(Integer progress, String title, String description, String priority, String dueDate, String status) {
            this(progress, title, description, priority, dueDate, status, null);
        }
    }

    @PutMapping("/{id}")
    public TaskResponse update(@PathVariable Long id,
                               @RequestBody TaskUpdate request,
                               Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        if (request.progress() != null && (request.progress() < 0 || request.progress() > 100)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Progress must be between 0 and 100");
        }

        Task task = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Task not found"));

        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (!isStaff) {
            if (task.getProject() == null || task.getProject().getOwner() == null ||
                !task.getProject().getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this task");
            }
        }

        if (request.title() != null && !request.title().isBlank()) {
            task.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            task.setDescription(request.description());
        }
        if (request.priority() != null && !request.priority().isBlank()) {
            String p = request.priority().trim().toUpperCase();
            if (!List.of("LOW", "MEDIUM", "HIGH", "CRITICAL").contains(p)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Priority must be LOW, MEDIUM, HIGH, or CRITICAL");
            }
            task.setPriority(p);
        }
        if (request.dueDate() != null) {
            task.setDueDate(request.dueDate());
        }

        if (request.assignedToId() != null) {
            com.acadpredict.backend.entity.User assignee = resolveAssignee(request.assignedToId(), task.getProject());
            task.setAssignedTo(assignee);
        }

        if (request.progress() != null) {
            task.setProgress(request.progress());
            if (request.status() == null) {
                task.setStatus(request.progress() == 100 ? "COMPLETED" :
                    request.progress() == 0 ? "PENDING" : "IN_PROGRESS");
            }
        }

        if (request.status() != null && !request.status().isBlank()) {
            task.setStatus(request.status().trim().toUpperCase());
        }

        Task saved = repository.save(task);
        return TaskResponse.from(saved);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        Task task = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));

        if (!isStaff) {
            if (task.getProject() == null || task.getProject().getOwner() == null ||
                !task.getProject().getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this task");
            }
        }

        repository.delete(task);
    }
}
