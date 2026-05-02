import { useNotificationData } from "./useNotificationData.js";

export default function App() {
  const {
    notifications,
    priorityNotifications,
    loading,
    error,
    lastUpdated,
    refresh
  } = useNotificationData();

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Campus updates</p>
          <h1>Notification Inbox</h1>
        </div>

        <button type="button" className="refresh-button" onClick={refresh}>
          Refresh
        </button>
      </header>

      <section className="status-row" aria-live="polite">
        <span>{loading ? "Loading" : `${notifications.length} total`}</span>
        <span>{priorityNotifications.length} priority</span>
        <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for first update"}</span>
      </section>

      {error ? <div className="error-box">{error}</div> : null}

      <section className="content-grid">
        <NotificationPanel
          title="Priority Inbox"
          emptyText="No priority notifications available."
          notifications={priorityNotifications}
          highlight
        />

        <NotificationPanel
          title="All Notifications"
          emptyText="No notifications available."
          notifications={notifications}
        />
      </section>
    </main>
  );
}

function NotificationPanel({ title, emptyText, notifications, highlight = false }) {
  return (
    <section className={highlight ? "panel panel-highlight" : "panel"}>
      <div className="panel-heading">
        <h2>{title}</h2>
        <span>{notifications.length}</span>
      </div>

      {notifications.length === 0 ? (
        <p className="empty-state">{emptyText}</p>
      ) : (
        <ul className="notification-list">
          {notifications.map(notification => (
            <NotificationItem key={notification.id || `${notification.message}-${notification.timestamp}`} notification={notification} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NotificationItem({ notification }) {
  return (
    <li className="notification-card">
      <div className="notification-card-top">
        <span className={`type-pill type-${String(notification.type || "unknown").toLowerCase()}`}>
          {notification.type || "Unknown"}
        </span>
        <time>{formatTime(notification.timestamp)}</time>
      </div>
      <p>{notification.message || "No message provided."}</p>
    </li>
  );
}

function formatTime(value) {
  if (!value) return "No timestamp";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}
