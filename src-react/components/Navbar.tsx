import React from "react";
import UserMenu from "./UserMenu";
import "../styles/Navbar.css";

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  user?: any; // We can refine this type later
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  onLoginClick,
  onRegisterClick,
  user,
  onLogout,
}) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>🏠 Servizi di Pulizia</h1>
        </div>
        <div className="navbar-buttons">
          {user ? (
            <UserMenu
              userEmail={user.email}
              userType={user.userType}
              isProvider={user.isProvider}
              onLogout={onLogout}
            />
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
