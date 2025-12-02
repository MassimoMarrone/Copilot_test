import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/UserMenu.css";
import { authService } from "../services/authService";

interface UserMenuProps {
  userEmail?: string;
  userName?: string;
  userType?: "client" | "provider" | "admin";
  isProvider?: boolean;
  unreadMessagesCount?: number;
  onBecomeProvider?: () => void;
  onLogout?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({
  userEmail,
  userName,
  userType,
  isProvider,
  unreadMessagesCount = 0,
  onBecomeProvider,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
      await authService.logout();
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
        <span className="user-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </span>
        <span className="user-email">{userName || userEmail || "Utente"}</span>
      </button>

      {isOpen && (
        <UserMenuDropdown
          userName={userName}
          userEmail={userEmail}
          userType={userType}
          isProvider={isProvider}
          unreadMessagesCount={unreadMessagesCount}
          onLogout={handleLogout}
          onBecomeProvider={onBecomeProvider}
          goToDashboard={goToDashboard}
          goToProfile={goToProfile}
          goToOtherDashboard={goToOtherDashboard}
          navigate={navigate}
          setIsOpen={setIsOpen}
          menuRef={menuRef}
          dropdownRef={dropdownRef}
        />
      )}
    </div>
  );
};

// Separate component for the dropdown content to handle Portal logic cleanly
import ReactDOM from "react-dom";

const UserMenuDropdown = ({
  userName,
  userEmail,
  userType,
  isProvider,
  unreadMessagesCount,
  onLogout,
  onBecomeProvider,
  goToDashboard,
  goToProfile,
  goToOtherDashboard,
  navigate,
  setIsOpen,
  menuRef,
  dropdownRef,
}: any) => {
  const dropdownContent = (
    <div
      className="user-menu-dropdown"
      ref={dropdownRef}
      style={{
        // On desktop, we need to position it manually since it's now in a portal
        // On mobile, CSS handles it with fixed positioning
        ...(window.innerWidth > 768 && menuRef.current
          ? {
              position: "absolute",
              top:
                menuRef.current.getBoundingClientRect().bottom +
                window.scrollY +
                8 +
                "px",
              left:
                menuRef.current.getBoundingClientRect().right - 280 + "px", // Align right
              width: "280px",
            }
          : {}),
      }}
    >
      <div className="user-menu-header">
        <div className="user-avatar">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="user-info">
          <div className="user-name">{userName || userEmail}</div>
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
        <span className="menu-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        <span>Home</span>
      </button>

      <button
        className="user-menu-item mobile-only"
        onClick={() => {
          navigate("/services");
          setIsOpen(false);
        }}
      >
        <span className="menu-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <span>Esplora</span>
      </button>

      <button
        className="user-menu-item mobile-only"
        onClick={() => {
          navigate("/bookings");
          setIsOpen(false);
        }}
      >
        <span className="menu-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
        <span>Prenotazioni</span>
      </button>

      <button className="user-menu-item" onClick={goToDashboard}>
        <span className="menu-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </span>
        <span>Dashboard</span>
      </button>

      <button
        className="user-menu-item mobile-only"
        onClick={() => {
          navigate("/messages");
          setIsOpen(false);
        }}
      >
        <span className="menu-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
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
        <span className="menu-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span>Profilo Utente</span>
      </button>

      {/* If I am a provider, allow switching between dashboards */}
      {isProvider && (
        <button className="user-menu-item" onClick={goToOtherDashboard}>
          <span className="menu-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
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
          <span className="menu-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
          <span>Diventa Fornitore</span>
        </button>
      )}

      <div className="user-menu-divider"></div>

      <button className="user-menu-item logout" onClick={onLogout}>
        <span className="menu-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </span>
        <span>Logout</span>
      </button>
    </div>
  );

  // Use a portal to render outside the navbar stacking context
  return ReactDOM.createPortal(dropdownContent, document.body);
};

export default UserMenu;
