package com.acadpredict.backend.controller;

import com.acadpredict.backend.dto.TeamMemberRequest;
import com.acadpredict.backend.dto.TeamMemberResponse;
import com.acadpredict.backend.entity.Project;
import com.acadpredict.backend.entity.TeamMember;
import com.acadpredict.backend.entity.User;
import com.acadpredict.backend.repository.ProjectRepository;
import com.acadpredict.backend.repository.TeamMemberRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/team")
public class TeamController {

    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;
    private final com.acadpredict.backend.repository.UserRepository userRepository;

    @org.springframework.beans.factory.annotation.Autowired
    public TeamController(
            TeamMemberRepository teamMemberRepository,
            ProjectRepository projectRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
            com.acadpredict.backend.repository.UserRepository userRepository) {
        this.teamMemberRepository = teamMemberRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    public TeamController(TeamMemberRepository teamMemberRepository, ProjectRepository projectRepository) {
        this(teamMemberRepository, projectRepository, null);
    }

    private Project getProjectWithAccess(Long projectId, Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        boolean isStaff = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_FACULTY") || a.getAuthority().equals("ROLE_COORDINATOR"));
        if (!isStaff) {
            if (project.getOwner() == null || !project.getOwner().getEmail().equalsIgnoreCase(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: you do not own this project");
            }
        }
        return project;
    }

    @GetMapping
    public List<TeamMemberResponse> getTeamMembers(@PathVariable Long projectId, Authentication authentication) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Project project = getProjectWithAccess(projectId, auth);

        List<TeamMemberResponse> list = new ArrayList<>();
        // Add project owner as primary leader
        User owner = project.getOwner();
        if (owner != null) {
            boolean isOwnerSelf = owner.getEmail().equalsIgnoreCase(auth.getName());
            list.add(new TeamMemberResponse(
                owner.getId(),
                owner.getName() != null ? owner.getName() : "Team Lead",
                owner.getEmail(),
                "Project Lead & Owner",
                "Active",
                true,
                isOwnerSelf,
                projectId,
                owner.getId()
            ));
        }

        // Add registered team members
        List<TeamMember> members = teamMemberRepository.findByProjectId(projectId);
        for (TeamMember m : members) {
            boolean isMemberSelf = m.getEmail().equalsIgnoreCase(auth.getName());
            Long memberUserId = null;
            if (userRepository != null && m.getEmail() != null) {
                memberUserId = userRepository.findByEmail(m.getEmail().toLowerCase())
                    .map(User::getId)
                    .orElse(null);
            }
            list.add(TeamMemberResponse.from(m, isMemberSelf, memberUserId));
        }

        return list;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamMemberResponse addTeamMember(
        @PathVariable Long projectId,
        @RequestBody TeamMemberRequest request,
        Authentication authentication
    ) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        Project project = getProjectWithAccess(projectId, auth);

        if (request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Member name is required");
        }
        if (request.email() == null || request.email().isBlank() || !request.email().contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid institutional email is required");
        }

        String normalizedEmail = request.email().trim().toLowerCase();
        if (project.getOwner() != null && project.getOwner().getEmail().equalsIgnoreCase(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The project owner is already a team member");
        }
        if (teamMemberRepository.existsByProjectIdAndEmail(projectId, normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A member with this email is already in the project");
        }

        TeamMember member = new TeamMember();
        member.setName(request.name().trim());
        member.setEmail(normalizedEmail);
        member.setRole((request.role() != null && !request.role().isBlank()) ? request.role().trim() : "Team Member");
        member.setStatus("Active");
        member.setProject(project);

        TeamMember saved = teamMemberRepository.save(member);
        boolean isSelf = saved.getEmail().equalsIgnoreCase(auth.getName());
        return TeamMemberResponse.from(saved, isSelf);
    }

    @DeleteMapping("/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeTeamMember(
        @PathVariable Long projectId,
        @PathVariable Long memberId,
        Authentication authentication
    ) {
        Authentication auth = (authentication != null) ? authentication : SecurityContextHolder.getContext().getAuthentication();
        getProjectWithAccess(projectId, auth);

        TeamMember member = teamMemberRepository.findById(memberId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team member not found"));

        if (!member.getProject().getId().equals(projectId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Member does not belong to this project");
        }

        teamMemberRepository.delete(member);
    }
}
