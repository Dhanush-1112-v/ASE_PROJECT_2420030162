import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import StudentLayout from '../../components/layout/StudentLayout';
import { projectsApi, tasksApi, teamApi } from '../../services/api';
import './Tasks.css';

/**
 * Tasks Component
 * Route: /student/tasks
 */
function Tasks() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    assignedToId: '',
  });

  // Fetch projects owned by student
  useEffect(() => {
    let mounted = true;
    async function loadProjects() {
      setIsLoadingProjects(true);
      try {
        const list = await projectsApi.getAll();
        if (mounted) {
          setProjects(Array.isArray(list) ? list : []);
          if (Array.isArray(list) && list.length > 0) {
            setSelectedProjectId(list[0].id);
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load projects.');
      } finally {
        if (mounted) setIsLoadingProjects(false);
      }
    }
    loadProjects();
    return () => { mounted = false; };
  }, []);

  // Fetch tasks and team members when selectedProjectId changes
  const fetchTasks = useCallback(async (projectId) => {
    if (!projectId) return;
    setIsLoadingTasks(true);
    setError(null);
    try {
      const [tasksRes, teamRes] = await Promise.allSettled([
        projectsApi.getTasks(projectId),
        teamApi.getByProject(projectId),
      ]);
      setTasks(tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value) ? tasksRes.value : []);
      setTeamMembers(teamRes.status === 'fulfilled' && Array.isArray(teamRes.value) ? teamRes.value : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch project tasks.');
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (selectedProjectId) {
      timer = setTimeout(() => {
        fetchTasks(selectedProjectId);
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [selectedProjectId, fetchTasks]);

  const filteredTasks = tasks.filter((task) => {
    const tStatus = (task.status || 'PENDING').toUpperCase();
    const tPriority = (task.priority || 'MEDIUM').toUpperCase();

    const matchStatus =
      statusFilter === 'All' ||
      tStatus === statusFilter.toUpperCase().replace(/\s+/g, '_');
    const matchPriority =
      priorityFilter === 'All' ||
      tPriority === priorityFilter.toUpperCase();

    return matchStatus && matchPriority;
  });

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Please select or create a project first.');
      return;
    }
    if (!newTask.title.trim()) {
      alert('Please provide a task title.');
      return;
    }

    setIsSubmittingTask(true);
    try {
      await tasksApi.create({
        projectId: selectedProjectId,
        title: newTask.title.trim(),
        description: newTask.description ? newTask.description.trim() : '',
        priority: newTask.priority.toUpperCase(),
        dueDate: newTask.dueDate || null,
        assignedToId: newTask.assignedToId ? Number(newTask.assignedToId) : null,
      });

      setShowAddModal(false);
      setNewTask({
        title: '',
        description: '',
        dueDate: '',
        priority: 'MEDIUM',
        assignedToId: '',
      });
      setNotification('Task successfully created in database!');
      setTimeout(() => setNotification(null), 4000);
      fetchTasks(selectedProjectId);
    } catch (err) {
      alert(err.message || 'Failed to create task.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleStatusChange = async (taskId, newStatusValue) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const normalizedStatus = newStatusValue.toUpperCase().replace(/\s+/g, '_');
    const newProgress = normalizedStatus === 'COMPLETED' ? 100 : (targetTask.progress === 100 ? 50 : targetTask.progress || 0);

    // Optimistic UI update
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: normalizedStatus, progress: newProgress } : t)));

    try {
      await tasksApi.update(taskId, {
        title: targetTask.title,
        description: targetTask.description,
        priority: targetTask.priority,
        status: normalizedStatus,
        progress: newProgress,
        dueDate: targetTask.dueDate,
      });
      fetchTasks(selectedProjectId);
    } catch (err) {
      alert(err.message || 'Failed to update task.');
      fetchTasks(selectedProjectId);
    }
  };

  const handleProgressChange = async (taskId, newProgressValue) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const progressNum = Math.min(100, Math.max(0, parseInt(newProgressValue, 10) || 0));
    const normalizedStatus = progressNum === 100 ? 'COMPLETED' : progressNum > 0 ? 'IN_PROGRESS' : 'PENDING';

    try {
      await tasksApi.update(taskId, {
        title: targetTask.title,
        description: targetTask.description,
        priority: targetTask.priority,
        status: normalizedStatus,
        progress: progressNum,
        dueDate: targetTask.dueDate,
      });
      fetchTasks(selectedProjectId);
    } catch (err) {
      alert(err.message || 'Failed to update task progress.');
      fetchTasks(selectedProjectId);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksApi.delete(taskId);
      setNotification('Task deleted successfully.');
      setTimeout(() => setNotification(null), 4000);
      fetchTasks(selectedProjectId);
    } catch (err) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  const getPriorityClass = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'critical':
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase().replace(/_/g, ' ');
    if (s.includes('complet')) return 'status-completed';
    if (s.includes('progress')) return 'status-progress';
    return 'status-pending';
  };

  const formatStatusDisplay = (status) => {
    const s = (status || '').toUpperCase().replace(/_/g, ' ');
    if (s.includes('COMPLET')) return 'Completed';
    if (s.includes('PROGRESS')) return 'In Progress';
    return 'Pending';
  };

  return (
    <StudentLayout pageTitle="Tasks">
      <div className="tasks-page">
        {/* Top Header Row */}
        <div className="tasks-header-row">
          <div>
            <h1 className="tasks-title">Sprint Tasks</h1>
            <p className="tasks-subtitle">
              Manage work packages, allocate assignments, and monitor completion progress.
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
                    <option key={p.id} value={p.id} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                      {p.projectName} (#{p.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              className="btn-add-task"
              onClick={() => setShowAddModal(true)}
              disabled={projects.length === 0}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="btn-icon">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Alert Notification */}
        {notification && (
          <div className="alert-banner alert-success">
            <span>✓ {notification}</span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="alert-banner alert-error" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #F87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* No Projects Notice */}
        {!isLoadingProjects && projects.length === 0 && (
          <div className="card" style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', color: '#111827', marginBottom: '8px' }}>No Active Project Found</h3>
            <p style={{ color: '#6B7280', marginBottom: '20px', fontSize: '14px' }}>
              Tasks are associated with specific academic projects. Please submit a project proposal first to begin task tracking.
            </p>
            <Link to="/student/proposal" className="btn-add-task" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              Submit Project Proposal &rarr;
            </Link>
          </div>
        )}

        {/* Filters Row */}
        {projects.length > 0 && (
          <div className="card filters-card">
            <div className="filters-row">
              <div className="filter-group">
                <label>Filter by Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses ({tasks.length})</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Filter by Priority:</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="All">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="filter-stats">
                Showing <strong>{filteredTasks.length}</strong> tasks
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoadingTasks && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
            <p>Loading project tasks from database...</p>
          </div>
        )}

        {/* Tasks List */}
        {!isLoadingTasks && projects.length > 0 && (
          <div className="tasks-list">
            {filteredTasks.map((task) => (
              <div key={task.id} className="card task-card-item">
                <div className="task-card-main">
                  <div className="task-header-line">
                    <span className={`priority-pill ${getPriorityClass(task.priority)}`}>
                      {task.priority || 'MEDIUM'} Priority
                    </span>
                    <span className="task-due-date">
                      {task.dueDate ? `Due: ${task.dueDate}` : 'No due date'}
                    </span>
                  </div>

                  <h3 className="task-title-text">{task.title}</h3>
                  <p className="task-description-text">{task.description || 'No description provided.'}</p>

                  <div className="task-meta-footer">
                    <div className="task-assignee">
                      <span className="assignee-label">Assignee:</span>
                      <span className="assignee-name" style={{ color: task.assignedToName ? '#2563EB' : '#6B7280', fontWeight: 600 }}>
                        {task.assignedToName ? task.assignedToName : 'Unassigned'}
                      </span>
                    </div>

                    {/* Progress Slider / Bar */}
                    <div className="task-progress-box">
                      <div className="progress-bar-label">
                        <span>Progress</span>
                        <strong>{task.progress || 0}%</strong>
                      </div>
                      <div className="task-progress-track">
                        <div
                          className="task-progress-fill"
                          style={{ width: `${Math.min(100, Math.max(0, task.progress || 0))}%` }}
                        ></div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={task.progress || 0}
                        onChange={(e) => handleProgressChange(task.id, e.target.value)}
                        style={{ width: '100%', marginTop: '6px', cursor: 'pointer' }}
                        title="Slide to update progress percentage"
                      />
                    </div>

                    {/* Quick status selector */}
                    <div className="task-status-control" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        className={`status-dropdown ${getStatusClass(task.status)}`}
                        value={formatStatusDisplay(task.status)}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#DC2626',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          fontSize: '13px',
                        }}
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="empty-tasks-card card">
                <p>No tasks found for this project matching the selected filters.</p>
                <button
                  type="button"
                  className="btn-clear-filters"
                  onClick={() => {
                    setStatusFilter('All');
                    setPriorityFilter('All');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal: Add Task */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => !isSubmittingTask && setShowAddModal(false)}>
            <div className="modal-dialog modal-form" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Create New Task in Project #{selectedProjectId}</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => !isSubmittingTask && setShowAddModal(false)}
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddTask} className="modal-form-body">
                <div className="form-group-item">
                  <label>Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Conduct pilot user tests for portal"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    disabled={isSubmittingTask}
                  />
                </div>

                <div className="form-group-item">
                  <label>Description</label>
                  <textarea
                    rows="2"
                    placeholder="Brief description of requirements..."
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    disabled={isSubmittingTask}
                  ></textarea>
                </div>

                <div className="form-row-two">
                  <div className="form-group-item">
                    <label>Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) =>
                        setNewTask({ ...newTask, priority: e.target.value })
                      }
                      disabled={isSubmittingTask}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div className="form-group-item">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask({ ...newTask, dueDate: e.target.value })
                      }
                      disabled={isSubmittingTask}
                    />
                  </div>
                </div>

                <div className="form-group-item">
                  <label>Assign to Team Member</label>
                  <select
                    value={newTask.assignedToId}
                    onChange={(e) =>
                      setNewTask({ ...newTask, assignedToId: e.target.value })
                    }
                    disabled={isSubmittingTask}
                  >
                    <option value="">-- Unassigned --</option>
                    {teamMembers.map((m) => {
                      const currentProj = projects.find((p) => p.id === selectedProjectId);
                      const isOwner = m.isLeader || (currentProj?.owner && currentProj.owner.email === m.email);
                      const assignId = m.userId || (isOwner && currentProj?.owner?.id) || (m.id > 0 ? m.id : '');
                      return (
                        <option key={m.id} value={assignId}>
                          {m.name} ({m.email}) {isOwner ? '[Owner / Lead]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="modal-foot-actions">
                  <button
                    type="button"
                    className="btn-secondary-btn"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmittingTask}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-submit"
                    disabled={isSubmittingTask}
                  >
                    {isSubmittingTask ? 'Saving to Database...' : 'Add Task'}
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

export default Tasks;
