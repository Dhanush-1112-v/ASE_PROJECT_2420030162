package com.acadpredict.backend.controller;

import com.acadpredict.backend.dto.CreateUserRequest;
import com.acadpredict.backend.dto.UserResponse;
import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.entity.Role;
import com.acadpredict.backend.entity.TeamMember;
import com.acadpredict.backend.entity.User;
import com.acadpredict.backend.repository.ProjectRepository;
import com.acadpredict.backend.repository.TeamMemberRepository;
import com.acadpredict.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(
            UserRepository userRepository,
            ProjectRepository projectRepository,
            TeamMemberRepository teamMemberRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('FACULTY', 'COORDINATOR')")
    public UserResponse createUser(
            @Valid @RequestBody CreateUserRequest request,
            Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        boolean isCoordinator = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_COORDINATOR"));
        boolean isFaculty = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY"));

        Role targetRole = request.role() != null ? request.role() : Role.STUDENT;

        if (isFaculty && !isCoordinator) {
            if (targetRole != Role.STUDENT) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Faculty members are only authorized to create Student accounts");
            }
        } else if (isCoordinator) {
            if (targetRole != Role.STUDENT && targetRole != Role.FACULTY) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Coordinators can only create Student or Faculty accounts");
            }
        }

        String normalizedEmail = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(targetRole);

        User savedUser = userRepository.save(user);

        // Optional project assignment if requested and authorized
        if (request.assignProjectId() != null && projectRepository != null) {
            Project project = projectRepository.findById(request.assignProjectId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target project not found"));

            if (isFaculty && !isCoordinator) {
                boolean isSupervisor = project.getFacultyGuide() != null &&
                        project.getFacultyGuide().getEmail().equalsIgnoreCase(auth.getName());
                if (!isSupervisor) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN, "Faculty can only assign students to projects they supervise");
                }
            }

            if (teamMemberRepository != null && !teamMemberRepository.existsByProjectIdAndEmail(project.getId(), normalizedEmail)) {
                TeamMember member = new TeamMember();
                member.setName(savedUser.getName());
                member.setEmail(normalizedEmail);
                member.setRole("Team Member");
                member.setStatus("Active");
                member.setProject(project);
                teamMemberRepository.save(member);
            }
        }

        return UserResponse.from(savedUser);
    }

    @GetMapping("/faculty")
    @PreAuthorize("hasAnyRole('FACULTY', 'COORDINATOR')")
    public List<UserResponse> getFacultyMembers() {
        return userRepository.findByRole(Role.FACULTY).stream()
                .map(UserResponse::from)
                .toList();
    }

    @GetMapping("/students")
    @PreAuthorize("hasAnyRole('FACULTY', 'COORDINATOR')")
    public List<UserResponse> getStudents() {
        return userRepository.findByRole(Role.STUDENT).stream()
                .map(UserResponse::from)
                .toList();
    }
}
