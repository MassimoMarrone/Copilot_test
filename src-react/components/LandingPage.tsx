import React from "react";
import { useNavigate } from "react-router-dom";
import heroImage from "../assets/hero-modern.jpg";
import "../styles/LandingPage.css";

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  user?: any;
}

const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onRegisterClick,
  user,
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero Section - Premium Full Width */}
      <div className="hero-section full-width-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="hero-overlay"></div>
        <div className="container">
          <div className="hero-content-centered">
            <h1 className="hero-title">domy</h1>
            <p className="hero-subtitle">
              IL TUO SPAZIO, PERFETTO
            </p>
            <button
              className="btn btn-primary btn-large hero-cta"
              onClick={() => navigate("/services")}
            >
              Inizia Subito
            </button>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="how-it-works-section">
        <div className="container">
          <h2 className="section-title">Come Funziona</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon">
                <svg
                  width="32"
                  height="32"
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
              </div>
              <h3>1. Cerca</h3>
              <p>Trova il servizio di pulizia perfetto nella tua zona</p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <svg
                  width="32"
                  height="32"
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
              </div>
              <h3>2. Prenota</h3>
              <p>Scegli data e orario in base alle tue esigenze</p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3>3. Rilassati</h3>
              <p>Il professionista si occuperà di tutto</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!user && (
        <div className="cta-section">
          <div className="container">
            <h2>Pronto a iniziare?</h2>
            <p>Unisciti a migliaia di clienti soddisfatti</p>
            <div className="cta-buttons">
              <button
                onClick={onRegisterClick}
                className="btn btn-primary btn-large"
              >
                Registrati Gratis
              </button>
              <button
                onClick={onLoginClick}
                className="btn btn-secondary btn-large"
              >
                Accedi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>domy</h3>
              <p>Il tuo spazio, perfetto.</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Servizi</h4>
                <a href="#">Pulizia Casa</a>
                <a href="#">Uffici</a>
                <a href="#">Post-Ristrutturazione</a>
              </div>
              <div className="footer-column">
                <h4>Azienda</h4>
                <a href="#">Chi Siamo</a>
                <a href="#">Come Funziona</a>
                <a href="#">Lavora con Noi</a>
              </div>
              <div className="footer-column">
                <h4>Supporto</h4>
                <a href="#">Contatti</a>
                <a href="#">FAQ</a>
                <a href="#">Privacy Policy</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 domy. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
