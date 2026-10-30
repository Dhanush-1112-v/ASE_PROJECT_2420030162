import React, { useState } from 'react';
import StudentLayout from '../../components/layout/StudentLayout';
import './Notifications.css';

/**
 * Notifications Component
 * Route: /student/notifications
 */
function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Milestone 2 Target Deadline Approaching',
      message: 'SRS and System Architecture review submission is due on Nov 12, 2026. Make sure all diagram deliverables are finalized.',
      category: 'Milestones',
      dateTime: 'Oct 18, 2026 • 09:15 AM',
      isRead: false,
    },
    {
      id: 'notif-2',
      title: 'Guide Feedback Received from Dr. Sharma',
      message: 'Your guide posted feedback on "Literature Survey Chapter 2 Draft": Review recent 2025 papers on neural forecasting models.',
      category: 'Guide Feedback',
      dateTime: 'Oct 17, 2026 • 04:30 PM',
      isRead: false,
    },
    {
      id: 'notif-3',
      title: 'ML Risk Score Updated',
      message: `AcadPredict model recalculated your project delay index to Medium (Score: ${localStorage.getItem('acadpredictRiskScore') || 82}/100). Check the risk analytics dashboard for mitigation tasks.`,
      category: 'System',
      dateTime: 'Oct 16, 2026 • 11:00 AM',
      isRead: false,
    },
    {
      id: 'notif-4',
      title: 'Task Assigned by Team Lead',
      message: 'New task assigned to you: "Implement Student Dashboard UI & Navigation". Target completion date: Oct 24, 2026.',
      category: 'Tasks',
      dateTime: 'Oct 14, 2026 • 02:20 PM',
      isRead: true,
    },
    {
      id: 'notif-5',
      title: 'Proposal Abstract Formally Ratified',
      message: 'The CSE Department Project Coordinator approved your capstone proposal: "AcadPredict: Academic Project Collaboration & Risk Prediction Platform".',
      category: 'Milestones',
      dateTime: 'Sep 15, 2026 • 10:45 AM',
      isRead: true,
    },
  ]);

  const [activeCategory, setActiveCategory] = useState('All');
  const [notificationBanner, setNotificationBanner] = useState(null);

  const categories = ['All', 'Milestones', 'Guide Feedback', 'Tasks', 'System'];

  const filteredNotifications = notifications.filter((item) => {
    if (activeCategory === 'All') return true;
    return item.category === activeCategory;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    setNotificationBanner('All notifications marked as read.');
    setTimeout(() => setNotificationBanner(null), 3500);
  };

  const handleDeleteNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const getCategoryClass = (cat) => {
    switch (cat.toLowerCase()) {
      case 'milestones':
        return 'cat-milestone';
      case 'guide feedback':
        return 'cat-guide';
      case 'tasks':
        return 'cat-task';
      case 'system':
        return 'cat-system';
      default:
        return '';
    }
  };

  return (
    <StudentLayout pageTitle="Notifications">
      <div className="notifications-page">
        {/* Header Row */}
        <div className="notifications-header-row">
          <div>
            <h1 className="notifications-title">Notifications</h1>
            <p className="notifications-subtitle">
              Stay informed on evaluation milestones, mentor feedback, and team assignment updates.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="btn-mark-all"
              onClick={handleMarkAllAsRead}
            >
              Mark All as Read ({unreadCount})
            </button>
          )}
        </div>

        {/* Banner Alert */}
        {notificationBanner && (
          <div className="alert-banner alert-info">
            <span>ℹ️ {notificationBanner}</span>
          </div>
        )}

        {/* Category Filters */}
        <div className="card categories-card">
          <div className="categories-list">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
                {cat === 'All' && unreadCount > 0 && (
                  <span className="pill-unread-counter">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="notifications-card-list">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`card notif-card-item ${!notif.isRead ? 'unread-card' : ''}`}
            >
              <div className="notif-card-left">
                {!notif.isRead && <span className="unread-dot-badge"></span>}
                <div className="notif-content-col">
                  <div className="notif-meta-head">
                    <span className={`category-tag ${getCategoryClass(notif.category)}`}>
                      {notif.category}
                    </span>
                    <span className="notif-timestamp">{notif.dateTime}</span>
                  </div>
                  <h3 className="notif-heading">{notif.title}</h3>
                  <p className="notif-message-text">{notif.message}</p>
                </div>
              </div>

              <div className="notif-actions-col">
                {!notif.isRead && (
                  <button
                    type="button"
                    className="btn-mark-read"
                    onClick={() => handleMarkAsRead(notif.id)}
                    title="Mark as read"
                  >
                    Mark as Read
                  </button>
                )}
                <button
                  type="button"
                  className="btn-delete-notif"
                  onClick={() => handleDeleteNotification(notif.id)}
                  title="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {filteredNotifications.length === 0 && (
            <div className="empty-notif-box card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="empty-bell-icon">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <h3>No Notifications Found</h3>
              <p>You have no notifications in the selected category.</p>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}

export default Notifications;
