import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/layout/StudentLayout';
import { projectsApi, usersApi, getStoredUser } from '../../services/api';
import './Proposal.css';

/**
 * Proposal Component
 * Route: /student/proposal
 * Role-aware proposal interface:
 *  - Student: Submit capstone proposals, view approval status, assigned guide, and supervisor feedback
 *  - Faculty & Coordinator: Filter proposals by status (Pending, Approved, Rejected, All), inspect details, and perform review actions with feedback
 */
function Proposal() {
  const navigate = useNavigate();
  const currentUser = getStoredUser() || {};
  const rawRole = (currentUser.role || '').replace(/^ROLE_/, '').toUpperCase();
  const isFaculty = rawRole === 'FACULTY';
  const isCoordinator = rawRole === 'COORDINATOR';
  const isStaff = isFaculty || isCoordinator;

  // Student Form State
  const [formData, setFormData] = useState({
    title: '',
    domain: 'AI',
    guideId: '',
    problemStatement: '',
    objectives: '',
    expectedOutcome: '',
    description: '',
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('New Proposal Draft');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingProject, setExistingProject] = useState(null);

  // Staff Review Queue State
  const [allProposals, setAllProposals] = useState([]);
  const [proposalFilter, setProposalFilter] = useState('PENDING');
  const [reviewingProposal, setReviewingProposal] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('APPROVED');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Real Registered Faculty list
  const [facultyGuides, setFacultyGuides] = useState([]);

  const projectTypeOptions = [
    { value: 'AI', label: 'Artificial Intelligence & Machine Learning (AI)' },
    { value: 'Web', label: 'Web & Full-Stack Application (Web)' },
    { value: 'Mobile', label: 'Mobile Application Development (Mobile)' },
    { value: 'IoT', label: 'Internet of Things & Embedded Systems (IoT)' },
    { value: 'Research', label: 'Academic & Applied Research (Research)' },
  ];

  // Load Real Faculty and Proposals
  const loadInitialData = useCallback(async () => {
    try {
      // 1. Fetch real faculty accounts
      try {
        const facList = await usersApi.getFaculty();
        setFacultyGuides(Array.isArray(facList) ? facList : []);
      } catch {
        setFacultyGuides([]);
      }

      // 2. Fetch projects
      const list = await projectsApi.getAll();
      const valid = Array.isArray(list) ? list : [];
      setAllProposals(valid);

      if (!isStaff && valid.length > 0) {
        const latest = valid[valid.length - 1];
        setExistingProject(latest);
        setStatus(latest.status || 'PENDING_REVIEW');
        setFormData((prev) => ({
          ...prev,
          title: latest.projectName || prev.title,
          domain: latest.projectType || 'AI',
          description: latest.description || prev.description,
          guideId: latest.facultyGuideId ? String(latest.facultyGuideId) : '',
        }));
      }
    } catch (err) {
      console.error('Failed to load proposal data:', err);
    }
  }, [isStaff]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInitialData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadInitialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Project title is required.';
    if (!formData.domain) errs.domain = 'Technology/domain is required.';
    if (!formData.problemStatement.trim()) errs.problemStatement = 'Problem statement is required.';
    if (!formData.objectives.trim()) errs.objectives = 'Objectives are required.';
    if (!formData.expectedOutcome.trim()) errs.expectedOutcome = 'Expected outcome is required.';
    return errs;
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatusMessage({
        type: 'error',
        text: 'Please resolve the highlighted validation errors before submitting.',
      });
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setStatusMessage(null);

    const fullDescription = [
      formData.description ? `Abstract: ${formData.description.trim()}` : '',
      `Problem Statement: ${formData.problemStatement.trim()}`,
      `Objectives: ${formData.objectives.trim()}`,
      `Expected Outcome: ${formData.expectedOutcome.trim()}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const created = await projectsApi.create({
        projectName: formData.title.trim(),
        description: fullDescription,
        projectType: formData.domain,
      });

      // If user selected a faculty guide, assign it
      if (formData.guideId) {
        try {
          await projectsApi.assignGuide(created.id, Number(formData.guideId));
        } catch {
          // Guide assignment is coordinator/faculty permission or optional
        }
      }

      setExistingProject(created);
      setStatus(created.status || 'PENDING_REVIEW');
      setStatusMessage({
        type: 'success',
        text: `Proposal for "${created.projectName}" successfully submitted to MySQL! Project ID #${created.id} is now registered for review.`,
      });

      setTimeout(() => {
        navigate('/student/projects');
      }, 2000);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to submit project proposal to backend.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Staff Review Submit
  const handleExecuteReview = async (e) => {
    e.preventDefault();
    if (!reviewingProposal) return;
    setIsSubmittingReview(true);
    try {
      const updated = await projectsApi.review(reviewingProposal.id, reviewDecision, reviewFeedback);
      setAllProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setReviewingProposal(null);
      setReviewFeedback('');
      setStatusMessage({
        type: 'success',
        text: `Proposal #${updated.id} ("${updated.projectName}") marked as ${updated.status}.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      alert(err.message || 'Failed to submit proposal review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const filteredProposals = allProposals.filter((p) => {
    if (proposalFilter === 'ALL') return true;
    if (proposalFilter === 'PENDING') return p.status === 'PENDING' || p.status === 'PENDING_REVIEW';
    if (proposalFilter === 'APPROVED') return p.status === 'APPROVED';
    if (proposalFilter === 'REJECTED') return p.status === 'REJECTED';
    return true;
  });

  return (
    <StudentLayout pageTitle="Project Proposal">
      <div className="proposal-page">
        {/* Header Row */}
        <div className="proposal-header-row">
          <div>
            <h1 className="proposal-title">{isStaff ? 'Department Proposal Reviews' : 'Project Proposal'}</h1>
            <p className="proposal-subtitle">
              {isStaff
                ? 'Evaluate submitted academic capstone proposals, inspect technical scope, and record review decisions.'
                : 'Submit and track your formal capstone proposal for academic department evaluation.'}
            </p>
          </div>

          {!isStaff && (
            <div className="proposal-status-pill-box">
              <span className="status-label">Status:</span>
              <span
                className={`status-pill ${
                  status.includes('Approved') || status === 'APPROVED'
                    ? 'status-completed'
                    : status === 'REJECTED'
                    ? 'status-rejected'
                    : 'status-progress'
                }`}
                style={{
                  background: status === 'APPROVED' ? '#D1FAE5' : status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                  color: status === 'APPROVED' ? '#065F46' : status === 'REJECTED' ? '#991B1B' : '#92400E',
                }}
              >
                {status}
              </span>
              {existingProject && (
                <span className="status-pill status-progress" style={{ marginLeft: '8px' }}>
                  Project #{existingProject.id}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`proposal-alert alert-${statusMessage.type}`}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              background: statusMessage.type === 'success' ? '#DEF7EC' : '#FEE2E2',
              color: statusMessage.type === 'success' ? '#03543F' : '#991B1B',
              border: `1px solid ${statusMessage.type === 'success' ? '#31C48D' : '#F87171'}`,
            }}
          >
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* =========================================================
            STAFF VIEW: DEPARTMENT PROPOSAL REVIEW QUEUE
            ========================================================= */}
        {isStaff ? (
          <div>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', paddingBottom: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setProposalFilter('PENDING')}
                style={{
                  background: proposalFilter === 'PENDING' ? '#2563EB' : 'transparent',
                  color: proposalFilter === 'PENDING' ? '#FFFFFF' : '#475569',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Pending Review ({allProposals.filter((p) => p.status === 'PENDING' || p.status === 'PENDING_REVIEW').length})
              </button>
              <button
                type="button"
                onClick={() => setProposalFilter('APPROVED')}
                style={{
                  background: proposalFilter === 'APPROVED' ? '#2563EB' : 'transparent',
                  color: proposalFilter === 'APPROVED' ? '#FFFFFF' : '#475569',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Approved ({allProposals.filter((p) => p.status === 'APPROVED').length})
              </button>
              <button
                type="button"
                onClick={() => setProposalFilter('REJECTED')}
                style={{
                  background: proposalFilter === 'REJECTED' ? '#2563EB' : 'transparent',
                  color: proposalFilter === 'REJECTED' ? '#FFFFFF' : '#475569',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Rejected ({allProposals.filter((p) => p.status === 'REJECTED').length})
              </button>
              <button
                type="button"
                onClick={() => setProposalFilter('ALL')}
                style={{
                  background: proposalFilter === 'ALL' ? '#2563EB' : 'transparent',
                  color: proposalFilter === 'ALL' ? '#FFFFFF' : '#475569',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                All Proposals ({allProposals.length})
              </button>
            </div>

            {/* Proposals Cards List */}
            {filteredProposals.length === 0 ? (
              <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                <p>No proposals found in the "{proposalFilter}" queue.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredProposals.map((p) => (
                  <div key={p.id} className="card" style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#F1F5F9', color: '#475569' }}>
                          #{p.id} • {p.projectType}
                        </span>
                        <span
                          className="status-pill status-progress"
                          style={{
                            fontSize: '11px',
                            background: p.status === 'APPROVED' ? '#D1FAE5' : p.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                            color: p.status === 'APPROVED' ? '#065F46' : p.status === 'REJECTED' ? '#991B1B' : '#92400E',
                          }}
                        >
                          {p.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingProposal(p);
                          setReviewDecision(p.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
                          setReviewFeedback(p.reviewFeedback || '');
                        }}
                        style={{
                          background: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Evaluate / Review &rarr;
                      </button>
                    </div>

                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#0F172A' }}>{p.projectName}</h3>
                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                      Student Owner: <strong>{p.owner?.name}</strong> ({p.owner?.email}) • Faculty Guide: <strong>{p.facultyGuideName || 'Unassigned'}</strong>
                    </div>

                    <p style={{ fontSize: '13px', color: '#334155', whiteSpace: 'pre-line', margin: '0 0 10px 0', background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px' }}>
                      {p.description || 'No description provided.'}
                    </p>

                    {p.reviewFeedback && (
                      <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: '12.5px' }}>
                        <span style={{ fontWeight: 600, color: '#166534' }}>Saved Review ({p.reviewedBy || 'Faculty'}): </span>
                        <span style={{ color: '#15803D', fontStyle: 'italic' }}>"{p.reviewFeedback}"</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================
              STUDENT VIEW: PROPOSAL SUBMISSION & STATUS FORM
              ========================================================= */
          <div className="proposal-layout-grid">
            {/* Form */}
            <div className="proposal-form-card card">
              <form onSubmit={handleSubmitProposal} noValidate>
                <div className="form-section-title">
                  <h3>1. General Information</h3>
                </div>

                <div className="form-field-group">
                  <label htmlFor="title">Project Title *</label>
                  <input
                    id="title"
                    type="text"
                    name="title"
                    className={errors.title ? 'input-error' : ''}
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter formal academic project title"
                  />
                  {errors.title && <span className="field-err">{errors.title}</span>}
                </div>

                <div className="form-two-col">
                  <div className="form-field-group">
                    <label htmlFor="domain">Technology / Domain *</label>
                    <select
                      id="domain"
                      name="domain"
                      className={errors.domain ? 'input-error' : ''}
                      value={formData.domain}
                      onChange={handleChange}
                    >
                      {projectTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.domain && <span className="field-err">{errors.domain}</span>}
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="guideId">Preferred Faculty Supervisor</label>
                    <select
                      id="guideId"
                      name="guideId"
                      value={formData.guideId}
                      onChange={handleChange}
                    >
                      <option value="">-- Select from Registered Faculty --</option>
                      {facultyGuides.map((guide) => (
                        <option key={guide.id} value={guide.id}>
                          {guide.name} ({guide.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field-group">
                  <label htmlFor="description">Brief Summary / Abstract</label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Summarize the core premise of your project"
                  ></textarea>
                </div>

                <div className="form-section-title">
                  <h3>2. Technical Scope &amp; Deliverables</h3>
                </div>

                <div className="form-field-group">
                  <label htmlFor="problemStatement">Problem Statement *</label>
                  <textarea
                    id="problemStatement"
                    name="problemStatement"
                    rows="3"
                    className={errors.problemStatement ? 'input-error' : ''}
                    value={formData.problemStatement}
                    onChange={handleChange}
                    placeholder="What key academic or industrial challenge does this project solve?"
                  ></textarea>
                  {errors.problemStatement && (
                    <span className="field-err">{errors.problemStatement}</span>
                  )}
                </div>

                <div className="form-field-group">
                  <label htmlFor="objectives">Specific Objectives *</label>
                  <textarea
                    id="objectives"
                    name="objectives"
                    rows="3"
                    className={errors.objectives ? 'input-error' : ''}
                    value={formData.objectives}
                    onChange={handleChange}
                    placeholder="Enumerate concrete objectives (e.g. 1. Design, 2. Build, 3. Validate)"
                  ></textarea>
                  {errors.objectives && (
                    <span className="field-err">{errors.objectives}</span>
                  )}
                </div>

                <div className="form-field-group">
                  <label htmlFor="expectedOutcome">Expected Outcome / Impact *</label>
                  <textarea
                    id="expectedOutcome"
                    name="expectedOutcome"
                    rows="3"
                    className={errors.expectedOutcome ? 'input-error' : ''}
                    value={formData.expectedOutcome}
                    onChange={handleChange}
                    placeholder="What tangible software, system, or paper will be delivered?"
                  ></textarea>
                  {errors.expectedOutcome && (
                    <span className="field-err">{errors.expectedOutcome}</span>
                  )}
                </div>

                <div className="form-actions-row">
                  <button type="submit" className="btn-create-project btn-large" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting to Database...' : 'Submit Proposal for Review'}
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar Guidelines & Saved Feedback */}
            <div className="proposal-guidelines-col">
              {existingProject && (
                <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0F172A' }}>Latest Proposal Record</h4>
                  <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Title: </span>
                      <strong>{existingProject.projectName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Allocated Guide: </span>
                      <strong style={{ color: existingProject.facultyGuideName ? '#059669' : '#DC2626' }}>
                        {existingProject.facultyGuideName || 'Not Allocated Yet'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Approval Status: </span>
                      <span style={{ fontWeight: 700, color: existingProject.status === 'APPROVED' ? '#059669' : existingProject.status === 'REJECTED' ? '#DC2626' : '#D97706' }}>
                        {existingProject.status}
                      </span>
                    </div>
                    {existingProject.reviewFeedback && (
                      <div style={{ marginTop: '8px', padding: '10px', background: '#F0FDF4', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                        <strong style={{ fontSize: '12px', color: '#166534' }}>Reviewer Feedback ({existingProject.reviewedBy || 'Faculty'}):</strong>
                        <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', color: '#15803D' }}>"{existingProject.reviewFeedback}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="card guidelines-card">
                <div className="guidelines-header">
                  <span className="guideline-icon">ℹ️</span>
                  <h3>Submission Guidelines</h3>
                </div>
                <ul className="guidelines-list">
                  <li>Proposals must reflect original individual or group academic effort.</li>
                  <li>Problem statements should be explicit and scoped for the semester.</li>
                  <li>Department faculty guides review and evaluate submitted drafts.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Review Proposal (Staff) */}
        {reviewingProposal && (
          <div className="modal-overlay" onClick={() => setReviewingProposal(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="modal-head">
                <h3>Review Proposal: {reviewingProposal.projectName}</h3>
                <button type="button" className="btn-close" onClick={() => setReviewingProposal(null)}>✕</button>
              </div>
              <form onSubmit={handleExecuteReview}>
                <div className="modal-content-body">
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Review Decision *
                    </label>
                    <select
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    >
                      <option value="APPROVED">✓ APPROVED (Accept Capstone Proposal)</option>
                      <option value="REJECTED">✕ REJECTED (Decline Proposal)</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Academic Review Comments / Guidance
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Enter feedback for student team on feasibility, scope adjustments, or requirements..."
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary-btn" onClick={() => setReviewingProposal(null)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    style={{
                      background: reviewDecision === 'APPROVED' ? '#059669' : '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSubmittingReview ? 'Saving...' : `Confirm ${reviewDecision}`}
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

export default Proposal;
