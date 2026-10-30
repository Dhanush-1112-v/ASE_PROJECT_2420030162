import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/layout/StudentLayout';
import {
  projectsApi,
  predictionsApi,
  milestonesApi,
  teamApi,
  tasksApi,
  usersApi,
  getStoredUser
} from '../../services/api';
import './StudentDashboard.css';

/**
 * Role-Based Dashboard Component
 * Route: /student/dashboard
 * Genuinely renders tailored dashboard interfaces for:
 *   - STUDENT: Personal project progress, tasks, milestones, AI risk forecasting
 *   - FACULTY: Academic supervision, assigned projects, proposal reviews, milestone feedback, student task assignment
 *   - COORDINATOR: Department-wide metrics, faculty workload overview, guide allocation, follow-up tracking
 */
function StudentDashboard() {
  const navigate = useNavigate();
  const currentUser = getStoredUser() || {};
  const userName = currentUser.name || 'User';
  const rawRole = (currentUser.role || '').replace(/^ROLE_/, '').toUpperCase();
  const isFaculty = rawRole === 'FACULTY';
  const isCoordinator = rawRole === 'COORDINATOR';
  const isStudent = !isFaculty && !isCoordinator;

  const dashboardHeading = isFaculty
    ? 'Faculty Dashboard'
    : isCoordinator
    ? 'Coordinator Dashboard'
    : 'Student Dashboard';

  // Common Data States
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [facultyList, setFacultyList] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Student AI Prediction
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState('');
  const [predictionSuccess, setPredictionSuccess] = useState('');

  // Modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showUserConfirmPassword, setShowUserConfirmPassword] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: isFaculty ? 'STUDENT' : 'STUDENT',
    assignProjectId: '',
  });
  const [userModalError, setUserModalError] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Faculty Evaluation Modal
  const [evaluatingMilestone, setEvaluatingMilestone] = useState(null);
  const [evalStatus, setEvalStatus] = useState('REVIEWED');
  const [evalFeedback, setEvalFeedback] = useState('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);

  // Faculty Task Assignment Modal
  const [assigningTask, setAssigningTask] = useState(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isSubmittingTaskAssign, setIsSubmittingTaskAssign] = useState(false);

  // Coordinator Follow-Up Modal
  const [followUpProject, setFollowUpProject] = useState(null);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

  // Coordinator Quick Guide Assign
  const [selectedGuideForProject, setSelectedGuideForProject] = useState({});

  // Helper notification toaster
  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projectList = await projectsApi.getAll();
      const validProjects = Array.isArray(projectList) ? projectList : [];
      setProjects(validProjects);

      if (isCoordinator || isFaculty) {
        try {
          const facultyData = await usersApi.getFaculty();
          setFacultyList(Array.isArray(facultyData) ? facultyData : []);
        } catch {
          setFacultyList([]);
        }
      }

      // For Student or when inspecting primary active project
      if (validProjects.length > 0) {
        // For faculty, prefer the first project assigned to them
        let primary = validProjects[0];
        if (isFaculty) {
          const assigned = validProjects.find(
            (p) => p.facultyGuideId === currentUser.id || p.facultyGuideEmail === currentUser.email
          );
          if (assigned) primary = assigned;
        }
        setActiveProject(primary);

        const [taskList, milestoneList, teamList, predictionList] = await Promise.allSettled([
          projectsApi.getTasks(primary.id),
          milestonesApi.getByProject(primary.id),
          teamApi.getByProject(primary.id),
          projectsApi.getPredictions(primary.id),
        ]);

        setTasks(taskList.status === 'fulfilled' && Array.isArray(taskList.value) ? taskList.value : []);
        setMilestones(milestoneList.status === 'fulfilled' && Array.isArray(milestoneList.value) ? milestoneList.value : []);
        setTeamMembers(teamList.status === 'fulfilled' && Array.isArray(teamList.value) ? teamList.value : []);
        setLatestPrediction(
          predictionList.status === 'fulfilled' && Array.isArray(predictionList.value) && predictionList.value.length > 0
            ? predictionList.value[0]
            : null
        );
      } else {
        setActiveProject(null);
        setTasks([]);
        setMilestones([]);
        setTeamMembers([]);
        setLatestPrediction(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, currentUser.email, isFaculty, isCoordinator]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDashboardData]);

  // Handle active project selection change (for Faculty / Coordinator switching projects)
  const handleSelectActiveProject = async (proj) => {
    setActiveProject(proj);
    try {
      const [taskList, milestoneList, teamList, predictionList] = await Promise.allSettled([
        projectsApi.getTasks(proj.id),
        milestonesApi.getByProject(proj.id),
        teamApi.getByProject(proj.id),
        projectsApi.getPredictions(proj.id),
      ]);
      setTasks(taskList.status === 'fulfilled' && Array.isArray(taskList.value) ? taskList.value : []);
      setMilestones(milestoneList.status === 'fulfilled' && Array.isArray(milestoneList.value) ? milestoneList.value : []);
      setTeamMembers(teamList.status === 'fulfilled' && Array.isArray(teamList.value) ? teamList.value : []);
      setLatestPrediction(
        predictionList.status === 'fulfilled' && Array.isArray(predictionList.value) && predictionList.value.length > 0
          ? predictionList.value[0]
          : null
      );
    } catch (e) {
      console.error('Error switching active project:', e);
    }
  };

  // Student Run Risk Prediction
  const runRiskPrediction = async () => {
    if (!activeProject) {
      setPredictionError('No active project found to evaluate.');
      return;
    }
    setPredictionLoading(true);
    setPredictionError('');
    setPredictionSuccess('');
    try {
      const pendingCount = tasks.filter((t) => (t.status || '').toUpperCase() !== 'COMPLETED').length;
      const completedTasks = tasks.length - pendingCount;
      const taskCompletionPct = tasks.length > 0
        ? Math.round((completedTasks / tasks.length) * 100)
        : Number(activeProject.progress || 0);

      const completedMilestones = milestones.filter((m) => (m.status || '').toUpperCase() === 'COMPLETED').length;
      const milestoneCompletionPct = milestones.length > 0
        ? Math.round((completedMilestones / milestones.length) * 100)
        : Number(activeProject.progress || 0);

      const payload = {
        projectId: activeProject.id,
        attendance: 85.0,
        studyHours: 15.0,
        previousPerformance: 75.0,
        taskCompletion: taskCompletionPct,
        pendingTasks: pendingCount,
        missedDeadlines: 0,
        milestoneCompletion: milestoneCompletionPct,
        daysRemaining: 30,
        teamSize: Math.max(1, teamMembers.length),
        projectType: activeProject.projectType || 'AI',
        projectProgress: Number(activeProject.progress || 0),
      };

      const result = await predictionsApi.predict(payload);
      setLatestPrediction({
        id: result.id || Date.now(),
        risk: result.risk,
        probability: result.probability,
        createdAt: new Date().toISOString(),
      });
      setPredictionSuccess(`Delay risk successfully evaluated as ${result.risk} by AI service.`);
      setTimeout(() => setPredictionSuccess(''), 5000);
      loadDashboardData();
    } catch (err) {
      setPredictionError(err.message || 'Unable to calculate risk. Please ensure AI service is running.');
    } finally {
      setPredictionLoading(false);
    }
  };

  // Safe Account Creation Submit (Faculty / Coordinator)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserModalError('');

    if (!userFormData.name.trim()) {
      setUserModalError('Full name is required.');
      return;
    }
    if (!userFormData.email.trim()) {
      setUserModalError('Email address is required.');
      return;
    }
    if (!userFormData.password || userFormData.password.length < 8) {
      setUserModalError('Password must be at least 8 characters.');
      return;
    }
    if (userFormData.password !== userFormData.confirmPassword) {
      setUserModalError('Passwords do not match.');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const payload = {
        name: userFormData.name.trim(),
        email: userFormData.email.trim().toLowerCase(),
        password: userFormData.password,
        role: isFaculty ? 'STUDENT' : (userFormData.role || 'STUDENT'),
        assignProjectId: userFormData.assignProjectId ? Number(userFormData.assignProjectId) : null,
      };

      const created = await usersApi.create(payload);
      setShowCreateUserModal(false);
      setShowUserPassword(false);
      setShowUserConfirmPassword(false);
      setUserFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: isFaculty ? 'STUDENT' : 'STUDENT',
        assignProjectId: '',
      });
      showToast(`Account successfully created for ${created.name} (${created.role})!`);
      loadDashboardData();
    } catch (err) {
      setUserModalError(err.message || 'Failed to create account.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Milestone Evaluation Submit (Faculty)
  const handleSaveMilestoneEval = async (e) => {
    e.preventDefault();
    if (!evaluatingMilestone) return;
    setIsSubmittingEval(true);
    try {
      const updated = await milestonesApi.review(evaluatingMilestone.id, evalStatus, evalFeedback);
      setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEvaluatingMilestone(null);
      setEvalFeedback('');
      showToast(`Milestone "${updated.title}" evaluation saved as ${updated.reviewStatus}.`);
    } catch (err) {
      alert(err.message || 'Failed to save milestone evaluation.');
    } finally {
      setIsSubmittingEval(false);
    }
  };

  // Task Assignment Submit (Faculty)
  const handleSaveTaskAssign = async (e) => {
    e.preventDefault();
    if (!assigningTask) return;
    setIsSubmittingTaskAssign(true);
    try {
      const payload = {
        title: assigningTask.title,
        description: assigningTask.description,
        status: assigningTask.status,
        priority: taskPriority,
        dueDate: taskDueDate,
        progress: assigningTask.progress || 0,
        projectId: assigningTask.projectId,
        assignedToId: selectedAssigneeId ? Number(selectedAssigneeId) : null,
      };
      const updated = await tasksApi.update(assigningTask.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setAssigningTask(null);
      showToast(`Task assigned successfully to ${updated.assignedToName || 'team member'}.`);
    } catch (err) {
      alert(err.message || 'Failed to assign task.');
    } finally {
      setIsSubmittingTaskAssign(false);
    }
  };

  // Coordinator Quick Guide Assign
  const handleAssignGuide = async (projectId) => {
    const facultyId = selectedGuideForProject[projectId];
    if (!facultyId) {
      alert('Please select a faculty member to assign.');
      return;
    }
    try {
      const updated = await projectsApi.assignGuide(projectId, facultyId);
      showToast(`Faculty guide "${updated.facultyGuideName}" assigned to ${updated.projectName}.`);
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to assign faculty guide.');
    }
  };

  // Coordinator Follow-Up Submit
  const handleSaveFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpProject) return;
    setIsSubmittingFollowUp(true);
    try {
      const updated = await projectsApi.updateFollowUp(followUpProject.id, followUpNotes);
      setFollowUpProject(null);
      setFollowUpNotes('');
      showToast(`Follow-up note saved for "${updated.projectName}".`);
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to save follow-up note.');
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  // Faculty Metrics
  const assignedProjects = projects.filter(
    (p) => p.facultyGuideId === currentUser.id || p.facultyGuideEmail === currentUser.email
  );
  const pendingProposalsCount = projects.filter(
    (p) => p.status === 'PENDING' || p.status === 'PENDING_REVIEW'
  ).length;
  const facultyHighRiskCount = assignedProjects.filter((p) => p.delayRisk === 'HIGH').length;

  // Coordinator Metrics
  const totalProjectsCount = projects.length;
  const coordinatorPendingCount = pendingProposalsCount;
  const approvedCount = projects.filter((p) => p.status === 'APPROVED').length;
  const rejectedCount = projects.filter((p) => p.status === 'REJECTED').length;
  const unassignedGuideCount = projects.filter((p) => !p.facultyGuideId).length;
  const coordinatorHighRiskCount = projects.filter((p) => p.delayRisk === 'HIGH').length;

  return (
    <StudentLayout pageTitle={dashboardHeading}>
      <div className="dashboard-content">
        {/* Toast Notification */}
        {notification && (
          <div
            className="alert-banner alert-success"
            style={{
              marginBottom: '20px',
              background: '#DEF7EC',
              color: '#03543F',
              border: '1px solid #31C48D',
              padding: '12px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontWeight: 700 }}>✓</span>
            <span>{notification}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            className="alert-banner alert-error"
            style={{
              marginBottom: '20px',
              background: '#FEE2E2',
              color: '#991B1B',
              border: '1px solid #F87171',
              padding: '12px 16px',
              borderRadius: '8px',
            }}
          >
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Top Banner Row */}
        <div className="dashboard-welcome-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="welcome-text-col">
            <h1 className="dashboard-heading">{dashboardHeading}</h1>
            <p className="dashboard-welcome">
              Welcome back, <strong>{userName}</strong> • {currentUser.email} •{' '}
              <span style={{ textTransform: 'uppercase', fontWeight: 600, color: '#2563EB' }}>{rawRole}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {(isFaculty || isCoordinator) && (
              <button
                type="button"
                className="btn-create-project"
                onClick={() => {
                  setUserModalError('');
                  setShowCreateUserModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
                <span>{isFaculty ? '+ Add Student Account' : '+ Add User Account'}</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================
            ROLE 1: STUDENT DASHBOARD VIEW
            ========================================================= */}
        {isStudent && (
          <>
            {!isLoading && projects.length === 0 ? (
              <div className="dashboard-empty-container">
                <div className="empty-welcome-card card">
                  <div className="empty-card-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="empty-project-icon">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      <line x1="12" y1="11" x2="12" y2="17" />
                      <line x1="9" y1="14" x2="15" y2="14" />
                    </svg>
                  </div>
                  <h2 className="empty-welcome-heading">Welcome to AcadPredict, {userName}!</h2>
                  <p className="empty-welcome-message">
                    You haven't submitted a project yet. Create your first academic project to start managing tasks, tracking milestones, collaborating with your team, and monitoring AI delay risk.
                  </p>
                  <div className="empty-actions-row">
                    <button type="button" className="btn-create-project btn-large" onClick={() => navigate('/student/projects')}>
                      + Create Your First Project
                    </button>
                    <button type="button" className="btn-secondary-btn" onClick={() => navigate('/student/proposal')}>
                      Draft Project Proposal &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 4 Student Metric Cards */}
                <section className="summary-cards-grid" aria-label="Student Metrics">
                  <div className="summary-card" onClick={() => navigate('/student/projects')} style={{ cursor: 'pointer' }}>
                    <div className="summary-card-top">
                      <span className="summary-card-title">My Projects</span>
                      <span className="summary-card-icon">📁</span>
                    </div>
                    <div className="summary-card-body">
                      <div className="summary-card-value">{projects.length}</div>
                      <span className="summary-badge badge-success">Active</span>
                    </div>
                    <div className="summary-card-footer">{activeProject ? activeProject.projectName : 'None'}</div>
                  </div>

                  <div className="summary-card" onClick={() => navigate('/student/tasks')} style={{ cursor: 'pointer' }}>
                    <div className="summary-card-top">
                      <span className="summary-card-title">Pending Tasks</span>
                      <span className="summary-card-icon">📋</span>
                    </div>
                    <div className="summary-card-body">
                      <div className="summary-card-value">
                        {tasks.filter((t) => (t.status || '').toUpperCase() !== 'COMPLETED').length}
                      </div>
                      <span className="summary-badge badge-warning">Sprint Tasks</span>
                    </div>
                    <div className="summary-card-footer">{tasks.length} total tasks recorded</div>
                  </div>

                  <div className="summary-card" onClick={() => navigate('/student/milestones')} style={{ cursor: 'pointer' }}>
                    <div className="summary-card-top">
                      <span className="summary-card-title">Upcoming Milestones</span>
                      <span className="summary-card-icon">🚩</span>
                    </div>
                    <div className="summary-card-body">
                      <div className="summary-card-value">
                        {milestones.filter((m) => (m.status || '').toUpperCase() !== 'COMPLETED').length}
                      </div>
                      <span className="summary-badge badge-info">In Progress</span>
                    </div>
                    <div className="summary-card-footer">{milestones.length} total scheduled</div>
                  </div>

                  <div className="summary-card" onClick={() => navigate('/student/risk')} style={{ cursor: 'pointer' }}>
                    <div className="summary-card-top">
                      <span className="summary-card-title">AI Delay Risk</span>
                      <span className="summary-card-icon">⚡</span>
                    </div>
                    <div className="summary-card-body">
                      <div className="summary-card-value" style={{ fontSize: latestPrediction?.risk ? '24px' : '18px' }}>
                        {latestPrediction?.risk || 'Not Evaluated'}
                      </div>
                      <span
                        className={`summary-badge ${
                          latestPrediction?.risk === 'HIGH'
                            ? 'badge-danger'
                            : latestPrediction?.risk === 'MEDIUM'
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                      >
                        {latestPrediction ? `${Math.round(latestPrediction.probability * 100)}% Conf.` : 'Pending'}
                      </span>
                    </div>
                    <div className="summary-card-footer">
                      {latestPrediction ? 'Evaluated by Random Forest model' : 'Click to forecast delay risk'}
                    </div>
                  </div>
                </section>

                {/* Active Project & AI Risk Prediction */}
                {activeProject && (
                  <div className="dashboard-two-column-grid">
                    <div className="dashboard-column">
                      <section className="card project-section-card">
                        <div className="card-header">
                          <h2 className="card-title">Current Project: {activeProject.projectName}</h2>
                          <span className="status-pill status-progress">{activeProject.status}</span>
                        </div>
                        <div className="project-details-body">
                          <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '14px' }}>
                            {activeProject.description || 'No description provided.'}
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                            <div>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>Faculty Guide:</span>
                              <div style={{ fontWeight: 600, color: '#111827' }}>
                                {activeProject.facultyGuideName || 'Not Assigned Yet'}
                              </div>
                            </div>
                            <div>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>Domain / Category:</span>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{activeProject.projectType || 'General'}</div>
                            </div>
                          </div>

                          <div className="project-progress-wrapper">
                            <div className="progress-info-row">
                              <span className="progress-label">Saved Overall Progress</span>
                              <span className="progress-percent">{activeProject.progress || 0}%</span>
                            </div>
                            <div className="progress-bar-track">
                              <div className="progress-bar-fill" style={{ width: `${activeProject.progress || 0}%` }}></div>
                            </div>
                          </div>

                          {activeProject.reviewFeedback && (
                            <div style={{ marginTop: '16px', padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px' }}>
                              <strong style={{ fontSize: '12px', color: '#166534', display: 'block', marginBottom: '4px' }}>
                                Reviewer Feedback ({activeProject.reviewedBy || 'Faculty'}):
                              </strong>
                              <p style={{ margin: 0, fontSize: '13px', color: '#14532D', fontStyle: 'italic' }}>
                                "{activeProject.reviewFeedback}"
                              </p>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>

                    <div className="dashboard-column">
                      <section className="card">
                        <div className="card-header">
                          <h2 className="card-title">AI Delay Risk Engine</h2>
                          <button
                            type="button"
                            className="btn-create-project"
                            onClick={runRiskPrediction}
                            disabled={predictionLoading}
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                          >
                            {predictionLoading ? 'Evaluating...' : 'Recalculate Risk'}
                          </button>
                        </div>
                        <div style={{ padding: '16px 20px' }}>
                          {predictionSuccess && (
                            <div style={{ background: '#DEF7EC', color: '#03543F', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
                              ✓ {predictionSuccess}
                            </div>
                          )}
                          {predictionError && (
                            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
                              ⚠️ {predictionError}
                            </div>
                          )}
                          <p style={{ color: '#4B5563', fontSize: '13.5px', lineHeight: 1.5 }}>
                            The trained Random Forest model predicts delivery risks based on sprint task completion ({tasks.filter((t) => (t.status || '').toUpperCase() === 'COMPLETED').length}/{tasks.length}), milestone progress, and project velocity.
                          </p>
                          <div style={{ marginTop: '14px', padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '12px', color: '#64748B' }}>Current Forecast:</span>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: latestPrediction?.risk === 'HIGH' ? '#DC2626' : latestPrediction?.risk === 'MEDIUM' ? '#D97706' : '#059669' }}>
                                {latestPrediction?.risk || 'Uncalculated'}
                              </div>
                            </div>
                            <div>
                              <span style={{ fontSize: '12px', color: '#64748B' }}>Confidence:</span>
                              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                                {latestPrediction ? `${Math.round(latestPrediction.probability * 100)}%` : '--'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* =========================================================
            ROLE 2: FACULTY DASHBOARD VIEW
            ========================================================= */}
        {isFaculty && (
          <>
            {/* 5 Real Faculty Supervision Metrics */}
            <section className="summary-cards-grid" aria-label="Faculty Metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="summary-card" onClick={() => navigate('/student/projects')} style={{ cursor: 'pointer' }}>
                <div className="summary-card-top">
                  <span className="summary-card-title">Assigned Projects</span>
                  <span className="summary-card-icon">🎓</span>
                </div>
                <div className="summary-card-body">
                  <div className="summary-card-value">{assignedProjects.length}</div>
                  <span className="summary-badge badge-success">Supervising</span>
                </div>
                <div className="summary-card-footer">Assigned by Coordinator</div>
              </div>

              <div className="summary-card" onClick={() => navigate('/student/proposal')} style={{ cursor: 'pointer' }}>
                <div className="summary-card-top">
                  <span className="summary-card-title">Pending Reviews</span>
                  <span className="summary-card-icon">📝</span>
                </div>
                <div className="summary-card-body">
                  <div className="summary-card-value">{pendingProposalsCount}</div>
                  <span className={`summary-badge ${pendingProposalsCount > 0 ? 'badge-warning' : 'badge-success'}`}>
                    {pendingProposalsCount > 0 ? 'Requires Action' : 'All Reviewed'}
                  </span>
                </div>
                <div className="summary-card-footer">Proposals awaiting approval</div>
              </div>

              <div className="summary-card">
                <div className="summary-card-top">
                  <span className="summary-card-title">Active Milestones</span>
                  <span className="summary-card-icon">🚩</span>
                </div>
                <div className="summary-card-body">
                  <div className="summary-card-value">{milestones.length}</div>
                  <span className="summary-badge badge-info">In Scope</span>
                </div>
                <div className="summary-card-footer">Across active supervised project</div>
              </div>

              <div className="summary-card">
                <div className="summary-card-top">
                  <span className="summary-card-title">High Delay Risk</span>
                  <span className="summary-card-icon">⚠️</span>
                </div>
                <div className="summary-card-body">
                  <div className="summary-card-value" style={{ color: facultyHighRiskCount > 0 ? '#DC2626' : '#111827' }}>
                    {facultyHighRiskCount}
                  </div>
                  <span className={`summary-badge ${facultyHighRiskCount > 0 ? 'badge-danger' : 'badge-success'}`}>
                    {facultyHighRiskCount > 0 ? 'At Risk' : 'Healthy'}
                  </span>
                </div>
                <div className="summary-card-footer">Real AI high risk predictions</div>
              </div>
            </section>

            {/* Empty State when Faculty has 0 assigned projects */}
            {assignedProjects.length === 0 ? (
              <div className="card" style={{ padding: '40px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px dashed #D1D5DB', margin: '20px 0' }}>
                <h3 style={{ fontSize: '18px', color: '#111827', marginBottom: '8px' }}>No Supervised Projects Assigned Yet</h3>
                <p style={{ color: '#6B7280', maxWidth: '520px', margin: '0 auto 16px auto', fontSize: '14px' }}>
                  The Department Coordinator allocates faculty guides to student capstone projects. Once allocated, your assigned projects will appear here for supervision, milestone evaluation, and task allocation.
                </p>
                <button type="button" className="btn-secondary-btn" onClick={() => navigate('/student/proposal')}>
                  Review Department Proposals Queue ({pendingProposalsCount} Pending) &rarr;
                </button>
              </div>
            ) : (
              <>
                {/* Faculty Supervised Projects Selector & Overview */}
                <section className="card" style={{ marginBottom: '24px' }}>
                  <div className="card-header">
                    <h2 className="card-title">Supervised Projects ({assignedProjects.length})</h2>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Select a project to inspect milestones and assign tasks</span>
                  </div>
                  <div style={{ padding: '16px 20px', display: 'flex', gap: '12px', overflowX: 'auto' }}>
                    {assignedProjects.map((p) => {
                      const isSelected = activeProject?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectActiveProject(p)}
                          style={{
                            minWidth: '240px',
                            padding: '14px 16px',
                            borderRadius: '10px',
                            border: `2px solid ${isSelected ? '#2563EB' : '#E2E8F0'}`,
                            background: isSelected ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>#{p.id} • {p.projectType}</span>
                            <span className="status-pill status-progress" style={{ fontSize: '11px', padding: '2px 8px' }}>{p.status}</span>
                          </div>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#0F172A' }}>{p.projectName}</h4>
                          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                            Owner: <strong>{p.owner?.name}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#64748B' }}>Progress:</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>{p.progress || 0}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {activeProject && (
                  <div className="dashboard-two-column-grid">
                    {/* Faculty Feature 1: Milestone Evaluation & Supervisor Feedback */}
                    <div className="dashboard-column">
                      <section className="card">
                        <div className="card-header">
                          <h2 className="card-title">Feature 1: Milestone Evaluation & Feedback</h2>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>{milestones.length} Milestones</span>
                        </div>
                        <div style={{ padding: '16px 20px' }}>
                          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>
                            Record academic guidance and indicate whether milestone deliverable has been reviewed or requires student attention.
                          </p>
                          {milestones.length === 0 ? (
                            <p style={{ color: '#9CA3AF', fontSize: '13px', fontStyle: 'italic' }}>No milestones created by student team yet.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {milestones.map((m) => (
                                <div key={m.id} style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <h4 style={{ margin: 0, fontSize: '14px', color: '#0F172A' }}>{m.title}</h4>
                                    <span className="status-pill status-progress" style={{ fontSize: '11px' }}>{m.status}</span>
                                  </div>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: '#475569' }}>{m.description || 'No description'}</p>
                                  {m.reviewStatus && (
                                    <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginBottom: '8px', fontSize: '12px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: m.reviewStatus === 'REVIEWED' ? '#059669' : m.reviewStatus === 'NEEDS_ATTENTION' ? '#D97706' : '#475569' }}>
                                        <span>Status: {m.reviewStatus}</span>
                                        {m.reviewedBy && <span style={{ color: '#64748B' }}>By {m.reviewedBy}</span>}
                                      </div>
                                      {m.reviewFeedback && <p style={{ margin: '4px 0 0 0', fontStyle: 'italic' }}>"{m.reviewFeedback}"</p>}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEvaluatingMilestone(m);
                                      setEvalStatus(m.reviewStatus || 'REVIEWED');
                                      setEvalFeedback(m.reviewFeedback || '');
                                    }}
                                    style={{
                                      background: '#2563EB',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      padding: '5px 12px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✎ Record Feedback / Evaluate
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>

                    {/* Faculty Feature 2: Task Assignment to Project Students */}
                    <div className="dashboard-column">
                      <section className="card">
                        <div className="card-header">
                          <h2 className="card-title">Feature 2: Assign Tasks to Students</h2>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>{tasks.length} Tasks Recorded</span>
                        </div>
                        <div style={{ padding: '16px 20px' }}>
                          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>
                            Allocate tasks to registered student members of <strong>{activeProject.projectName}</strong>.
                          </p>
                          {tasks.length === 0 ? (
                            <p style={{ color: '#9CA3AF', fontSize: '13px', fontStyle: 'italic' }}>No tasks found for this project.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {tasks.map((t) => (
                                <div key={t.id} style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <h4 style={{ margin: 0, fontSize: '14px', color: '#0F172A' }}>{t.title}</h4>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>{t.priority}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                                    <span>Assigned to: <strong style={{ color: t.assignedToName ? '#059669' : '#DC2626' }}>{t.assignedToName || 'Unassigned'}</strong></span>
                                    <span>Due: {t.dueDate || 'No deadline'}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAssigningTask(t);
                                      setSelectedAssigneeId(t.assignedToId ? String(t.assignedToId) : (teamMembers[0]?.userId ? String(teamMembers[0].userId) : ''));
                                      setTaskPriority(t.priority || 'MEDIUM');
                                      setTaskDueDate(t.dueDate || '');
                                    }}
                                    style={{
                                      background: '#059669',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      padding: '5px 12px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    👤 Assign / Reassign Student
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* =========================================================
            ROLE 3: COORDINATOR DASHBOARD VIEW
            ========================================================= */}
        {isCoordinator && (
          <>
            {/* 7 Real Department-Wide Metrics */}
            <section className="summary-cards-grid" aria-label="Department Metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div className="summary-card" onClick={() => navigate('/student/projects')} style={{ cursor: 'pointer' }}>
                <div className="summary-card-top">
                  <span className="summary-card-title">Total Projects</span>
                  <span className="summary-card-icon">📚</span>
                </div>
                <div className="summary-card-body">
                  <div className="summary-card-value">{totalProjectsCount}</div>
                  <span className="summary-badge badge-info">Department</span>
                </div>
                <div className="summary-card-footer">Registered in MySQL</div>
              </div>

              <div className="summary-card" onClick={() => navigate('/student/proposal')} style={{ cursor: 'pointer' }}>
                <div className="summary-card-top">
                  <span className="summary-card-title">Pending Review</span>
                  <span className="summary-card-icon">⏳</span>
                </div>
                <div className="summary-card-body">
                  <div className="summary-card-value">{coordinatorPendingCount}</div>
                  <span className={`summary-badge ${coordinatorPendingCount > 0 ? 'badge-warning' : 'badge-success'}`}>
                    {coordinatorPendingCount > 0 ? 'Queue' : 'Cleared'}
                  </span>
                </div>
                <div className="summary-card-footer">Awaiting proposal review</div>
              </div>

              <div className="summary-card">
                <div className="summary-card-top">
                  <span className="summary-card-title">Approved</span>
                  <span className="summary-card-icon">✓</span>
                </div>
                <div className="summary-card-body">
                  <div className="summary-card-value" style={{ color: '#059669' }}>{approvedCount}</div>
                  <span className="summary-badge badge-success">Approved</span>
                </div>
                <div className="summary-card-footer">Active academic projects</div>
              </div>

              <div className="summary-card">
                <div className="summary-card-top">
                  <span className="summary-card-title">Rejected</span>
                  <span className="summary-card-icon">✕</span>
                </div>
                <div className="summary-card-body">
                  <div className="summary-card-value" style={{ color: '#DC2626' }}>{rejectedCount}</div>
                  <span className="summary-badge badge-danger">Rejected</span>
                </div>
                <div className="summary-card-footer">Proposals not approved</div>
              </div>

              <div className="summary-card">
                <div className="summary-card-top">
                  <span className="summary-card-title">Unassigned Guide</span>
                  <span className="summary-card-icon">⚠️</span>
                </div>
                <div className="summary-card-body">
                  <div className="summary-card-value" style={{ color: unassignedGuideCount > 0 ? '#D97706' : '#111827' }}>
                    {unassignedGuideCount}
                  </div>
                  <span className={`summary-badge ${unassignedGuideCount > 0 ? 'badge-warning' : 'badge-success'}`}>
                    {unassignedGuideCount > 0 ? 'Needs Guide' : 'All Allocated'}
                  </span>
                </div>
                <div className="summary-card-footer">Require faculty supervisor</div>
              </div>

              <div className="summary-card">
                <div className="summary-card-top">
                  <span className="summary-card-title">High Delay Risk</span>
                  <span className="summary-card-icon">⚡</span>
                </div>
                <div className="summary-card-body">
                  <div className="summary-card-value" style={{ color: coordinatorHighRiskCount > 0 ? '#DC2626' : '#111827' }}>
                    {coordinatorHighRiskCount}
                  </div>
                  <span className={`summary-badge ${coordinatorHighRiskCount > 0 ? 'badge-danger' : 'badge-success'}`}>
                    {coordinatorHighRiskCount > 0 ? 'Critical' : 'Nominal'}
                  </span>
                </div>
                <div className="summary-card-footer">Genuine HIGH AI predictions</div>
              </div>
            </section>

            {/* Coordinator Feature 1: Faculty Workload & Allocation Overview */}
            <section className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <h2 className="card-title">Coordinator Feature 1: Faculty Workload & Assignment Overview</h2>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>{facultyList.length} Registered Faculty Accounts</span>
              </div>
              <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B' }}>
                      <th style={{ padding: '10px 12px' }}>Faculty Supervisor</th>
                      <th style={{ padding: '10px 12px' }}>Institutional Email</th>
                      <th style={{ padding: '10px 12px' }}>Assigned Projects</th>
                      <th style={{ padding: '10px 12px' }}>Pending Review</th>
                      <th style={{ padding: '10px 12px' }}>High Delay Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyList.map((f) => {
                      const fProjects = projects.filter((p) => p.facultyGuideId === f.id || p.facultyGuideEmail === f.email);
                      const fPending = fProjects.filter((p) => p.status === 'PENDING' || p.status === 'PENDING_REVIEW').length;
                      const fHighRisk = fProjects.filter((p) => p.delayRisk === 'HIGH').length;
                      return (
                        <tr key={f.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>{f.name}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{f.email}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontWeight: 700, color: '#2563EB' }}>{fProjects.length}</span> projects
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontWeight: 600, color: fPending > 0 ? '#D97706' : '#64748B' }}>{fPending}</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontWeight: 600, color: fHighRisk > 0 ? '#DC2626' : '#059669' }}>{fHighRisk}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Unassigned Projects Sub-Table with Guide Assignment Control */}
              <div style={{ padding: '0 20px 20px 20px' }}>
                <h3 style={{ fontSize: '15px', color: '#1E293B', marginBottom: '10px', marginTop: '16px' }}>
                  Projects Awaiting Faculty Supervisor Allocation ({unassignedGuideCount})
                </h3>
                {unassignedGuideCount === 0 ? (
                  <p style={{ color: '#059669', fontSize: '13px', margin: 0 }}>✓ All registered projects have an assigned faculty guide.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {projects
                      .filter((p) => !p.facultyGuideId)
                      .map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 14px',
                            background: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            borderRadius: '8px',
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '14px', color: '#92400E' }}>{p.projectName}</strong>
                            <div style={{ fontSize: '12px', color: '#78350F' }}>
                              Owner: {p.owner?.name} • Category: {p.projectType} • Status: {p.status}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                              value={selectedGuideForProject[p.id] || ''}
                              onChange={(e) =>
                                setSelectedGuideForProject((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #D97706',
                                fontSize: '12.5px',
                                background: '#FFFFFF',
                              }}
                            >
                              <option value="">-- Choose Faculty Guide --</option>
                              {facultyList.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name} ({f.email})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAssignGuide(p.id)}
                              style={{
                                background: '#D97706',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Assign Guide
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </section>

            {/* Coordinator Feature 2: Departmental Review History & Follow-Up Tracking */}
            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Coordinator Feature 2: Department Review History & Follow-Up Tracking</h2>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Audit & Governance</span>
              </div>
              <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B' }}>
                      <th style={{ padding: '10px' }}>Project</th>
                      <th style={{ padding: '10px' }}>Owner</th>
                      <th style={{ padding: '10px' }}>Faculty Guide</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px' }}>Review Info</th>
                      <th style={{ padding: '10px' }}>AI Risk</th>
                      <th style={{ padding: '10px' }}>Coordinator Note</th>
                      <th style={{ padding: '10px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: '#0F172A' }}>{p.projectName}</td>
                        <td style={{ padding: '10px', color: '#475569' }}>{p.owner?.name}</td>
                        <td style={{ padding: '10px', color: p.facultyGuideName ? '#0F172A' : '#DC2626' }}>
                          {p.facultyGuideName || 'Unassigned'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span className="status-pill status-progress" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontSize: '12px', color: '#475569' }}>
                          {p.reviewedBy ? (
                            <div>
                              <div>Reviewed by: <strong>{p.reviewedBy}</strong></div>
                              {p.reviewFeedback && <div style={{ fontStyle: 'italic', color: '#059669' }}>"{p.reviewFeedback}"</div>}
                            </div>
                          ) : (
                            <span style={{ color: '#9CA3AF' }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: p.delayRisk === 'HIGH' ? '#DC2626' : p.delayRisk === 'MEDIUM' ? '#D97706' : '#059669',
                            }}
                          >
                            {p.delayRisk || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontSize: '12px' }}>
                          {p.coordinatorNotes ? (
                            <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                              <div>"{p.coordinatorNotes}"</div>
                              <div style={{ fontSize: '10.5px', color: '#64748B' }}>By {p.coordinatorNotesAuthor}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#9CA3AF' }}>No notes</span>
                          )}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setFollowUpProject(p);
                              setFollowUpNotes(p.coordinatorNotes || '');
                            }}
                            style={{
                              background: '#2563EB',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '5px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ✎ Note
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* =========================================================
            MODAL: CREATE USER ACCOUNT (Faculty -> Student; Coordinator -> Student/Faculty)
            ========================================================= */}
        {showCreateUserModal && (
          <div className="modal-overlay" onClick={() => { setShowCreateUserModal(false); setShowUserPassword(false); setShowUserConfirmPassword(false); }}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="modal-head">
                <h3>{isFaculty ? 'Add Student Account' : 'Provision User Account'}</h3>
                <button type="button" className="btn-close" onClick={() => { setShowCreateUserModal(false); setShowUserPassword(false); setShowUserConfirmPassword(false); }}>✕</button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-content-body">
                  {userModalError && (
                    <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
                      ⚠️ {userModalError}
                    </div>
                  )}

                  {isCoordinator && (
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        Account Role *
                      </label>
                      <select
                        value={userFormData.role}
                        onChange={(e) => setUserFormData((prev) => ({ ...prev, role: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                      >
                        <option value="STUDENT">STUDENT (Student Member)</option>
                        <option value="FACULTY">FACULTY (Faculty Supervisor / Guide)</option>
                      </select>
                    </div>
                  )}

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={userFormData.name}
                      onChange={(e) => setUserFormData((prev) => ({ ...prev, name: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Institutional Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh.student@university.edu"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData((prev) => ({ ...prev, email: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                        Initial Password * (min 8 chars)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowUserPassword((prev) => !prev)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        {showUserPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showUserPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData((prev) => ({ ...prev, password: e.target.value }))}
                        style={{ width: '100%', padding: '8px 38px 8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPassword((prev) => !prev)}
                        title={showUserPassword ? 'Hide password' : 'Show password'}
                        aria-label={showUserPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {showUserPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                        Confirm Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowUserConfirmPassword((prev) => !prev)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        {showUserConfirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showUserConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={userFormData.confirmPassword}
                        onChange={(e) => setUserFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        style={{ width: '100%', padding: '8px 38px 8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserConfirmPassword((prev) => !prev)}
                        title={showUserConfirmPassword ? 'Hide password' : 'Show password'}
                        aria-label={showUserConfirmPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {showUserConfirmPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4B5563', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={showUserPassword && showUserConfirmPassword}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setShowUserPassword(val);
                            setShowUserConfirmPassword(val);
                          }}
                          style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#2563EB' }}
                        />
                        Show password
                      </label>
                    </div>
                  </div>

                  {userFormData.role === 'STUDENT' && projects.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        Optional: Assign to Project Team
                      </label>
                      <select
                        value={userFormData.assignProjectId}
                        onChange={(e) => setUserFormData((prev) => ({ ...prev, assignProjectId: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                      >
                        <option value="">-- Do not assign to project yet --</option>
                        {(isFaculty ? assignedProjects : projects).map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.id} • {p.projectName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary-btn" onClick={() => { setShowCreateUserModal(false); setShowUserPassword(false); setShowUserConfirmPassword(false); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-create-project" disabled={isSubmittingUser}>
                    {isSubmittingUser ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL: FACULTY MILESTONE EVALUATION
            ========================================================= */}
        {evaluatingMilestone && (
          <div className="modal-overlay" onClick={() => setEvaluatingMilestone(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="modal-head">
                <h3>Evaluate Milestone: {evaluatingMilestone.title}</h3>
                <button type="button" className="btn-close" onClick={() => setEvaluatingMilestone(null)}>✕</button>
              </div>
              <form onSubmit={handleSaveMilestoneEval}>
                <div className="modal-content-body">
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Review Status *
                    </label>
                    <select
                      value={evalStatus}
                      onChange={(e) => setEvalStatus(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    >
                      <option value="REVIEWED">✓ REVIEWED (Satisfactory Progress)</option>
                      <option value="NEEDS_ATTENTION">⚠️ NEEDS_ATTENTION (Revisions Required)</option>
                      <option value="PENDING_REVIEW">⏳ PENDING_REVIEW (Under Evaluation)</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Academic Feedback / Recommendations *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Provide specific feedback on deliverables, architecture diagrams, or literature review completeness..."
                      value={evalFeedback}
                      onChange={(e) => setEvalFeedback(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary-btn" onClick={() => setEvaluatingMilestone(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-create-project" disabled={isSubmittingEval}>
                    {isSubmittingEval ? 'Saving...' : 'Save Evaluation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL: FACULTY TASK ASSIGNMENT
            ========================================================= */}
        {assigningTask && (
          <div className="modal-overlay" onClick={() => setAssigningTask(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="modal-head">
                <h3>Assign Task: {assigningTask.title}</h3>
                <button type="button" className="btn-close" onClick={() => setAssigningTask(null)}>✕</button>
              </div>
              <form onSubmit={handleSaveTaskAssign}>
                <div className="modal-content-body">
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Assignee (Project Team Member) *
                    </label>
                    <select
                      value={selectedAssigneeId}
                      onChange={(e) => setSelectedAssigneeId(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    >
                      <option value="">-- Choose Eligible Student Member --</option>
                      {/* Project owner */}
                      {activeProject?.owner && (
                        <option value={activeProject.owner.id}>
                          {activeProject.owner.name} ({activeProject.owner.email}) [Owner / Lead]
                        </option>
                      )}
                      {/* Other registered team members */}
                      {teamMembers
                        .filter((m) => m.userId && m.userId !== activeProject?.owner?.id)
                        .map((m) => (
                          <option key={m.id} value={m.userId}>
                            {m.name} ({m.email}) [{m.role || 'Member'}]
                          </option>
                        ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        Priority
                      </label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                        Deadline
                      </label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary-btn" onClick={() => setAssigningTask(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-create-project" disabled={isSubmittingTaskAssign}>
                    {isSubmittingTaskAssign ? 'Saving...' : 'Save Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL: COORDINATOR FOLLOW-UP NOTE
            ========================================================= */}
        {followUpProject && (
          <div className="modal-overlay" onClick={() => setFollowUpProject(null)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="modal-head">
                <h3>Follow-Up Note: {followUpProject.projectName}</h3>
                <button type="button" className="btn-close" onClick={() => setFollowUpProject(null)}>✕</button>
              </div>
              <form onSubmit={handleSaveFollowUp}>
                <div className="modal-content-body">
                  <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>
                    Record an internal departmental follow-up note to track project compliance, guide contact, or remedial deadlines.
                  </p>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                      Follow-up Note *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="e.g. Advised student team to submit revised SRS document before October 30..."
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div className="modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn-secondary-btn" onClick={() => setFollowUpProject(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-create-project" disabled={isSubmittingFollowUp}>
                    {isSubmittingFollowUp ? 'Saving...' : 'Save Note'}
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

export default StudentDashboard;
