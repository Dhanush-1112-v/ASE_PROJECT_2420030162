import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import StudentLayout from '../../components/layout/StudentLayout';
import { projectsApi, predictionsApi } from '../../services/api';
import './RiskPrediction.css';

/**
 * RiskPrediction Component
 * Route: /student/risk
 * Integrates with Spring Boot backend (/api/predictions) and FastAPI Random Forest engine.
 */
function RiskPrediction() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);

  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showDetailedModal, setShowDetailedModal] = useState(false);

  // 11 Model Features State
  const [features, setFeatures] = useState({
    attendance: 85.0,
    studyHours: 15.0,
    previousPerformance: 80.0,
    taskCompletion: 70.0,
    pendingTasks: 3,
    missedDeadlines: 0,
    milestoneCompletion: 65.0,
    daysRemaining: 28,
    teamSize: 4,
    projectType: 'AI',
    projectProgress: 60.0,
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Load projects on mount
  useEffect(() => {
    let mounted = true;
    async function loadProjects() {
      setIsLoadingProjects(true);
      try {
        const list = await projectsApi.getAll();
        if (mounted) {
          const valid = Array.isArray(list) ? list : [];
          setProjects(valid);
          if (valid.length > 0) {
            const first = valid[0];
            setSelectedProjectId(first.id);
            setFeatures((prev) => ({
              ...prev,
              projectType: first.projectType || 'AI',
              projectProgress: first.progress || 0,
            }));
          }
        }
      } catch (err) {
        if (mounted) setErrorMessage(err.message || 'Failed to load projects.');
      } finally {
        if (mounted) setIsLoadingProjects(false);
      }
    }
    loadProjects();
    return () => { mounted = false; };
  }, []);

  const handleSelectProject = (projectId) => {
    const id = Number(projectId);
    setSelectedProjectId(id);
    const proj = projects.find((p) => p.id === id);
    if (proj) {
      setFeatures((prev) => ({
        ...prev,
        projectType: proj.projectType || 'AI',
        projectProgress: proj.progress || 0,
      }));
    }
  };

  // Load prediction history for selected project
  const fetchPredictionHistory = useCallback(async (projectId) => {
    if (!projectId) return;
    setIsLoadingHistory(true);
    setErrorMessage(null);
    try {
      const history = await projectsApi.getPredictions(projectId);
      if (Array.isArray(history)) {
        setPredictionHistory(history);
        if (history.length > 0) {
          setLatestPrediction(history[0]);
        } else {
          setLatestPrediction(null);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch prediction history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadHistory() {
      if (!selectedProjectId) {
        setPredictionHistory([]);
        setLatestPrediction(null);
        return;
      }
      setIsLoadingHistory(true);
      setErrorMessage(null);
      try {
        const history = await projectsApi.getPredictions(selectedProjectId);
        if (!ignore && Array.isArray(history)) {
          setPredictionHistory(history);
          setLatestPrediction(history.length > 0 ? history[0] : null);
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err.message || 'Failed to fetch prediction history.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingHistory(false);
        }
      }
    }
    loadHistory();
    return () => {
      ignore = true;
    };
  }, [selectedProjectId]);

  const handleFeatureChange = (e) => {
    const { name, value, type } = e.target;
    setFeatures((prev) => ({
      ...prev,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value,
    }));
  };

  const handleRunPrediction = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Please select a project first.');
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      projectId: selectedProjectId,
      attendance: Number(features.attendance),
      studyHours: Number(features.studyHours),
      previousPerformance: Number(features.previousPerformance),
      taskCompletion: Number(features.taskCompletion),
      pendingTasks: parseInt(features.pendingTasks, 10),
      missedDeadlines: parseInt(features.missedDeadlines, 10),
      milestoneCompletion: Number(features.milestoneCompletion),
      daysRemaining: parseInt(features.daysRemaining, 10),
      teamSize: parseInt(features.teamSize, 10),
      projectType: features.projectType,
      projectProgress: Number(features.projectProgress),
    };

    try {
      const result = await predictionsApi.predict(payload);
      setLatestPrediction(result);
      setSuccessMessage(
        `AI delay risk calculated: ${result.risk} (Model Confidence: ${(result.probability * 100).toFixed(1)}%). Saved to MySQL history.`
      );
      fetchPredictionHistory(selectedProjectId);
    } catch (err) {
      setErrorMessage(err.message || 'Prediction failed.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const getRiskBadgeClass = (risk) => {
    switch ((risk || '').toUpperCase()) {
      case 'LOW':
        return 'badge-low';
      case 'MEDIUM':
        return 'badge-medium';
      case 'HIGH':
        return 'badge-high';
      default:
        return 'badge-medium';
    }
  };

  const getGaugeClass = (risk) => {
    switch ((risk || '').toUpperCase()) {
      case 'LOW':
        return 'gauge-green';
      case 'MEDIUM':
        return 'gauge-amber';
      case 'HIGH':
        return 'gauge-red';
      default:
        return 'gauge-amber';
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Just now';
    try {
      const date = new Date(ts);
      return date.toLocaleString();
    } catch {
      return String(ts);
    }
  };

  return (
    <StudentLayout pageTitle="Risk Prediction">
      <div className="risk-page">
        {/* Page Header */}
        <div className="risk-header-row">
          <div>
            <h1 className="risk-page-title">Risk Prediction &amp; Analytics</h1>
            <p className="risk-page-subtitle">
              Machine learning risk assessment engine forecasting project delay probabilities.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {projects.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Project:</label>
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    background: '#FFFFFF',
                    maxWidth: '260px',
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

            <div className="prediction-time-pill">
              <span>
                Last Evaluated:{' '}
                <strong>
                  {latestPrediction ? formatTimestamp(latestPrediction.createdAt) : 'Never'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="alert-banner alert-success" style={{ background: '#DEF7EC', color: '#03543F', border: '1px solid #31C48D', padding: '12px 16px', borderRadius: '8px' }}>
            <span>✓ {successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-banner alert-error" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #F87171', padding: '12px 16px', borderRadius: '8px' }}>
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* No Projects Guard */}
        {!isLoadingProjects && projects.length === 0 && (
          <div className="card" style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', color: '#111827', marginBottom: '8px' }}>No Active Project Found</h3>
            <p style={{ color: '#6B7280', marginBottom: '20px', fontSize: '14px' }}>
              Risk evaluation requires an existing academic project record in MySQL.
            </p>
            <Link to="/student/proposal" className="btn-create-project" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              Submit Project Proposal &rarr;
            </Link>
          </div>
        )}

        {/* Top Summary Metric Cards */}
        {selectedProjectId && (
          <div className="risk-metrics-grid">
            {/* Main Risk Gauge Card */}
            <div className="card risk-score-hero-card">
              <span className="hero-card-label">Predicted Delay Risk</span>
              <div className="hero-badge-wrap">
                <span className={`risk-badge-big ${getRiskBadgeClass(latestPrediction?.risk)}`}>
                  {latestPrediction ? `${latestPrediction.risk} Risk` : 'Not Evaluated'}
                </span>
              </div>

              <div className="risk-numeric-display">
                <span className="score-big">
                  {latestPrediction ? Math.round(latestPrediction.probability * 100) : '--'}
                </span>
                <span className="score-max">% confidence</span>
              </div>

              <p className="risk-category-caption">
                {latestPrediction
                  ? `Classified by Random Forest as ${latestPrediction.risk} Delay Risk`
                  : 'Submit model telemetry below to calculate delay risk'}
              </p>

              {/* Gauge progress bar */}
              <div className="gauge-track">
                <div
                  className={`gauge-fill ${getGaugeClass(latestPrediction?.risk)}`}
                  style={{
                    width: latestPrediction
                      ? `${Math.max(10, Math.min(100, Math.round(latestPrediction.probability * 100)))}%`
                      : '0%',
                  }}
                ></div>
              </div>

              <div className="gauge-scale-labels">
                <span>Low Risk</span>
                <span>Medium Risk</span>
                <span>High Risk</span>
              </div>
            </div>

            {/* Model Meta Card */}
            <div className="card model-meta-card">
              <h3 className="model-meta-title">Prediction Diagnostics</h3>
              <div className="diagnostics-list">
                <div className="diag-item">
                  <span className="diag-key">Algorithm:</span>
                  <span className="diag-val">Scikit-learn Random Forest Classifier</span>
                </div>
                <div className="diag-item">
                  <span className="diag-key">Model Confidence:</span>
                  <span className="diag-val confidence-good">
                    {latestPrediction ? `${(latestPrediction.probability * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="diag-item">
                  <span className="diag-key">Target Project:</span>
                  <span className="diag-val">
                    {selectedProject ? `${selectedProject.projectName} (#${selectedProject.id})` : 'N/A'}
                  </span>
                </div>
                <div className="diag-item">
                  <span className="diag-key">Historical Runs:</span>
                  <span className="diag-val">{predictionHistory.length} recorded</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-view-detailed-risk"
                onClick={() => setShowDetailedModal(true)}
              >
                View Feature Schema &amp; Diagnostics &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Feature Input Form for Real Prediction */}
        {selectedProjectId && (
          <div className="card" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
                  Project Telemetry Features (11 AI Model Inputs)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
                  Adjust sprint parameters to compute real-time delay probability via FastAPI and save the result in MySQL.
                </p>
              </div>
            </div>

            <form onSubmit={handleRunPrediction}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Student Attendance (%)
                  </label>
                  <input
                    type="number"
                    name="attendance"
                    min="0"
                    max="100"
                    step="0.5"
                    value={features.attendance}
                    onChange={handleFeatureChange}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Weekly Study Hours
                  </label>
                  <input
                    type="number"
                    name="studyHours"
                    min="0"
                    max="80"
                    step="0.5"
                    value={features.studyHours}
                    onChange={handleFeatureChange}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Prior Academic Score (%)
                  </label>
                  <input
                    type="number"
                    name="previousPerformance"
                    min="0"
                    max="100"
                    step="0.5"
                    value={features.previousPerformance}
                    onChange={handleFeatureChange}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Task Completion Rate (%)
                  </label>
                  <input
                    type="number"
                    name="taskCompletion"
                    min="0"
                    max="100"
                    step="0.5"
                    value={features.taskCompletion}
                    onChange={handleFeatureChange}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Pending Backlog Tasks
                  </label>
                  <input
                    type="number"
                    name="pendingTasks"
                    min="0"
                    max="50"
                    value={features.pendingTasks}
                    onChange={handleFeatureChange}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Missed Deadlines
                  </label>
                  <input
                    type="number"
                    name="missedDeadlines"
                    min="0"
                    max="20"
                    value={features.missedDeadlines}
                    onChange={handleFeatureChange}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Milestone Completion (%)
                  </label>
                  <input
                    type="number"
                    name="milestoneCompletion"
                    min="0"
                    max="100"
                    step="0.5"
                    value={features.milestoneCompletion}
                    onChange={handleFeatureChange}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Days Remaining to Viva
                  </label>
                  <input
                    type="number"
                    name="daysRemaining"
                    min="0"
                    max="365"
                    value={features.daysRemaining}
                    onChange={handleFeatureChange}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Team Size
                  </label>
                  <input
                    type="number"
                    name="teamSize"
                    min="1"
                    max="10"
                    value={features.teamSize}
                    onChange={handleFeatureChange}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Project Type
                  </label>
                  <select
                    name="projectType"
                    value={features.projectType}
                    onChange={handleFeatureChange}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  >
                    <option value="AI">AI</option>
                    <option value="Web">Web</option>
                    <option value="Mobile">Mobile</option>
                    <option value="IoT">IoT</option>
                    <option value="Research">Research</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                    Project Progress (%)
                  </label>
                  <input
                    type="number"
                    name="projectProgress"
                    min="0"
                    max="100"
                    step="0.5"
                    value={features.projectProgress}
                    onChange={handleFeatureChange}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isEvaluating}
                className="btn-create-project"
                style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 600 }}
              >
                {isEvaluating ? 'Evaluating with AI Model...' : '⚡ Calculate & Persist Delay Risk'}
              </button>
            </form>
          </div>
        )}

        {/* Prediction History Table */}
        {selectedProjectId && (
          <div className="card" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#111827' }}>
              Persisted Prediction History (Project #{selectedProjectId})
            </h3>

            {isLoadingHistory && <p style={{ color: '#6B7280' }}>Loading prediction history...</p>}

            {!isLoadingHistory && predictionHistory.length === 0 && (
              <p style={{ color: '#6B7280', fontSize: '14px' }}>
                No prediction history found for this project yet. Use the form above to evaluate risk.
              </p>
            )}

            {!isLoadingHistory && predictionHistory.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#4B5563' }}>
                      <th style={{ padding: '10px 12px' }}>ID</th>
                      <th style={{ padding: '10px 12px' }}>Timestamp</th>
                      <th style={{ padding: '10px 12px' }}>Predicted Risk</th>
                      <th style={{ padding: '10px 12px' }}>Confidence Probability</th>
                      <th style={{ padding: '10px 12px' }}>Target Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictionHistory.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>#{item.id}</td>
                        <td style={{ padding: '10px 12px', color: '#6B7280' }}>{formatTimestamp(item.createdAt)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`status-pill ${item.risk === 'LOW' ? 'status-completed' : item.risk === 'HIGH' ? 'alert-error' : 'status-progress'}`} style={{ padding: '2px 10px', fontSize: '12px' }}>
                            {item.risk}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                          {(item.probability * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px 12px' }}>{item.projectName || `#${item.projectId}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Detailed Diagnostic Rationale */}
        {showDetailedModal && (
          <div className="modal-overlay" onClick={() => setShowDetailedModal(false)}>
            <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Random Forest Model Architecture &amp; Feature Weights</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDetailedModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-content-body">
                <div className="detailed-modal-score-box">
                  <span className={`risk-modal-badge ${getRiskBadgeClass(latestPrediction?.risk)}`}>
                    Latest Status: {latestPrediction ? `${latestPrediction.risk} Risk (${(latestPrediction.probability * 100).toFixed(1)}%)` : 'Not Evaluated'}
                  </span>
                  <p>
                    The prediction index is calculated using a Scikit-Learn Random Forest Pipeline trained on student academic project datasets.
                  </p>
                </div>

                <div className="modal-weights-table">
                  <h5>Input Features Schema:</h5>
                  <ul>
                    <li><strong>Attendance &amp; Study Hours:</strong> Student effort and engagement factors</li>
                    <li><strong>Task Completion &amp; Backlog:</strong> Sprint execution tracking</li>
                    <li><strong>Missed Deadlines:</strong> Historical milestone slippage indicator</li>
                    <li><strong>Milestone Completion &amp; Days Remaining:</strong> Proximity to evaluation defense</li>
                    <li><strong>Project Type &amp; Progress:</strong> Domain complexity scaling</li>
                  </ul>
                </div>
              </div>
              <div className="modal-foot">
                <button
                  type="button"
                  className="btn-secondary-btn"
                  onClick={() => setShowDetailedModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

export default RiskPrediction;
