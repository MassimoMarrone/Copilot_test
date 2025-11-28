import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "./UserMenu";
import NotificationCenter from "./NotificationCenter";
import logo from "../assets/logo.jpg";
import "../styles/Navbar.css";

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  user?: any;
  onLogout?: () => void;
  onBecomeProvider?: () => void;
  unreadMessagesCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({
  onLoginClick,
  onRegisterClick,
  user,
  onLogout,
  onBecomeProvider,
  unreadMessagesCount = 0,
}) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="brand-link" onClick={closeMobileMenu}>
            <img src={logo} alt="domy" className="navbar-logo" />
          </Link>
        </div>

        {user && (
          <div className="navbar-links">
            <Link
              to="/services"
              className={`nav-link ${
                location.pathname === "/services" ? "active" : ""
              }`}
            >
              Esplora
            </Link>
            <Link
              to="/bookings"
              className={`nav-link ${
                location.pathname === "/bookings" ? "active" : ""
              }`}
            >
              Prenotazioni
            </Link>
            <Link
              to="/messages"
              className={`nav-link ${
                location.pathname === "/messages" ? "active" : ""
              }`}
            >
              Messaggi
              {unreadMessagesCount > 0 && (
                <span className="nav-badge">{unreadMessagesCount}</span>
              )}
            </Link>
          </div>
        )}

        <div className="navbar-buttons">
          {user ? (
            <div className="user-actions">
              <NotificationCenter userId={user.id} />
              <UserMenu
                userEmail={user.email}
                userName={user.displayName || user.username}
                userType={user.userType}
                isProvider={user.isProvider}
                unreadMessagesCount={unreadMessagesCount}
                onLogout={onLogout}
                onBecomeProvider={onBecomeProvider}
              />
              {/* Hamburger menu per mobile */}
              <button className="hamburger-btn" onClick={toggleMobileMenu} aria-label="Menu">
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          ) : (
            <>
              <button className="btn-navbar btn-login" onClick={onLoginClick}>
                Accedi
              </button>
              <button
                className="btn-navbar btn-register"
                onClick={onRegisterClick}
              >
                Registrati
              </button>
            </>
          )}
        </div>
      </div>

      {/* Menu mobile */}
      {user && mobileMenuOpen && (
        <div className="mobile-menu">
          <Link
            to="/services"
            className={`nav-link ${location.pathname === "/services" ? "active" : ""}`}
            onClick={closeMobileMenu}
          >
            🔍 Esplora
          </Link>
          <Link
            to="/bookings"
            className={`nav-link ${location.pathname === "/bookings" ? "active" : ""}`}
            onClick={closeMobileMenu}
          >
            📅 Prenotazioni
          </Link>
          <Link
            to="/messages"
            className={`nav-link ${location.pathname === "/messages" ? "active" : ""}`}
            onClick={closeMobileMenu}
          >
            💬 Messaggi {unreadMessagesCount > 0 && `(${unreadMessagesCount})`}
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
