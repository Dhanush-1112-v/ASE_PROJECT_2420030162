import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/layout/StudentLayout';
import { projectsApi, teamApi } from '../../services/api';
import './MyTeam.css';

/**
 * MyTeam Component
 * Route: /student/team
 * Displays real team members and allows adding/removing team members via backend API.
 */
function MyTeam() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [notification, setNotification] = useState(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: '' });

  // Load all projects owned by student
  useEffect(() => {
    let mounted = true;
    async function loadProjects() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await projectsApi.getAll();
        if (mounted) {
          const valid = Array.isArray(list) ? list : [];
          setProjects(valid);
          if (valid.length > 0) {
            setSelectedProjectId(valid[0].id);
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load projects.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadProjects();
    return () => { mounted = false; };
  }, []);

  // Fetch real team members whenever selected project changes
  const fetchTeamMembers = useCallback(async (projectId) => {
    if (!projectId) {
      setMembers([]);
      return;
    }
    setIsLoadingMembers(true);
    setError(null);
    try {
      const data = await teamApi.getByProject(projectId);
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load team members.');
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedProjectId) {
        fetchTeamMembers(selectedProjectId);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedProjectId, fetchTeamMembers]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      setModalError('Please enter both student name and valid email.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      const added = await teamApi.addMember(selectedProjectId, {
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        role: inviteForm.role ? inviteForm.role.trim() : 'Team Member',
      });

      setShowInviteModal(false);
      setInviteForm({ name: '', email: '', role: '' });
      setNotification(`"${added.name}" has been successfully added to the project team.`);
      setTimeout(() => setNotification(null), 4000);
      fetchTeamMembers(selectedProjectId);
    } catch (err) {
      setModalError(err.message || 'Failed to add team member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!selectedProjectId) return;
    const confirmRemove = window.confirm(
      `Are you sure you want to remove ${memberName} from the project team?`
    );
    if (!confirmRemove) return;

    try {
      await teamApi.removeMember(selectedProjectId, memberId);
      setNotification(`${memberName} has been removed from the team.`);
      setTimeout(() => setNotification(null), 4000);
      fetchTeamMembers(selectedProjectId);
    } catch (err) {
      alert(err.message || 'Failed to remove team member.');
    }
  };

  return (
    <StudentLayout pageTitle="My Team">
      <div className="team-page">
        {/* Header Row */}
        <div className="team-header-row">
          <div>
            <h1 className="team-heading">Project Team &amp; Collaboration</h1>
            <p className="team-subheading">
              Manage team members, assign module responsibilities, and monitor peer collaboration.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {projects.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Project:</label>
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    maxWidth: '280px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    outline: 'none',
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName} (#{p.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedProjectId && (
              <button
                type="button"
                className="btn-invite-member"
                onClick={() => {
                  setModalError(null);
                  setShowInviteModal(true);
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="btn-icon">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
                <span>Add Team Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="alert-banner alert-success" style={{ background: '#DEF7EC', color: '#03543F', border: '1px solid #31C48D', padding: '12px 16px', borderRadius: '8px' }}>
            <span>✓ {notification}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="alert-banner alert-error" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #F87171', padding: '12px 16px', borderRadius: '8px' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Empty State: No Projects */}
        {!isLoading && projects.length === 0 && (
          <div className="card" style={{ padding: '48px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
            <h3 style={{ fontSize: '18px', color: '#111827', marginBottom: '8px' }}>No Active Project Found</h3>
            <p style={{ color: '#6B7280', marginBottom: '20px', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px auto' }}>
              Team membership is associated with academic projects. Please create a project first before adding team collaborators.
            </p>
            <button
              type="button"
              className="btn-create-project"
              onClick={() => navigate('/student/projects')}
            >
              Create Academic Project &rarr;
            </button>
          </div>
        )}

        {/* Team Overview Card */}
        {selectedProject && (
          <div className="card team-meta-card">
            <div className="team-meta-header">
              <div>
                <span className="team-code-tag">Project #{selectedProject.id}</span>
                <h2 className="team-display-name">{selectedProject.projectName}</h2>
                <p className="team-project-title">Domain: {selectedProject.projectType || 'Academic Project'}</p>
              </div>
              <div className="team-stat-badge">
                <span className="badge-count">{members.length}</span>
                <span className="badge-label">Active Collaborators</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading Members State */}
        {isLoadingMembers && (
          <div style={{ textAlign: 'center', padding: '36px', color: '#6B7280' }}>
            <p>Loading project team members from database...</p>
          </div>
        )}

        {/* Members Grid */}
        {!isLoadingMembers && selectedProject && (
          <div className="members-grid">
            {members.map((member) => (
              <div key={member.id} className="member-card card">
                <div className="member-card-head">
                  <div className="member-avatar-box">
                    <span>{member.name ? member.name.charAt(0).toUpperCase() : 'U'}</span>
                  </div>
                  <div className="member-id-info">
                    <div className="member-name-row">
                      <h4 className="member-full-name">{member.name}</h4>
                      {member.isLeader && <span className="leader-badge">Project Lead</span>}
                      {member.isSelf && <span className="you-badge">You</span>}
                    </div>
                    <span className="member-role-title">{member.role}</span>
                  </div>
                </div>

                <div className="member-card-body">
                  <div className="member-detail-line">
                    <span className="detail-key">Email:</span>
                    <span className="detail-val">{member.email}</span>
                  </div>
                  <div className="member-detail-line">
                    <span className="detail-key">Status:</span>
                    <span className="status-pill status-completed">{member.status || 'Active'}</span>
                  </div>
                </div>

                <div className="member-card-foot">
                  {!member.isLeader ? (
                    <button
                      type="button"
                      className="btn-remove-member"
                      onClick={() => handleRemoveMember(member.id, member.name)}
                    >
                      Remove Member
                    </button>
                  ) : (
                    <span className="self-locked-note">Primary Account Lead &amp; Project Owner</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add Team Member */}
        {showInviteModal && (
          <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
            <div className="modal-dialog modal-form" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Add Team Member to {selectedProject?.projectName}</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowInviteModal(false)}
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div style={{ margin: '14px 24px 0', padding: '10px 14px', background: '#FEE2E2', color: '#991B1B', borderRadius: '6px', fontSize: '13px' }}>
                  ⚠️ {modalError}
                </div>
              )}

              <div style={{ margin: '14px 24px 0', padding: '12px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '13px', color: '#1E40AF', lineHeight: '1.4' }}>
                ℹ️ <strong>Account Required:</strong> Collaborators must already have a registered AcadPredict account with their institutional email. Adding a member immediately attaches them to this project.
              </div>

              <form onSubmit={handleInviteSubmit} className="modal-form-body">
                <div className="form-group-item">
                  <label>Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group-item">
                  <label>College Institutional Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group-item">
                  <label>Project Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Developer, QA Engineer, ML Specialist"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="modal-foot-actions">
                  <button
                    type="button"
                    className="btn-secondary-btn"
                    onClick={() => setShowInviteModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Adding to Project...' : 'Add Team Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

export default MyTeam;
