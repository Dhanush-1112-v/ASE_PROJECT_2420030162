import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clearAuth } from '../../services/api';
import './StudentLayout.css';

/**
 * Reusable StudentLayout Component for AcadPredict
 * Provides consistent Sidebar, Header, Breadcrumbs, and Profile across all Student views.
 */
function StudentLayout({ children, pageTitle = 'Dashboard' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);


  // Load the profile saved during login or registration.
const savedUser = (() => {
  try {
    return JSON.parse(
      localStorage.getItem('user') ||
      sessionStorage.getItem('user') ||
      '{}'
    );
  } catch {
    return {};
  }
})();

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatRole = (role) => {
    if (!role) return 'Student';
    const clean = role.replace(/^ROLE_/, '').toLowerCase();
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const userName = savedUser.name || 'Student User';
  const userEmail = savedUser.email || '';
  const userRole = formatRole(savedUser.role);
  const userInitials = getInitials(savedUser.name);

  // Sidebar Menu Items
  const navItems = [
    { path: '/student/dashboard', label: 'Dashboard', icon: 'grid' },
    { path: '/student/projects', label: 'My Projects', icon: 'folder' },
    { path: '/student/proposal', label: 'Proposal', icon: 'file-text' },
    { path: '/student/team', label: 'My Team', icon: 'users' },
    { path: '/student/tasks', label: 'Tasks', icon: 'check-square' },
    { path: '/student/milestones', label: 'Milestones', icon: 'flag' },
    { path: '/student/documents', label: 'Documents', icon: 'archive' },
    { path: '/student/risk', label: 'Risk Prediction', icon: 'alert-triangle' },
    { path: '/student/notifications', label: 'Notifications', icon: 'bell', badge: 3 },
  ];

  // Quick Notification Preview Items
  const previewNotifications = [
    { id: 1, title: 'Milestone reminder', text: 'SRS submission is in 8 days.', time: '2h ago' },
    { id: 2, title: 'Guide feedback received', text: 'Lavanya Gottumukkala commented on Literature Survey draft.', time: 'Yesterday' },
    { id: 3, title: 'Risk score recalculated', text: 'Current risk index set to Medium.', time: '2 days ago' },
  ];

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const renderNavIcon = (iconName) => {
    switch (iconName) {
      case 'grid':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        );
      case 'folder':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        );
      case 'file-text':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      case 'users':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'check-square':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        );
      case 'flag':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        );
      case 'archive':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        );
      case 'alert-triangle':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'bell':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="layout-container">
      {/* ===================== SIDEBAR ===================== */}
      <aside className={`layout-sidebar ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        {/* Brand Logo & Name */}
        <div className="layout-brand" onClick={() => handleNavigate('/student/dashboard')} role="button" tabIndex={0}>
          <svg
            className="layout-brand-icon"
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
          <div className="layout-brand-text">
            <span className="layout-brand-title">AcadPredict</span>
            <span className="layout-brand-badge">Student Portal</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="layout-nav">
          <div className="layout-nav-label">Workspace</div>
          <ul className="layout-nav-list">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path} className="layout-nav-item">
                  <button
                    type="button"
                    className={`layout-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <span className="layout-nav-icon">{renderNavIcon(item.icon)}</span>
                    <span className="layout-nav-title">{item.label}</span>
                    {item.badge && (
                      <span className="layout-nav-badge">{item.badge}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer / Sign Out */}
        <div className="layout-sidebar-footer">
          <button
            type="button"
            className="layout-logout-btn"
            onClick={handleLogout}
            title="Sign out of AcadPredict"
          >
            <svg
              className="layout-logout-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="layout-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ===================== MAIN CONTENT WRAPPER ===================== */}
      <div className="layout-main">
        {/* Top Header */}
        <header className="layout-header">
          <div className="layout-header-left">
            <button
              type="button"
              className="layout-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="layout-brand-mobile">AcadPredict</div>
            <div className="layout-breadcrumbs">
              <span className="breadcrumb-root" onClick={() => handleNavigate('/student/dashboard')}>Portal</span>
              <span className="breadcrumb-slash">/</span>
              <span className="breadcrumb-page">{pageTitle}</span>
            </div>
          </div>

          <div className="layout-header-right">
            {/* Notification Bell */}
            <div className="layout-notif-wrap">
              <button
                type="button"
                className="layout-icon-btn"
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                aria-label="Notifications"
                title="Notifications"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="layout-notif-dot"></span>
              </button>

              {showNotificationsDropdown && (
                <div className="layout-dropdown-box">
                  <div className="dropdown-head">
                    <h5>Notifications</h5>
                    <span className="dropdown-pill">3 New</span>
                  </div>
                  <ul className="dropdown-list">
                    {previewNotifications.map((item) => (
                      <li key={item.id} className="dropdown-item">
                        <strong className="item-title">{item.title}</strong>
                        <span className="item-text">{item.text}</span>
                        <span className="item-time">{item.time}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="dropdown-foot">
                    <button
                      type="button"
                      className="dropdown-all-btn"
                      onClick={() => {
                        setShowNotificationsDropdown(false);
                        handleNavigate('/student/notifications');
                      }}
                    >
                      View all notifications &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile & Sign Out Area */}
            <div className="layout-profile-area">
              <div className="layout-avatar" title={`${userName} (${userRole})`}>
                <span>{userInitials}</span>
              </div>
              <div className="layout-user-details">
                <span className="layout-user-name">{userName}</span>
                <span className="layout-user-email">{userEmail ? `${userEmail} (${userRole})` : userRole}</span>
              </div>
              <button
                type="button"
                className="layout-header-logout"
                onClick={handleLogout}
                title="Sign out of your account"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default StudentLayout;
