import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import "../styles/Modal.css";

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!acceptedTerms) {
      setErrorMessage("Devi accettare i Termini e Condizioni per continuare.");
      setIsLoading(false);
      return;
    }

    try {
      const data = await authService.googleLogin(
        credentialResponse.credential,
        acceptedTerms
      );

      if (data.success) {
        await checkAuth(); // Update auth state immediately
        onClose();
        if (data.userType === "admin") {
          navigate("/admin-dashboard");
        } else if (data.userType === "client") {
          // All users are now registered as clients
          navigate("/client-dashboard");
        } else {
          navigate("/provider-dashboard");
        }
      } else {
        setErrorMessage(data.error || "Google registration failed");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Connection error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const bottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + 1;
    if (bottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!acceptedTerms) {
      setErrorMessage("Devi accettare i Termini e Condizioni per continuare.");
      return;
    }

    setIsLoading(true);

    try {
      const data = await authService.register({
        email,
        password,
        acceptedTerms,
      });

      if (data.success) {
        setSuccessMessage(
          "Registrazione avvenuta con successo! Controlla la tua email per verificare l'account."
        );
        // Don't close immediately, let user read the message
        // onClose();
        // navigate("/client-dashboard");
      } else {
        setErrorMessage(data.error || "Registrazione fallita");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Errore di connessione");
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
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="modal-title">Registrati</h2>

        <div className="terms-section" style={{ marginBottom: "1.5rem" }}>
          <h3>Termini e Condizioni</h3>
          <div className="terms-box" onScroll={handleTermsScroll}>
            <p>
              <strong>TERMINI E CONDIZIONI D'USO</strong>
            </p>
            <p>
              1. <strong>Accettazione dei Termini</strong>: Utilizzando questo
              servizio, accetti di essere vincolato da questi termini e
              condizioni.
            </p>
            <p>
              2. <strong>Sistema di Pagamento Escrow</strong>: Tutti i pagamenti
              per i servizi di pulizia vengono trattenuti in escrow fino al
              completamento del servizio.
            </p>
            <p>
              3. <strong>Responsabilità del Fornitore</strong>: I fornitori
              devono completare i servizi come concordato e fornire una prova
              fotografica del lavoro svolto.
            </p>
            <p>
              4. <strong>Rilascio del Pagamento</strong>: Il pagamento viene
              rilasciato al fornitore solo dopo aver caricato la prova
              fotografica del servizio completato.
            </p>
            <p>
              5. <strong>Cancellazione</strong>: Le cancellazioni devono essere
              effettuate almeno 24 ore prima del servizio programmato.
            </p>
            <p>
              6. <strong>Privacy</strong>: Ci impegniamo a proteggere i tuoi
              dati personali secondo le normative sulla privacy.
            </p>
            <p>
              7. <strong>Risoluzione delle Controversie</strong>: Eventuali
              controversie saranno risolte tramite mediazione.
            </p>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                id="register-acceptedTerms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
                disabled={isLoading || !hasScrolledToBottom}
              />
              <span>Accetto i Termini e Condizioni (obbligatorio)</span>
            </label>
            {!hasScrolledToBottom && (
              <p className="scroll-hint">
                ⬇️ Scorri fino in fondo per accettare i termini
              </p>
            )}
          </div>
        </div>

        <div
          className="google-login-wrapper"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "1.5rem",
            opacity: acceptedTerms ? 1 : 0.5,
            pointerEvents: acceptedTerms ? "auto" : "none",
            transition: "opacity 0.3s",
          }}
        >
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setErrorMessage("Google Registration Failed");
            }}
            theme="filled_blue"
            shape="pill"
            text="signup_with"
          />
        </div>

        <div
          className="divider"
          style={{
            display: "flex",
            alignItems: "center",
            textAlign: "center",
            marginBottom: "1.5rem",
            color: "#666",
          }}
        >
          <span style={{ flex: 1, borderBottom: "1px solid #ddd" }}></span>
          <span style={{ padding: "0 10px", fontSize: "0.9rem" }}>OPPURE</span>
          <span style={{ flex: 1, borderBottom: "1px solid #ddd" }}></span>
        </div>

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

          {errorMessage && (
            <div className="error-message show">{errorMessage}</div>
          )}

          {successMessage && (
            <div
              className="success-message show"
              style={{
                backgroundColor: "#d4edda",
                color: "#155724",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              {successMessage}
            </div>
          )}

          <div className="button-group">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !!successMessage}
            >
              {isLoading ? "Registrazione..." : "Registrati"}
            </button>
          </div>

          <div className="modal-switch">
            <p>
              Hai già un account?{" "}
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
