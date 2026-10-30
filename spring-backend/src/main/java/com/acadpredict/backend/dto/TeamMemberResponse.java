package com.acadpredict.backend.dto;

import com.acadpredict.backend.entity.TeamMember;

public record TeamMemberResponse(
    Long id,
    String name,
    String email,
    String role,
    String status,
    boolean isLeader,
    boolean isSelf,
    Long projectId,
    Long userId
) {
    public TeamMemberResponse(Long id, String name, String email, String role, String status, boolean isLeader, boolean isSelf, Long projectId) {
        this(id, name, email, role, status, isLeader, isSelf, projectId, null);
    }

    public static TeamMemberResponse from(TeamMember member, boolean isSelf) {
        return from(member, isSelf, null);
    }

    public static TeamMemberResponse from(TeamMember member, boolean isSelf, Long userId) {
        if (member == null) return null;
        return new TeamMemberResponse(
            member.getId(),
            member.getName(),
            member.getEmail(),
            member.getRole(),
            member.getStatus(),
            false,
            isSelf,
            member.getProject() != null ? member.getProject().getId() : null,
            userId
        );
    }
}
