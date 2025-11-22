import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/Modal.css";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsStep, setShowTermsStep] = useState(false);
  const [pendingToken, setPendingToken] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
        if (data.userType === "admin") {
          navigate("/admin-dashboard");
        } else if (data.userType === "client") {
          window.location.href = "/services";
        } else {
          navigate("/provider-dashboard");
        }
      } else {
        if (data.code === "TERMS_REQUIRED") {
          setPendingToken(credentialResponse.credential);
          setShowTermsStep(true);
        } else {
          setErrorMessage(data.error || "Google login failed");
        }
      }
    } catch (error) {
      setErrorMessage("Connection error");
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

  const handleCompleteRegistration = async () => {
    if (!acceptedTerms) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: pendingToken,
          acceptedTerms: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
        if (data.userType === "admin") {
          navigate("/admin-dashboard");
        } else if (data.userType === "client") {
          window.location.href = "/services";
        } else {
          navigate("/provider-dashboard");
        }
      } else {
        setErrorMessage(data.error || "Registrazione fallita");
      }
    } catch (error) {
      setErrorMessage("Errore di connessione");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onClose(); // Chiudi il modale
        // Redirect based on user type
        if (data.userType === "admin") {
          navigate("/admin-dashboard");
        } else if (data.userType === "client") {
          // Stay on the current page (Home/Search) for clients
          // navigate("/client-dashboard");
          window.location.href = "/services"; // Reload to update auth state
        } else {
          navigate("/provider-dashboard");
        }
      } else {
        setErrorMessage(data.error || "Login fallito");
      }
    } catch (error) {
      setErrorMessage("Errore di connessione");
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
      <div
        className={
          showTermsStep ? "modal-content modal-large" : "modal-content"
        }
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="modal-title">
          {showTermsStep ? "Completa Registrazione" : "Accedi"}
        </h2>

        {showTermsStep ? (
          <div className="terms-section">
            <p style={{ marginBottom: "1rem", color: "#666" }}>
              Per completare la creazione del tuo account, devi accettare i
              Termini e Condizioni.
            </p>
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
                2. <strong>Sistema di Pagamento Escrow</strong>: Tutti i
                pagamenti per i servizi di pulizia vengono trattenuti in escrow
                fino al completamento del servizio.
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
                5. <strong>Cancellazione</strong>: Le cancellazioni devono
                essere effettuate almeno 24 ore prima del servizio programmato.
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

            {errorMessage && (
              <div className="error-message show">{errorMessage}</div>
            )}

            <div className="button-group">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCompleteRegistration}
                disabled={isLoading || !acceptedTerms}
              >
                {isLoading ? "Registrazione..." : "Conferma e Registrati"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowTermsStep(false)}
                disabled={isLoading}
              >
                Indietro
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="google-login-wrapper"
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "1.5rem",
              }}
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setErrorMessage("Google Login Failed");
                }}
                theme="filled_blue"
                shape="pill"
                text="signin_with"
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
              <span style={{ padding: "0 10px", fontSize: "0.9rem" }}>
                OPPURE
              </span>
              <span style={{ flex: 1, borderBottom: "1px solid #ddd" }}></span>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="login-email">Email:</label>
                <input
                  type="email"
                  id="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password:</label>
                <input
                  type="password"
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
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
                  {isLoading ? "Accesso..." : "Accedi"}
                </button>
              </div>

              <div className="modal-switch">
                <p>
                  Non hai un account?{" "}
                  <button
                    type="button"
                    className="link-button"
                    onClick={onSwitchToRegister}
                    disabled={isLoading}
                  >
                    Registrati
                  </button>
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
