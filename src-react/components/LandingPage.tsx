import React from 'react';
import '../styles/LandingPage.css';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRegisterClick }) => {
  return (
    <>
      {/* Hero Section */}
      <div className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">🏠 Servizi di Pulizia Professionali</h1>
              <p className="hero-subtitle">
                La soluzione moderna per prenotare servizi di pulizia affidabili e professionali per la tua casa o il tuo AirBnB
              </p>
              <div className="hero-buttons">
                <button onClick={onRegisterClick} className="btn btn-hero-primary">
                  Inizia Ora
                </button>
                <button onClick={onLoginClick} className="btn btn-hero-secondary">
                  Accedi
                </button>
              </div>
            </div>
            <div className="hero-image">
              <div className="hero-image-placeholder">
                <span className="hero-emoji">✨</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="container">
          <h2 className="section-title">Perché Sceglierci</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Pagamento Sicuro</h3>
              <p>Sistema di pagamento escrow che protegge sia clienti che fornitori. I fondi vengono rilasciati solo dopo il completamento del servizio.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h3>Prova Fotografica</h3>
              <p>I fornitori devono caricare foto del lavoro completato prima di ricevere il pagamento, garantendo qualità e trasparenza.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Prenotazione Rapida</h3>
              <p>Prenota servizi di pulizia in pochi clic. Interfaccia semplice e intuitiva per clienti e fornitori.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Due Modalità</h3>
              <p>Registrati come cliente per prenotare servizi o come fornitore per offrire i tuoi servizi di pulizia professionale.</p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="how-it-works-section">
        <div className="container">
          <h2 className="section-title">Come Funziona</h2>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Registrati</h3>
              <p>Crea un account come cliente o fornitore di servizi</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Scegli il Servizio</h3>
              <p>Sfoglia i servizi disponibili e prenota quello che preferisci</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Pagamento Sicuro</h3>
              <p>Il pagamento viene trattenuto in escrow fino al completamento</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Servizio Completato</h3>
              <p>Il fornitore carica la prova fotografica e riceve il pagamento</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2>Pronto a Iniziare?</h2>
            <p>Unisciti alla nostra piattaforma e inizia a prenotare o offrire servizi di pulizia professionali oggi stesso</p>
            <div className="cta-buttons">
              <button onClick={onRegisterClick} className="btn btn-cta-primary">
                Registrati Gratuitamente
              </button>
              <button onClick={onLoginClick} className="btn btn-cta-secondary">
                Ho già un account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 Servizi di Pulizia AirBnB. Tutti i diritti riservati.</p>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
