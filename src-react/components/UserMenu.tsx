import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/UserMenu.css";

interface UserMenuProps {
  userEmail?: string;
  userType?: "client" | "provider" | "admin";
  isProvider?: boolean;
  unreadMessagesCount?: number;
  onBecomeProvider?: () => void;
  onLogout?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({
  userEmail,
  userType,
  isProvider,
  unreadMessagesCount = 0,
  onBecomeProvider,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      await fetch("/api/logout", { method: "POST" });
      navigate("/");
      window.location.reload(); // Ensure state is cleared
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const goToDashboard = () => {
    if (userType === "admin") {
      navigate("/admin-dashboard");
    } else if (userType === "provider") {
      navigate("/provider-dashboard");
    } else {
      navigate("/client-dashboard");
    }
    setIsOpen(false);
  };

  const goToProfile = () => {
    navigate("/profile");
    setIsOpen(false);
  };

  const goToOtherDashboard = () => {
    if (userType === "provider") {
      navigate("/client-dashboard");
    } else {
      navigate("/provider-dashboard");
    }
    setIsOpen(false);
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu utente"
      >
        <span className="user-icon">☰</span>
        <span className="user-email">{userEmail || "Utente"}</span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-avatar">👤</div>
            <div className="user-info">
              <div className="user-name">{userEmail}</div>
              <div className="user-role">
                {userType === "admin"
                  ? "Amministratore"
                  : userType === "provider"
                  ? "Fornitore"
                  : "Cliente"}
              </div>
            </div>
          </div>

          <div className="user-menu-divider"></div>

          <button
            className="user-menu-item"
            onClick={() => {
              navigate("/");
              setIsOpen(false);
            }}
          >
            <span className="menu-icon">🏠</span>
            <span>Home</span>
          </button>

          <button
            className="user-menu-item mobile-only"
            onClick={() => {
              navigate("/services");
              setIsOpen(false);
            }}
          >
            <span className="menu-icon">🔍</span>
            <span>Esplora</span>
          </button>

          <button
            className="user-menu-item mobile-only"
            onClick={() => {
              navigate("/bookings");
              setIsOpen(false);
            }}
          >
            <span className="menu-icon">📅</span>
            <span>Prenotazioni</span>
          </button>

          <button className="user-menu-item" onClick={goToDashboard}>
            <span className="menu-icon">📊</span>
            <span>Dashboard</span>
          </button>

          <button
            className="user-menu-item mobile-only"
            onClick={() => {
              navigate("/messages");
              setIsOpen(false);
            }}
          >
            <span className="menu-icon">💬</span>
            <span>
              Messaggi
              {unreadMessagesCount > 0 && (
                <span
                  style={{
                    backgroundColor: "#ff3b30",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    marginLeft: "8px",
                    verticalAlign: "middle",
                  }}
                >
                  {unreadMessagesCount}
                </span>
              )}
            </span>
          </button>

          <button className="user-menu-item" onClick={goToProfile}>
            <span className="menu-icon">👤</span>
            <span>Profilo Utente</span>
          </button>

          {/* If I am a provider, allow switching between dashboards */}
          {isProvider && (
            <button className="user-menu-item" onClick={goToOtherDashboard}>
              <span className="menu-icon">
                {userType === "client" ? "🏪" : "👤"}
              </span>
              <span>
                {userType === "client"
                  ? "Passa a Dashboard Fornitore"
                  : "Passa a Dashboard Cliente"}
              </span>
            </button>
          )}

          {!isProvider && userType === "client" && onBecomeProvider && (
            <button
              className="user-menu-item"
              onClick={() => {
                setIsOpen(false);
                onBecomeProvider();
              }}
            >
              <span className="menu-icon">🎯</span>
              <span>Diventa Fornitore</span>
            </button>
          )}

          <div className="user-menu-divider"></div>

          <button className="user-menu-item logout" onClick={handleLogout}>
            <span className="menu-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
