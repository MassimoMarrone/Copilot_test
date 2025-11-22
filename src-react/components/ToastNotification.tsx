import React, { useEffect, useState } from "react";
import "../styles/ToastNotification.css";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  link?: string;
}

interface ToastNotificationProps {
  notification: Notification;
  onClose: () => void;
  duration?: number;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onClose,
  duration = 5000,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  return (
    <div
      className={`toast-notification toast-${notification.type} ${
        isExiting ? "toast-exit" : "toast-enter"
      }`}
      onClick={handleClose}
    >
      <div className="toast-icon">
        {notification.type === "success" && "✅"}
        {notification.type === "error" && "❌"}
        {notification.type === "warning" && "⚠️"}
        {notification.type === "info" && "ℹ️"}
      </div>
      <div className="toast-content">
        <div className="toast-title">{notification.title}</div>
        <div className="toast-message">{notification.message}</div>
      </div>
      <button className="toast-close" onClick={(e) => {
        e.stopPropagation();
        handleClose();
      }}>
        &times;
      </button>
    </div>
  );
};

export default ToastNotification;
