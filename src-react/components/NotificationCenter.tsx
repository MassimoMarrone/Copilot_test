import React, { useState, useEffect, useRef } from "react";
import { Notification } from "./ToastNotification";
import "../styles/NotificationCenter.css";

interface NotificationCenterProps {
  userId: string;
  newIncomingNotification?: Notification | null;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  newIncomingNotification,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId]);

  useEffect(() => {
    if (newIncomingNotification) {
      setNotifications((prev) => {
        // Avoid duplicates if possible, though id should be unique
        if (prev.some((n) => n.id === newIncomingNotification.id)) return prev;
        return [newIncomingNotification, ...prev];
      });
    }
  }, [newIncomingNotification]);

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const markAsRead = async (notification: Notification) => {
    if (notification.read) return;

    try {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "PUT",
      });
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PUT",
      });
      
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification);
    // If there's a link/action, handle it here
    // For now just close menu
    // setIsOpen(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Adesso";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m fa`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h fa`;
    return date.toLocaleDateString("it-IT");
  };

  return (
    <div className="notification-center" ref={menuRef}>
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifiche"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifiche</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                Segna tutte come lette
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                Nessuna notifica
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    !notification.read ? "unread" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {notification.type === "success" && "✅"}
                    {notification.type === "error" && "❌"}
                    {notification.type === "warning" && "⚠️"}
                    {notification.type === "info" && "ℹ️"}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {notification.title}
                    </div>
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-time">
                      {formatTime(notification.createdAt)}
                    </div>
                  </div>
                  {!notification.read && (
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#007bff",
                        marginTop: "6px",
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
