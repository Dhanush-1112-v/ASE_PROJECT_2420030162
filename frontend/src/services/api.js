/**
 * Shared API Client for AcadPredict Frontend
 * Provides centralized HTTP communication with the Spring Boot backend.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Retrieve the active authentication token from storage.
 */
export function getAuthToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
}

/**
 * Retrieve the stored user object from storage.
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear authentication artifacts from all storage areas.
 */
export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}

/**
 * Generic fetch wrapper with Bearer token injection and consistent error handling.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      'Cannot connect to the backend server. Please verify Spring Boot is running on port 8081.'
    );
  }

  // Parse JSON response body safely
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = text ? { message: text } : null;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
      // Prevent redirect loop if already on an auth page
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = '/login?sessionExpired=true';
      }
      throw new ApiError(
        401,
        (data && (data.message || data.error)) || 'Session expired or invalid credentials. Please sign in again.',
        data
      );
    }

    if (response.status === 403) {
      throw new ApiError(
        403,
        (data && (data.message || data.error)) || 'Access denied: you do not have permission to access or modify this resource.',
        data
      );
    }

    if (response.status === 404) {
      throw new ApiError(
        404,
        (data && (data.message || data.error)) || 'The requested resource was not found.',
        data
      );
    }

    if (response.status === 502) {
      throw new ApiError(
        502,
        (data && (data.message || data.error)) || 'Invalid response received from the AI prediction service.',
        data
      );
    }

    if (response.status === 503) {
      throw new ApiError(
        503,
        (data && (data.message || data.error)) || 'AI Prediction Service is currently unavailable. Please ensure the Python service is running on port 8000.',
        data
      );
    }

    const message = (data && (data.message || data.error)) || `Server returned HTTP ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data;
}

/**
 * Authentication Endpoints
 */
export const authApi = {
  login: async (credentials) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  register: async (userData) => {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  logout: () => {
    clearAuth();
  },
};

/**
 * Projects Endpoints
 */
export const projectsApi = {
  getAll: async () => {
    return apiRequest('/api/projects', { method: 'GET' });
  },
  getById: async (id) => {
    return apiRequest(`/api/projects/${id}`, { method: 'GET' });
  },
  create: async (projectData) => {
    return apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },
  getTasks: async (projectId) => {
    return apiRequest(`/api/projects/${projectId}/tasks`, { method: 'GET' });
  },
  getPredictions: async (projectId) => {
    return apiRequest(`/api/projects/${projectId}/predictions`, { method: 'GET' });
  },
  review: async (id, status, feedback = '') => {
    return apiRequest(`/api/projects/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, feedback }),
    });
  },
  updateProgress: async (id, progress) => {
    return apiRequest(`/api/projects/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress: Number(progress) }),
    });
  },
  assignGuide: async (id, facultyId) => {
    return apiRequest(`/api/projects/${id}/assign-guide`, {
      method: 'PUT',
      body: JSON.stringify({ facultyId: facultyId ? Number(facultyId) : null }),
    });
  },
  updateFollowUp: async (id, notes) => {
    return apiRequest(`/api/projects/${id}/follow-up`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  },
  delete: async (id) => {
    return apiRequest(`/api/projects/${id}`, { method: 'DELETE' });
  },
};

/**
 * Tasks Endpoints
 */
export const tasksApi = {
  getByProject: async (projectId) => {
    return apiRequest(`/api/tasks/project/${projectId}`, { method: 'GET' });
  },
  getById: async (id) => {
    return apiRequest(`/api/tasks/${id}`, { method: 'GET' });
  },
  create: async (taskData) => {
    return apiRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },
  update: async (id, taskData) => {
    return apiRequest(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  },
  delete: async (id) => {
    return apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });
  },
};

/**
 * Users Endpoints (Role-gated account provisioning)
 */
export const usersApi = {
  create: async (userData) => {
    return apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  getFaculty: async () => {
    return apiRequest('/api/users/faculty', { method: 'GET' });
  },
  getStudents: async () => {
    return apiRequest('/api/users/students', { method: 'GET' });
  },
};

/**
 * Prediction Endpoints
 */
export const predictionsApi = {
  predict: async (payload) => {
    return apiRequest('/api/predictions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  predictForProject: async (projectId, payload) => {
    return apiRequest(`/api/predictions/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getHistory: async (projectId) => {
    return apiRequest(`/api/predictions/project/${projectId}`, { method: 'GET' });
  },
};

/**
 * Notifications Endpoints
 */
export const notificationsApi = {
  getAll: async () => {
    return apiRequest('/api/notifications', { method: 'GET' });
  },
};

/**
 * Milestones Endpoints
 */
export const milestonesApi = {
  getByProject: async (projectId) => {
    return apiRequest(`/api/projects/${projectId}/milestones`, { method: 'GET' });
  },
  create: async (projectId, milestoneData) => {
    return apiRequest(`/api/projects/${projectId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(milestoneData),
    });
  },
  update: async (milestoneId, milestoneData) => {
    return apiRequest(`/api/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify(milestoneData),
    });
  },
  review: async (milestoneId, reviewStatus, reviewFeedback) => {
    return apiRequest(`/api/milestones/${milestoneId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ reviewStatus, reviewFeedback }),
    });
  },
  delete: async (milestoneId) => {
    return apiRequest(`/api/milestones/${milestoneId}`, { method: 'DELETE' });
  },
};

/**
 * Team Members Endpoints
 */
export const teamApi = {
  getByProject: async (projectId) => {
    return apiRequest(`/api/projects/${projectId}/team`, { method: 'GET' });
  },
  addMember: async (projectId, memberData) => {
    return apiRequest(`/api/projects/${projectId}/team`, {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  },
  removeMember: async (projectId, memberId) => {
    return apiRequest(`/api/projects/${projectId}/team/${memberId}`, { method: 'DELETE' });
  },
};

/**
 * Documents Endpoints
 */
export const documentsApi = {
  getByProject: async (projectId) => {
    return apiRequest(`/api/projects/${projectId}/documents`, { method: 'GET' });
  },
  upload: async (projectId, file, title, category) => {
    const url = `${API_BASE_URL}/api/projects/${projectId}/documents`;
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (category) formData.append('category', category);

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errText = 'Failed to upload document.';
      try {
        const json = await response.json();
        errText = json.message || errText;
      } catch {
        // Ignore JSON parse errors on non-JSON error bodies
      }
      throw new ApiError(response.status, errText);
    }
    return response.json();
  },
  download: async (documentId, filename = 'document.bin') => {
    const url = `${API_BASE_URL}/api/documents/${documentId}/download`;
    const token = getAuthToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to download document: ' + response.statusText);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
  },
  delete: async (documentId) => {
    return apiRequest(`/api/documents/${documentId}`, { method: 'DELETE' });
  },
};

