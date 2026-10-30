import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi, clearAuth } from '../../services/api';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('sessionExpired') === 'true') {
      return {
        type: 'info',
        text: 'Your session has expired. Please sign in again.',
      };
    }
    return null;
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setErrors((prev) => ({ ...prev, [name]: '' }));
    setStatusMessage(null);
  };

  const validate = () => {
    const newErrors = {};
    const email = formData.email.trim();

    if (!email) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const data = await authApi.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (!data.token) {
        throw new Error('The server did not return an authentication token.');
      }

      // Store the JWT and basic user details.
      // "Remember me" controls persistent versus session storage.
      const storage = formData.rememberMe
        ? localStorage
        : sessionStorage;

      // Remove any previous login from the other storage type.
      clearAuth();

      storage.setItem('token', data.token);
      storage.setItem(
        'user',
        JSON.stringify({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
        })
      );

      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Login failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();

    setStatusMessage({
      type: 'info',
      text: 'Password reset is not available yet. Please contact your project coordinator.',
    });
  };

  const handleRegisterRedirect = (e) => {
    e.preventDefault();
    navigate('/register');
  };

  return (
    <div className="login-page">
      <div className="login-card-container">
        <div className="login-header">
          <div className="brand-logo-wrap">
            <svg
              className="brand-icon"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="32" height="32" rx="8" fill="#1E40AF" />
              <path
                d="M16 7L6 12L16 17L26 12L16 7Z"
                fill="#93C5FD"
                stroke="#DBEAFE"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M10 14.5V20C10 22.5 12.5 24.5 16 24.5C19.5 24.5 22 22.5 22 20V14.5"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M26 13V19"
                stroke="#FCD34D"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>

            <span className="brand-name">
              Acad<span className="brand-name-highlight">Predict</span>
            </span>
          </div>

          <div className="portal-badge">Academic Portal</div>

          <h1 className="login-title">Welcome to AcadPredict</h1>

          <p className="login-subtitle">
            Academic Project Collaboration &amp; Risk Prediction Platform
          </p>

          <div className="role-tags">
            <span className="role-tag">Students</span>
            <span className="role-dot">•</span>
            <span className="role-tag">Faculty</span>
            <span className="role-dot">•</span>
            <span className="role-tag">Coordinators</span>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`login-alert login-alert-${statusMessage.type}`}
            role="alert"
          >
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form
          className="login-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Institutional / University Email
            </label>

            <div
              className={`input-wrapper ${
                errors.email ? 'input-error' : ''
              }`}
            >
              <input
                id="email"
                type="email"
                name="email"
                className="form-input"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
              />
            </div>

            {errors.email && (
              <span className="field-error">
                {errors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password" className="form-label">
                Password
              </label>

              <a
                href="#forgot-password"
                className="forgot-link"
                onClick={handleForgotPassword}
              >
                Forgot password?
              </a>
            </div>

            <div
              className={`input-wrapper ${
                errors.password ? 'input-error' : ''
              }`}
            >
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input password-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
              />

              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {errors.password && (
              <span className="field-error">
                {errors.password}
              </span>
            )}
          </div>

          <div className="form-remember-row">
            <label className="checkbox-label" htmlFor="rememberMe">
              <input
                id="rememberMe"
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={isLoading}
                className="checkbox-input"
              />

              <span className="checkbox-custom"></span>
              <span className="checkbox-text">
                Remember me on this device
              </span>
            </label>
          </div>

          <button
            type="submit"
            className={`btn-primary ${
              isLoading ? 'btn-loading' : ''
            }`}
            disabled={isLoading}
            id="login-submit-btn"
          >
            <span className="btn-content">
              {isLoading ? 'Signing in...' : 'Sign In to Dashboard'}
            </span>
          </button>
        </form>

        <div className="login-footer">
          <p className="register-text">
            Don&apos;t have an account?{' '}
            <a
              href="#register"
              className="register-link"
              onClick={handleRegisterRedirect}
            >
              Register as a Student
            </a>
          </p>
        </div>

        <div className="project-note">
          <span>AcadPredict • Academic Project &amp; Risk Analytics</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
