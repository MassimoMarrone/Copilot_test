import React from "react";
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
}

const Navbar: React.FC<NavbarProps> = ({
  onLoginClick,
  onRegisterClick,
  user,
  onLogout,
}) => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="brand-link">
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
            </Link>
          </div>
        )}

        <div className="navbar-buttons">
          {user ? (
            <div className="user-actions">
              <NotificationCenter userId={user.id} />
              <UserMenu
                userEmail={user.email}
                userType={user.userType}
                isProvider={user.isProvider}
                onLogout={onLogout}
              />
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
    </nav>
  );
};

export default Navbar;
