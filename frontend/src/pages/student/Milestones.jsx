import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/layout/StudentLayout';
import { projectsApi, milestonesApi } from '../../services/api';
import './Milestones.css';

/**
 * Milestones Component
 * Route: /student/milestones
 * Strictly displays real project milestones from MySQL database and allows adding/updating milestones.
 */
function Milestones() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [notification, setNotification] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    status: 'UPCOMING',
    completion: 0,
  });

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

  // Fetch milestones for selected project
  const fetchMilestones = useCallback(async (projectId) => {
    if (!projectId) {
      setMilestones([]);
      return;
    }
    setIsLoadingMilestones(true);
    setError(null);
    try {
      const data = await milestonesApi.getByProject(projectId);
      setMilestones(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load milestones.');
    } finally {
      setIsLoadingMilestones(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedProjectId) {
        fetchMilestones(selectedProjectId);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedProjectId, fetchMilestones]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    if (!newMilestone.title.trim()) {
      setModalError('Milestone title is required.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      const created = await milestonesApi.create(selectedProjectId, {
        title: newMilestone.title.trim(),
        description: newMilestone.description.trim(),
        startDate: newMilestone.startDate,
        dueDate: newMilestone.dueDate,
        status: newMilestone.status,
        completion: Number(newMilestone.completion || 0),
      });

      setShowAddModal(false);
      setNewMilestone({
        title: '',
        description: '',
        startDate: '',
        dueDate: '',
        status: 'UPCOMING',
        completion: 0,
      });
      setNotification(`Milestone "${created.title}" successfully created!`);
      setTimeout(() => setNotification(null), 4000);
      fetchMilestones(selectedProjectId);
    } catch (err) {
      setModalError(err.message || 'Failed to create milestone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (milestoneId, newStatus) => {
    const target = milestones.find((m) => m.id === milestoneId);
    if (!target) return;

    const newComp = newStatus === 'COMPLETED' ? 100 : (target.completion === 100 ? 50 : target.completion);
    try {
      await milestonesApi.update(milestoneId, {
        title: target.title,
        description: target.description,
        startDate: target.startDate,
        dueDate: target.dueDate,
        status: newStatus,
        completion: newComp,
      });
      fetchMilestones(selectedProjectId);
    } catch (err) {
      alert(err.message || 'Failed to update milestone status.');
    }
  };

  const handleDeleteMilestone = async (milestoneId, title) => {
    const confirmDelete = window.confirm(`Delete milestone "${title}"?`);
    if (!confirmDelete) return;

    try {
      await milestonesApi.delete(milestoneId);
      setNotification(`"${title}" was deleted.`);
      setTimeout(() => setNotification(null), 4000);
      fetchMilestones(selectedProjectId);
    } catch (err) {
      alert(err.message || 'Failed to delete milestone.');
    }
  };

  const overallProgress = milestones.length > 0
    ? Math.round(milestones.reduce((acc, m) => acc + (m.completion || 0), 0) / milestones.length)
    : 0;

  const getStatusClass = (status) => {
    const s = (status || '').toUpperCase();
    if (s.includes('COMPLET')) return 'status-completed';
    if (s.includes('PROGRESS')) return 'status-progress';
    return 'status-pending';
  };

  return (
    <StudentLayout pageTitle="Milestones">
      <div className="milestones-page">
        {/* Header Bar */}
        <div className="milestones-header-row">
          <div>
            <h1 className="milestones-title">Project Milestones</h1>
            <p className="milestones-subtitle">
              Follow official project checkpoints, deliverable target windows, and completion milestones.
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
              <>
                <div className="milestones-overview-chip">
                  <span>Milestone Completion: <strong>{overallProgress}%</strong></span>
                </div>
                <button
                  type="button"
                  className="btn-create-project"
                  onClick={() => {
                    setModalError(null);
                    setShowAddModal(true);
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="btn-icon">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>Add Milestone</span>
                </button>
              </>
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
              Milestones require an academic project record. Please register your project first.
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

        {/* Loading State */}
        {isLoadingMilestones && (
          <div style={{ textAlign: 'center', padding: '36px', color: '#6B7280' }}>
            <p>Loading project milestones from database...</p>
          </div>
        )}

        {/* Empty State: Project has 0 Milestones */}
        {!isLoadingMilestones && selectedProject && milestones.length === 0 && (
          <div className="card" style={{ padding: '48px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
            <h3 style={{ fontSize: '18px', color: '#111827', marginBottom: '8px' }}>No Milestones Scheduled</h3>
            <p style={{ color: '#6B7280', marginBottom: '20px', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px auto' }}>
              No milestones have been defined for "{selectedProject.projectName}". Add submission checkpoints to track delivery progress.
            </p>
            <button
              type="button"
              className="btn-create-project"
              onClick={() => {
                setModalError(null);
                setShowAddModal(true);
              }}
            >
              + Add Milestone
            </button>
          </div>
        )}

        {/* Milestones List */}
        {!isLoadingMilestones && selectedProject && milestones.length > 0 && (
          <div className="milestones-timeline-container">
            {milestones.map((m, index) => (
              <div key={m.id} className="timeline-milestone-card card">
                <div className="milestone-content-inner">
                  <div className="milestone-head-row">
                    <div className="milestone-badge-group">
                      <span className="milestone-step-pill">Phase {index + 1}</span>
                      <span className={`status-pill ${getStatusClass(m.status)}`}>
                        {m.status || 'UPCOMING'}
                      </span>
                    </div>
                    <div className="milestone-dates">
                      <span className="date-span">
                        Due: <strong>{m.dueDate || 'No due date'}</strong>
                      </span>
                    </div>
                  </div>

                  <h3 className="milestone-headline">{m.title}</h3>
                  <p className="milestone-description">{m.description || 'No description provided.'}</p>

                  {/* Progress Bar */}
                  <div className="milestone-prog-box">
                    <div className="prog-label-row">
                      <span>Phase Completion</span>
                      <strong>{m.completion || 0}%</strong>
                    </div>
                    <div className="prog-bar-track">
                      <div
                        className="prog-bar-fill"
                        style={{ width: `${m.completion || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Supervisor Evaluation & Academic Feedback */}
                  {m.reviewStatus && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background:
                          m.reviewStatus === 'REVIEWED'
                            ? '#ECFDF5'
                            : m.reviewStatus === 'NEEDS_ATTENTION'
                            ? '#FFFBEB'
                            : '#F8FAFC',
                        border:
                          '1px solid ' +
                          (m.reviewStatus === 'REVIEWED'
                            ? '#A7F3D0'
                            : m.reviewStatus === 'NEEDS_ATTENTION'
                            ? '#FDE68A'
                            : '#E2E8F0'),
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color:
                              m.reviewStatus === 'REVIEWED'
                                ? '#065F46'
                                : m.reviewStatus === 'NEEDS_ATTENTION'
                                ? '#92400E'
                                : '#475569',
                          }}
                        >
                          Faculty Evaluation:{' '}
                          {m.reviewStatus === 'REVIEWED'
                            ? '✓ Reviewed & Satisfactory'
                            : m.reviewStatus === 'NEEDS_ATTENTION'
                            ? '⚠️ Needs Attention / Revisions'
                            : 'Pending Review'}
                        </span>
                        {m.reviewedBy && (
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            By {m.reviewedBy}
                          </span>
                        )}
                      </div>
                      {m.reviewFeedback && (
                        <p
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: '12.5px',
                            color: '#1E293B',
                            fontStyle: 'italic',
                          }}
                        >
                          "{m.reviewFeedback}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions & Status Control */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>Update Status:</span>
                      <select
                        value={m.status || 'UPCOMING'}
                        onChange={(e) => handleStatusChange(m.id, e.target.value)}
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="UPCOMING">Upcoming</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMilestone(m.id, m.title)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #FECACA',
                        color: '#DC2626',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add Milestone */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-dialog modal-form" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Add Milestone to {selectedProject?.projectName}</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div style={{ margin: '14px 24px 0', padding: '10px 14px', background: '#FEE2E2', color: '#991B1B', borderRadius: '6px', fontSize: '13px' }}>
                  ⚠️ {modalError}
                </div>
              )}

              <form onSubmit={handleAddMilestone} className="modal-form-body">
                <div className="form-group-item">
                  <label>Milestone Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SRS & System Architecture Review"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group-item">
                  <label>Description</label>
                  <textarea
                    rows="2"
                    placeholder="Brief scope, target deliverables, or submission criteria..."
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    disabled={isSubmitting}
                  ></textarea>
                </div>

                <div className="form-row-two">
                  <div className="form-group-item">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={newMilestone.dueDate}
                      onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Status</label>
                    <select
                      value={newMilestone.status}
                      onChange={(e) => setNewMilestone({ ...newMilestone, status: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="UPCOMING">Upcoming</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="modal-foot-actions">
                  <button
                    type="button"
                    className="btn-secondary-btn"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving to Database...' : 'Add Milestone'}
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

export default Milestones;
