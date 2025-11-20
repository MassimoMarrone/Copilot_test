import React, { useState, FormEvent } from 'react';
import '../styles/Modal.css';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!acceptedTerms) {
      setErrorMessage('Devi accettare i Termini e Condizioni per continuare.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, userType, acceptedTerms }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect based on user type
        if (data.userType === 'client') {
          window.location.href = '/client-dashboard';
        } else {
          window.location.href = '/provider-dashboard';
        }
      } else {
        setErrorMessage(data.error || 'Registrazione fallita');
      }
    } catch (error) {
      setErrorMessage('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content modal-large">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">Registrati</h2>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="register-email">Email:</label>
            <input
              type="email"
              id="register-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-password">Password:</label>
            <input
              type="password"
              id="register-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-userType">Tipo di Account:</label>
            <select
              id="register-userType"
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              required
              disabled={isLoading}
            >
              <option value="">Seleziona...</option>
              <option value="client">Cliente (Prenota servizi)</option>
              <option value="provider">Fornitore (Offri servizi)</option>
            </select>
          </div>

          <div className="terms-section">
            <h3>Termini e Condizioni</h3>
            <div className="terms-box">
              <p><strong>TERMINI E CONDIZIONI D'USO</strong></p>
              <p>1. <strong>Accettazione dei Termini</strong>: Utilizzando questo servizio, accetti di essere vincolato da questi termini e condizioni.</p>
              <p>2. <strong>Sistema di Pagamento Escrow</strong>: Tutti i pagamenti per i servizi di pulizia vengono trattenuti in escrow fino al completamento del servizio.</p>
              <p>3. <strong>Responsabilità del Fornitore</strong>: I fornitori devono completare i servizi come concordato e fornire una prova fotografica del lavoro svolto.</p>
              <p>4. <strong>Rilascio del Pagamento</strong>: Il pagamento viene rilasciato al fornitore solo dopo aver caricato la prova fotografica del servizio completato.</p>
              <p>5. <strong>Cancellazione</strong>: Le cancellazioni devono essere effettuate almeno 24 ore prima del servizio programmato.</p>
              <p>6. <strong>Privacy</strong>: Ci impegniamo a proteggere i tuoi dati personali secondo le normative sulla privacy.</p>
              <p>7. <strong>Risoluzione delle Controversie</strong>: Eventuali controversie saranno risolte tramite mediazione.</p>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="register-acceptedTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                  disabled={isLoading}
                />
                <span>Accetto i Termini e Condizioni (obbligatorio)</span>
              </label>
            </div>
          </div>

          {errorMessage && (
            <div className="error-message show">{errorMessage}</div>
          )}

          <div className="button-group">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Registrazione...' : 'Registrati'}
            </button>
          </div>
          
          <div className="modal-switch">
            <p>
              Hai già un account?{' '}
              <button 
                type="button" 
                className="link-button" 
                onClick={onSwitchToLogin}
                disabled={isLoading}
              >
                Accedi
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;
