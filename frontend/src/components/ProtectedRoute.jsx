import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthToken } from '../services/api';

/**
 * Route protection wrapper.
 * Checks for a stored JWT token before rendering protected routes.
 * The backend remains the authoritative source for security and role enforcement.
 */
function ProtectedRoute({ children }) {
  const token = getAuthToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
