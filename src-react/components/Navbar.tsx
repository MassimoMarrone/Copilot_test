import React from 'react';
import '../styles/Navbar.css';

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onRegisterClick }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>🏠 Servizi di Pulizia</h1>
        </div>
        <div className="navbar-buttons">
          <button className="btn-navbar btn-login" onClick={onLoginClick}>
            Accedi
          </button>
          <button className="btn-navbar btn-register" onClick={onRegisterClick}>
            Registrati
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
