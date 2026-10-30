import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/layout/StudentLayout';
import { projectsApi, documentsApi } from '../../services/api';
import './Documents.css';

/**
 * Documents Component
 * Route: /student/documents
 * Manages project deliverables with real file uploads and authenticated binary downloads from backend.
 */
function Documents() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('PDF Document');
  const [isUploading, setIsUploading] = useState(false);

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

  // Fetch documents for selected project
  const fetchDocuments = useCallback(async (projectId) => {
    if (!projectId) {
      setDocuments([]);
      return;
    }
    setIsLoadingDocuments(true);
    setError(null);
    try {
      const data = await documentsApi.getByProject(projectId);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedProjectId) {
        fetchDocuments(selectedProjectId);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedProjectId, fetchDocuments]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name);
      }
      if (file.name.toLowerCase().endsWith('.pdf')) setDocCategory('PDF Document');
      else if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) setDocCategory('Word Document');
      else if (file.name.toLowerCase().endsWith('.pptx') || file.name.toLowerCase().endsWith('.ppt')) setDocCategory('Presentation');
      else setDocCategory('Project File');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    if (!selectedFile) {
      setModalError('Please select a file from your device.');
      return;
    }

    setIsUploading(true);
    setModalError(null);
    try {
      const uploaded = await documentsApi.upload(
        selectedProjectId,
        selectedFile,
        docTitle.trim() || selectedFile.name,
        docCategory
      );

      setShowUploadModal(false);
      setSelectedFile(null);
      setDocTitle('');
      setNotification(`"${uploaded.name}" successfully uploaded and saved in database!`);
      setTimeout(() => setNotification(null), 4000);
      fetchDocuments(selectedProjectId);
    } catch (err) {
      setModalError(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      await documentsApi.download(doc.id, doc.name);
      setNotification(`Download completed for: ${doc.name}`);
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      alert(err.message || `Failed to download "${doc.name}".`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (docId, docName) => {
    const confirmDelete = window.confirm(`Delete document "${docName}" permanently?`);
    if (!confirmDelete) return;

    try {
      await documentsApi.delete(docId);
      setNotification(`"${docName}" was removed.`);
      setTimeout(() => setNotification(null), 3500);
      fetchDocuments(selectedProjectId);
    } catch (err) {
      alert(err.message || 'Failed to delete document.');
    }
  };

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved')) return 'status-completed';
    if (s.includes('review') || s.includes('progress')) return 'status-progress';
    return 'status-pending';
  };

  return (
    <StudentLayout pageTitle="Documents">
      <div className="documents-page">
        {/* Header */}
        <div className="documents-header-row">
          <div>
            <h1 className="documents-title">Project Documents</h1>
            <p className="documents-subtitle">
              Upload deliverables, access evaluation files, and download project reports from database.
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
                className="btn-upload-document"
                onClick={() => {
                  setModalError(null);
                  setShowUploadModal(true);
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="btn-icon">
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Upload Document</span>
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
              Document deliverables must be linked to an academic project. Please create a project first.
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
        {isLoadingDocuments && (
          <div style={{ textAlign: 'center', padding: '36px', color: '#6B7280' }}>
            <p>Loading project documents from database...</p>
          </div>
        )}

        {/* Empty State: Project has 0 Documents */}
        {!isLoadingDocuments && selectedProject && documents.length === 0 && (
          <div className="card" style={{ padding: '48px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
            <h3 style={{ fontSize: '18px', color: '#111827', marginBottom: '8px' }}>No Documents Uploaded</h3>
            <p style={{ color: '#6B7280', marginBottom: '20px', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px auto' }}>
              No deliverables or reports have been uploaded yet for "{selectedProject.projectName}".
            </p>
            <button
              type="button"
              className="btn-upload-document"
              onClick={() => {
                setModalError(null);
                setShowUploadModal(true);
              }}
            >
              + Upload Deliverable
            </button>
          </div>
        )}

        {/* Documents Table */}
        {!isLoadingDocuments && selectedProject && documents.length > 0 && (
          <div className="card documents-table-card">
            <div className="table-responsive">
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded By</th>
                    <th>Upload Date</th>
                    <th>Status</th>
                    <th className="actions-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="doc-name-cell">
                        <div className="doc-name-wrap">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="doc-table-icon">
                            <path
                              fillRule="evenodd"
                              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <div className="doc-title-meta">
                            <span className="doc-primary-name">{doc.name}</span>
                            <span className="doc-ver-sub">{doc.version || 'v1.0'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="doc-type-badge">{doc.type}</span>
                      </td>
                      <td className="doc-size-cell">{doc.size}</td>
                      <td>{doc.uploadedBy}</td>
                      <td>{doc.uploadDate}</td>
                      <td>
                        <span className={`status-pill ${getStatusClass(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons-wrap">
                          <button
                            type="button"
                            className="btn-action-icon btn-download"
                            title="Download document from server"
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingId === doc.id}
                          >
                            {downloadingId === doc.id ? (
                              <span style={{ fontSize: '11px', fontWeight: 600 }}>Downloading...</span>
                            ) : (
                              <>
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span>Download</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn-action-icon btn-delete"
                            title="Delete file"
                            onClick={() => handleDelete(doc.id, doc.name)}
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Upload Document */}
        {showUploadModal && (
          <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="modal-dialog modal-form" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Upload Project Deliverable</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUploadModal(false)}
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div style={{ margin: '14px 24px 0', padding: '10px 14px', background: '#FEE2E2', color: '#991B1B', borderRadius: '6px', fontSize: '13px' }}>
                  ⚠️ {modalError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="modal-form-body">
                <div className="form-group-item">
                  <label>Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. System Requirements Specification v1.0"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    disabled={isUploading}
                  />
                </div>

                <div className="form-group-item">
                  <label>Category / Type</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    disabled={isUploading}
                  >
                    <option value="PDF Document">PDF Document</option>
                    <option value="Word Document">Word Document (.docx)</option>
                    <option value="Presentation">Presentation (.pptx)</option>
                    <option value="Project File">Source / Project Deliverable</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label>Select File from Device *</label>
                  <input
                    type="file"
                    required
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    style={{ padding: '8px' }}
                  />
                  {selectedFile && (
                    <span style={{ fontSize: '12px', color: '#16A34A', marginTop: '2px' }}>
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                <div className="modal-foot-actions">
                  <button
                    type="button"
                    className="btn-secondary-btn"
                    onClick={() => setShowUploadModal(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-submit"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading to Database...' : 'Upload & Save'}
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

export default Documents;
