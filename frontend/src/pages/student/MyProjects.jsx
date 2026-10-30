import React, { useState, useEffect, useCallback } from 'react';
import StudentLayout from '../../components/layout/StudentLayout';
import { projectsApi, usersApi, getStoredUser } from '../../services/api';
import './MyProjects.css';

/**
 * MyProjects Component
 * Route: /student/projects
 * Role-aware project management supporting:
 *  - Filter tabs (All, Pending Review, Approved, Rejected, Assigned to Me)
 *  - Persistent progress editing (0-100%)
 *  - Coordinator faculty guide assignment
 *  - Role-gated project deletion with typed-title confirmation
 *  - Review feedback and proposal approval
 */
function MyProjects() {
  const user = getStoredUser() || {};
  const rawRole = (user.role || '').replace(/^ROLE_/, '').toUpperCase();
  const isFaculty = rawRole === 'FACULTY';
  const isCoordinator = rawRole === 'COORDINATOR';
  const isStudent = !isFaculty && !isCoordinator;
  const isStaff = isFaculty || isCoordinator;

  const [projects, setProjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Tab Filtering
  const [activeTab, setActiveTab] = useState(isFaculty ? 'ASSIGNED' : 'ALL');

  // Modals
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Project Form
  const [newProject, setNewProject] = useState({
    name: '',
    domain: 'AI',
    guide: '',
    teamName: '',
    description: '',
  });

  // Progress Update Modal
  const [progressModalProject, setProgressModalProject] = useState(null);
  const [newProgressValue, setNewProgressValue] = useState(0);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [progressError, setProgressError] = useState('');

  // Delete Project Modal (Safe Hard-Delete with Title Confirmation)
  const [deleteModalProject, setDeleteModalProject] = useState(null);
  const [confirmTitleInput, setConfirmTitleInput] = useState('');
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Assign Guide Modal (Coordinator)
  const [assignGuideProject, setAssignGuideProject] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [isAssigningGuide, setIsAssigningGuide] = useState(false);

  // Review Proposal Modal (Staff)
  const [reviewModalProject, setReviewModalProject] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [reviewFeedbackText, setReviewFeedbackText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const projectTypeOptions = [
    { value: 'AI', label: 'Artificial Intelligence & Machine Learning (AI)' },
    { value: 'Web', label: 'Web & Full-Stack Application (Web)' },
    { value: 'Mobile', label: 'Mobile Application Development (Mobile)' },
    { value: 'IoT', label: 'Internet of Things & Embedded Systems (IoT)' },
    { value: 'Research', label: 'Academic & Applied Research (Research)' },
  ];

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectsApi.getAll();
      setProjects(Array.isArray(data) ? data : []);

      if (isCoordinator || isFaculty) {
        try {
          const faculty = await usersApi.getFaculty();
          setFacultyList(Array.isArray(faculty) ? faculty : []);
        } catch {
          setFacultyList([]);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch projects from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [isCoordinator, isFaculty]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  // Create Project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      alert('Please provide a project name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullDesc = [
        newProject.description ? newProject.description.trim() : '',
        newProject.guide ? `Faculty Guide: ${newProject.guide.trim()}` : '',
        newProject.teamName ? `Team: ${newProject.teamName.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const created = await projectsApi.create({
        projectName: newProject.name.trim(),
        description: fullDesc,
        projectType: newProject.domain || 'AI',
      });

      setShowCreateModal(false);
      setNewProject({ name: '', domain: 'AI', guide: '', teamName: '', description: '' });
      showToast(`Project "${created.projectName}" successfully created in MySQL!`);
      fetchProjects();
    } catch (err) {
      alert(err.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Progress
  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!progressModalProject) return;
    const val = Number(newProgressValue);
    if (isNaN(val) || val < 0 || val > 100) {
      setProgressError('Progress must be an integer between 0 and 100.');
      return;
    }

    setIsUpdatingProgress(true);
    setProgressError('');
    try {
      const updated = await projectsApi.updateProgress(progressModalProject.id, val);
      setProgressModalProject(null);
      showToast(`Project "${updated.projectName}" progress updated to ${updated.progress}%.`);
      fetchProjects();
    } catch (err) {
      setProgressError(err.message || 'Failed to update progress.');
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Hard Delete Project with typed confirmation
  const handleExecuteDelete = async (e) => {
    e.preventDefault();
    if (!deleteModalProject) return;
    if (confirmTitleInput.trim() !== deleteModalProject.projectName.trim()) {
      setDeleteError('Project title does not match. Please type the exact title.');
      return;
    }

    setIsDeletingProject(true);
    setDeleteError('');
    try {
      await projectsApi.delete(deleteModalProject.id);
      showToast(`Project "${deleteModalProject.projectName}" was permanently deleted.`);
      setDeleteModalProject(null);
      setConfirmTitleInput('');
      if (selectedProject?.id === deleteModalProject.id) {
        setSelectedProject(null);
      }
      fetchProjects();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete project. Please check authorization.');
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Assign Guide (Coordinator)
  const handleSaveAssignGuide = async (e) => {
    e.preventDefault();
    if (!assignGuideProject) return;
    setIsAssigningGuide(true);
    try {
      const updated = await projectsApi.assignGuide(assignGuideProject.id, selectedFacultyId ? Number(selectedFacultyId) : null);
      setAssignGuideProject(null);
      showToast(`Faculty guide allocated to "${updated.projectName}".`);
      fetchProjects();
    } catch (err) {
      alert(err.message || 'Failed to assign faculty guide.');
    } finally {
      setIsAssigningGuide(false);
    }
  };

  // Review Proposal (Staff)
  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewModalProject) return;
    setIsSubmittingReview(true);
    try {
      const updated = await projectsApi.review(reviewModalProject.id, reviewStatus, reviewFeedbackText);
      setReviewModalProject(null);
      setReviewFeedbackText('');
      showToast(`Proposal #${updated.id} status updated to ${updated.status}.`);
      if (selectedProject?.id === updated.id) {
        setSelectedProject(updated);
      }
      fetchProjects();
    } catch (err) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Tab Filtering Logic
  const filteredProjects = projects.filter((p) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return p.status === 'PENDING' || p.status === 'PENDING_REVIEW';
    if (activeTab === 'APPROVED') return p.status === 'APPROVED';
    if (activeTab === 'REJECTED') return p.status === 'REJECTED';
    if (activeTab === 'ASSIGNED') {
      return p.facultyGuideId === user.id || p.facultyGuideEmail === user.email;
    }
    return true;
  });

  // Check authorization to edit progress
  const canUpdateProgress = (proj) => {
    if (isCoordinator) return true;
    if (isFaculty) {
      return proj.facultyGuideId === user.id || proj.facultyGuideEmail === user.email;
    }
    return proj.owner?.email === user.email || proj.ownerId === user.id;
  };

  // Check authorization to delete project
  const canDeleteProject = (proj) => {
    if (isCoordinator) return true;
    if (isFaculty) {
      return proj.facultyGuideId === user.id || proj.facultyGuideEmail === user.email;
    }
    return proj.owner?.email === user.email || proj.ownerId === user.id;
  };

  return (
    <StudentLayout pageTitle="My Projects">
      <div className="projects-page">
        {/* Header Bar */}
        <div className="page-header-row">
          <div>
            <h1 className="page-main-heading">
              {isCoordinator ? 'Department Projects Repository' : isFaculty ? 'Supervised & Department Projects' : 'My Projects'}
            </h1>
            <p className="page-main-subtitle">
              {isCoordinator
                ? 'Department-wide project repository, faculty allocation, proposal reviews, and progress tracking.'
                : isFaculty
                ? 'Academic capstones and mini-projects assigned for supervision and departmental proposal evaluation.'
                : 'Manage your academic capstone, track persistent progress, and monitor approval status.'}
            </p>
          </div>
          {isStudent && (
            <button type="button" className="btn-create-project" onClick={() => setShowCreateModal(true)}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="btn-icon">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Create Project</span>
            </button>
          )}
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="alert-banner alert-success" style={{ background: '#DEF7EC', color: '#03543F', border: '1px solid #31C48D', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
            <span>✓ {notification}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="alert-banner alert-error" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #F87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
            <span>⚠️ {error}</span>
            <button type="button" onClick={fetchProjects} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#1E40AF', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}>
              Retry
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', paddingBottom: '10px', marginBottom: '20px', overflowX: 'auto' }}>
          {isFaculty && (
            <button
              type="button"
              onClick={() => setActiveTab('ASSIGNED')}
              style={{
                background: activeTab === 'ASSIGNED' ? '#2563EB' : 'transparent',
                color: activeTab === 'ASSIGNED' ? '#FFFFFF' : '#475569',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              Assigned to Me ({projects.filter((p) => p.facultyGuideId === user.id || p.facultyGuideEmail === user.email).length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            style={{
              background: activeTab === 'ALL' ? '#2563EB' : 'transparent',
              color: activeTab === 'ALL' ? '#FFFFFF' : '#475569',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13.5px',
              cursor: 'pointer',
            }}
          >
            All Projects ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            style={{
              background: activeTab === 'PENDING' ? '#2563EB' : 'transparent',
              color: activeTab === 'PENDING' ? '#FFFFFF' : '#475569',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13.5px',
              cursor: 'pointer',
            }}
          >
            Pending Review ({projects.filter((p) => p.status === 'PENDING' || p.status === 'PENDING_REVIEW').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('APPROVED')}
            style={{
              background: activeTab === 'APPROVED' ? '#2563EB' : 'transparent',
              color: activeTab === 'APPROVED' ? '#FFFFFF' : '#475569',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13.5px',
              cursor: 'pointer',
            }}
          >
            Approved ({projects.filter((p) => p.status === 'APPROVED').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REJECTED')}
            style={{
              background: activeTab === 'REJECTED' ? '#2563EB' : 'transparent',
              color: activeTab === 'REJECTED' ? '#FFFFFF' : '#475569',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13.5px',
              cursor: 'pointer',
            }}
          >
            Rejected ({projects.filter((p) => p.status === 'REJECTED').length})
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: '#6B7280' }}>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#1E40AF', marginBottom: '8px' }}>Loading projects...</div>
            <p>Fetching academic project records from MySQL database.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredProjects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 20px', background: '#FFFFFF', borderRadius: '12px', border: '1px dashed #D1D5DB', margin: '20px 0' }}>
            <h3 style={{ fontSize: '20px', color: '#111827', marginBottom: '8px' }}>No projects found</h3>
            <p style={{ color: '#6B7280', maxWidth: '480px', margin: '0 auto 24px auto', fontSize: '14px' }}>
              {activeTab === 'ASSIGNED'
                ? 'No projects are currently allocated to you for supervision.'
                : 'No projects match the selected tab filter.'}
            </p>
            {isStudent && (
              <button type="button" className="btn-create-project" onClick={() => setShowCreateModal(true)}>
                + Create Your First Project
              </button>
            )}
          </div>
        )}

        {/* Projects Cards Grid */}
        {!isLoading && filteredProjects.length > 0 && (
          <div className="projects-list-grid">
            {filteredProjects.map((proj) => (
              <div key={proj.id} className="project-item-card">
                <div className="project-card-top">
                  <div className="project-badge-row">
                    <span className="project-domain-tag">{proj.projectType || 'General'}</span>
                    <span
                      className={`status-pill ${
                        (proj.status || '').toUpperCase() === 'APPROVED'
                          ? 'status-completed'
                          : (proj.status || '').toUpperCase() === 'REJECTED'
                          ? 'status-rejected'
                          : 'status-pending'
                      }`}
                      style={{
                        background:
                          proj.status === 'APPROVED' ? '#D1FAE5' : proj.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                        color:
                          proj.status === 'APPROVED' ? '#065F46' : proj.status === 'REJECTED' ? '#991B1B' : '#92400E',
                      }}
                    >
                      {proj.status || 'PENDING_REVIEW'}
                    </span>
                  </div>
                  <h3 className="project-title-text">{proj.projectName}</h3>
                  <p className="project-desc-short">{proj.description || 'No description provided.'}</p>
                </div>

                <div className="project-info-grid">
                  <div className="info-cell">
                    <span className="info-label">Student Owner</span>
                    <span className="info-value guide-highlight">
                      {proj.owner?.name || 'Student'}
                    </span>
                  </div>
                  <div className="info-cell">
                    <span className="info-label">Faculty Guide</span>
                    <span
                      className="info-value"
                      style={{
                        color: proj.facultyGuideName ? '#047857' : '#DC2626',
                        fontWeight: 600,
                      }}
                    >
                      {proj.facultyGuideName || 'Not Assigned'}
                    </span>
                  </div>
                  <div className="info-cell">
                    <span className="info-label">Project ID</span>
                    <span className="info-value">#{proj.id}</span>
                  </div>
                  <div className="info-cell">
                    <span className="info-label">AI Delay Risk</span>
                    <span className="info-value">
                      {proj.delayRisk ? (
                        <strong
                          style={{
                            color:
                              proj.delayRisk === 'HIGH'
                                ? '#DC2626'
                                : proj.delayRisk === 'MEDIUM'
                                ? '#D97706'
                                : '#16A34A',
                          }}
                        >
                          {proj.delayRisk} ({Math.round((proj.riskProbability || 0) * 100)}%)
                        </strong>
                      ) : (
                        <em style={{ color: '#9CA3AF' }}>Not evaluated</em>
                      )}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Update Action */}
                <div className="project-progress-box">
                  <div className="progress-text-row">
                    <span>Progress</span>
                    <span className="progress-num">{proj.progress || 0}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, Math.max(0, proj.progress || 0))}%` }}
                    ></div>
                  </div>
                </div>

                {/* Review Feedback Preview (if present) */}
                {proj.reviewFeedback && (
                  <div style={{ margin: '10px 0', padding: '8px 12px', background: '#F0FDF4', borderRadius: '6px', fontSize: '12px', border: '1px solid #BBF7D0' }}>
                    <span style={{ fontWeight: 600, color: '#166534' }}>Reviewer ({proj.reviewedBy || 'Faculty'}): </span>
                    <span style={{ color: '#15803D', fontStyle: 'italic' }}>"{proj.reviewFeedback}"</span>
                  </div>
                )}

                {/* Coordinator Note Preview (if present) */}
                {proj.coordinatorNotes && (
                  <div style={{ margin: '10px 0', padding: '8px 12px', background: '#F8FAFC', borderRadius: '6px', fontSize: '12px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>Follow-up: </span>
                    <span style={{ color: '#475569' }}>"{proj.coordinatorNotes}"</span>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                  <button
                    type="button"
                    className="btn-view-details"
                    onClick={() => setSelectedProject(proj)}
                    style={{ flex: 1, minWidth: '100px', fontSize: '12px', padding: '6px 10px', textAlign: 'center' }}
                  >
                    View Details &rarr;
                  </button>

                  {canUpdateProgress(proj) && (
                    <button
                      type="button"
                      onClick={() => {
                        setProgressModalProject(proj);
                        setNewProgressValue(proj.progress || 0);
                        setProgressError('');
                      }}
                      style={{
                        background: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Update Progress
                    </button>
                  )}

                  {isCoordinator && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssignGuideProject(proj);
                        setSelectedFacultyId(proj.facultyGuideId ? String(proj.facultyGuideId) : '');
                      }}
                      style={{
                        background: '#D97706',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Assign Guide
                    </button>
                  )}

                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => {
                        setReviewModalProject(proj);
                        setReviewStatus(proj.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
                        setReviewFeedbackText(proj.reviewFeedback || '');
                      }}
                      style={{
                        background: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Review
                    </button>
                  )}

                  {canDeleteProject(proj) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModalProject(proj);
                        setConfirmTitleInput('');
                        setDeleteError('');
                      }}
                      style={{
                        background: 'transparent',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Permanently delete project"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =========================================================
            MODAL: VIEW DETAILS
            ========================================================= */}
        {selectedProject && (
          <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>{selectedProject.projectName}</h3>
                <button type="button" className="btn-close" onClick={() => setSelectedProject(null)}>✕</button>
              </div>
              <div className="modal-content-body">
                <div className="modal-meta-row">
                  <span className="status-pill status-progress">{selectedProject.status || 'PENDING_REVIEW'}</span>
                  <span className="domain-pill">{selectedProject.projectType || 'General'}</span>
                </div>
                <p className="modal-desc" style={{ whiteSpace: 'pre-line' }}>
                  {selectedProject.description || 'No description provided.'}
                </p>
                <div className="modal-detail-list">
                  <p><strong>Project ID:</strong> #{selectedProject.id}</p>
                  <p><strong>Owner:</strong> {selectedProject.owner?.name} ({selectedProject.owner?.email})</p>
                  <p><strong>Faculty Supervisor:</strong> {selectedProject.facultyGuideName ? `${selectedProject.facultyGuideName} (${selectedProject.facultyGuideEmail})` : 'Not Allocated Yet'}</p>
                  <p><strong>Domain:</strong> {selectedProject.projectType}</p>
                  <p><strong>Status:</strong> {selectedProject.status}</p>
                  <p><strong>Progress:</strong> {selectedProject.progress || 0}%</p>
                  <p>
                    <strong>AI Delay Risk:</strong>{' '}
                    {selectedProject.delayRisk ? (
                      <span>{selectedProject.delayRisk} (Confidence: {Math.round((selectedProject.riskProbability || 0) * 100)}%)</span>
                    ) : (
                      'Not evaluated yet.'
                    )}
                  </p>
                  {selectedProject.reviewFeedback && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#F0FDF4', borderRadius: '6px' }}>
                      <strong style={{ color: '#166534' }}>Review Feedback ({selectedProject.reviewedBy || 'Faculty'}):</strong>
                      <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', color: '#15803D' }}>"{selectedProject.reviewFeedback}"</p>
                    </div>
                  )}
                  {selectedProject.coordinatorNotes && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#F8FAFC', borderRadius: '6px' }}>
                      <strong style={{ color: '#0F172A' }}>Coordinator Follow-Up Note ({selectedProject.coordinatorNotesAuthor}):</strong>
                      <p style={{ margin: '4px 0 0 0', color: '#475569' }}>"{selectedProject.coordinatorNotes}"</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary-btn" onClick={() => setSelectedProject(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL: UPDATE PROGRESS (0-100%)
            ========================================================= */}
        {progressModalProject && (
          <div className="modal-overlay" onClick={() => setProgressModalProject(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div className="modal-head">
                <h3>Update Project Progress</h3>
                <button type="button" className="btn-close" onClick={() => setProgressModalProject(null)}>✕</button>
              </div>
              <form onSubmit={handleSaveProgress}>
                <div className="modal-content-body">
                  <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>
                    Updating completion percentage for <strong>{progressModalProject.projectName}</strong>.
                  </p>
                  {progressError && (
                    <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
                      ⚠️ {progressError}
                    </div>
                  )}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Progress Percentage:</label>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB' }}>{newProgressValue}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={newProgressValue}
                      onChange={(e) => setNewProgressValue(Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                      <span>0% (Not Started)</span>
                      <span>50% (Mid-term)</span>
                      <span>100% (Completed)</span>
                    </div>
                  </div>
                </div>
                <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary-btn" onClick={() => setProgressModalProject(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-create-project" disabled={isUpdatingProgress}>
                    {isUpdatingProgress ? 'Saving...' : 'Save Progress'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL: DELETE PROJECT (Typed confirmation)
            ========================================================= */}
        {deleteModalProject && (
          <div className="modal-overlay" onClick={() => setDeleteModalProject(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="modal-head" style={{ borderBottomColor: '#FEE2E2' }}>
                <h3 style={{ color: '#DC2626' }}>Delete Project Permanently</h3>
                <button type="button" className="btn-close" onClick={() => setDeleteModalProject(null)}>✕</button>
              </div>
              <form onSubmit={handleExecuteDelete}>
                <div className="modal-content-body">
                  <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '13.5px', color: '#9F1239', fontWeight: 600 }}>
                      ⚠️ Warning: This action cannot be undone.
                    </p>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#BE123C' }}>
                      Deleting this project will permanently remove its associated tasks, milestones, team associations, risk prediction history, and physical document files from disk storage.
                    </p>
                  </div>

                  {deleteError && (
                    <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
                      ⚠️ {deleteError}
                    </div>
                  )}

                  <p style={{ fontSize: '13.5px', color: '#374151', marginBottom: '8px' }}>
                    To confirm deletion, please type the exact project title below:
                  </p>
                  <div style={{ background: '#F1F5F9', padding: '8px 12px', borderRadius: '6px', fontWeight: 700, color: '#0F172A', marginBottom: '12px', fontSize: '14px', userSelect: 'all' }}>
                    {deleteModalProject.projectName}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Type project title here"
                    value={confirmTitleInput}
                    onChange={(e) => setConfirmTitleInput(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #CBD5E1', fontSize: '14px' }}
                  />
                </div>
                <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary-btn" onClick={() => setDeleteModalProject(null)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeletingProject || confirmTitleInput.trim() !== deleteModalProject.projectName.trim()}
                    style={{
                      background: confirmTitleInput.trim() === deleteModalProject.projectName.trim() ? '#DC2626' : '#9CA3AF',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: confirmTitleInput.trim() === deleteModalProject.projectName.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isDeletingProject ? 'Deleting...' : 'I understand, delete this project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL: ASSIGN FACULTY GUIDE (Coordinator)
            ========================================================= */}
        {assignGuideProject && (
          <div className="modal-overlay" onClick={() => setAssignGuideProject(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div className="modal-head">
                <h3>Assign Faculty Guide</h3>
                <button type="button" className="btn-close" onClick={() => setAssignGuideProject(null)}>✕</button>
              </div>
              <form onSubmit={handleSaveAssignGuide}>
                <div className="modal-content-body">
                  <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>
                    Allocate a registered Faculty supervisor to <strong>{assignGuideProject.projectName}</strong>.
                  </p>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Faculty Supervisor *
                    </label>
                    <select
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    >
                      <option value="">-- No Guide (Unassigned) --</option>
                      {facultyList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary-btn" onClick={() => setAssignGuideProject(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-create-project" disabled={isAssigningGuide}>
                    {isAssigningGuide ? 'Allocating...' : 'Confirm Allocation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL: REVIEW PROPOSAL (Staff)
            ========================================================= */}
        {reviewModalProject && (
          <div className="modal-overlay" onClick={() => setReviewModalProject(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="modal-head">
                <h3>Review Proposal: {reviewModalProject.projectName}</h3>
                <button type="button" className="btn-close" onClick={() => setReviewModalProject(null)}>✕</button>
              </div>
              <form onSubmit={handleSaveReview}>
                <div className="modal-content-body">
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Decision Status *
                    </label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    >
                      <option value="APPROVED">✓ APPROVED (Accept Proposal)</option>
                      <option value="REJECTED">✕ REJECTED (Decline Proposal)</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Reviewer Feedback / Comments
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Enter feedback for student team regarding scope, problem statement, or technical approach..."
                      value={reviewFeedbackText}
                      onChange={(e) => setReviewFeedbackText(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>
                </div>
                <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary-btn" onClick={() => setReviewModalProject(null)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    style={{
                      background: reviewStatus === 'APPROVED' ? '#059669' : '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSubmittingReview ? 'Submitting...' : `Submit ${reviewStatus}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL: CREATE PROJECT (Student)
            ========================================================= */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Register Academic Project</h3>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}>✕</button>
              </div>
              <form onSubmit={handleCreateProject}>
                <div className="modal-content-body">
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Project Title *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. AI-AcadPredict Academic Management"
                      value={newProject.name}
                      onChange={(e) => setNewProject((prev) => ({ ...prev, name: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Domain / Specialization *
                    </label>
                    <select
                      name="domain"
                      value={newProject.domain}
                      onChange={(e) => setNewProject((prev) => ({ ...prev, domain: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    >
                      {projectTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Description & Objectives
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Brief problem statement and proposed technological solution..."
                      value={newProject.description}
                      onChange={(e) => setNewProject((prev) => ({ ...prev, description: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>
                </div>
                <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary-btn" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-create-project" disabled={isSubmitting}>
                    {isSubmitting ? 'Registering...' : 'Register Project'}
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

export default MyProjects;
