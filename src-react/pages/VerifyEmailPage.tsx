import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/VerifyEmailPage.css";

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [resendMessage, setResendMessage] = useState("");
  const [hasVerified, setHasVerified] = useState(false);
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    // Prevent double execution (React 18 Strict Mode)
    if (hasVerified) return;

    const token = searchParams.get("token");
    const verified = searchParams.get("verified");
    const errorMsg = searchParams.get("error");

    // If already verified (redirected from backend)
    if (verified === "true") {
      setHasVerified(true);
      setStatus("success");
      setMessage("La tua email è stata verificata con successo!");
      checkAuth();
      return;
    }

    // If error from redirect
    if (errorMsg) {
      setHasVerified(true);
      setStatus("error");
      setMessage(decodeURIComponent(errorMsg));
      return;
    }

    if (!token) {
      setHasVerified(true);
      setStatus("error");
      setMessage("Token di verifica mancante.");
      return;
    }

    // Call the API to verify the token
    const verifyEmail = async () => {
      setHasVerified(true);
      try {
        const response = await fetch(`/api/verify-email?token=${token}`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (response.ok) {
          setStatus("success");
          setMessage("La tua email è stata verificata con successo!");
          // Update auth state since the backend sets a cookie
          await checkAuth();
        } else {
          const data = await response.json().catch(() => ({}));
          setStatus("error");
          setMessage(data.error || "Token non valido o scaduto.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Errore durante la verifica. Riprova più tardi.");
      }
    };

    verifyEmail();
  }, [searchParams]); // Removed checkAuth from dependencies

  // Countdown and redirect (only if not showing resend form)
  useEffect(() => {
    if (status === "loading" || showResendForm) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate, showResendForm]);

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setResendStatus("sending");
    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendStatus("sent");
        setResendMessage(
          data.message || "Email inviata! Controlla la tua casella di posta."
        );
      } else {
        setResendStatus("error");
        setResendMessage(data.error || "Errore durante l'invio.");
      }
    } catch (error) {
      setResendStatus("error");
      setResendMessage("Errore di connessione. Riprova più tardi.");
    }
  };

  return (
    <div className="verify-email-page">
      <div className="verify-email-container">
        {status === "loading" && (
          <>
            <div className="verify-icon loading">
              <div className="spinner"></div>
            </div>
            <h1>Verifica in corso...</h1>
            <p>Stiamo verificando la tua email, attendere prego.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="verify-icon success">✓</div>
            <h1>Email Verificata!</h1>
            <p>{message}</p>
            <p className="redirect-message">
              Verrai reindirizzato alla home tra <strong>{countdown}</strong>{" "}
              secondi...
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/")}>
              Vai alla Home
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="verify-icon error">✗</div>
            <h1>Verifica Fallita</h1>
            <p>{message}</p>

            {!showResendForm ? (
              <>
                <p className="redirect-message">
                  Verrai reindirizzato alla home tra{" "}
                  <strong>{countdown}</strong> secondi...
                </p>
                <div className="button-group">
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate("/")}
                  >
                    Vai alla Home
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowResendForm(true)}
                  >
                    Richiedi nuovo link
                  </button>
                </div>
              </>
            ) : (
              <div className="resend-form">
                <p>
                  Inserisci la tua email per ricevere un nuovo link di verifica:
                </p>
                <form onSubmit={handleResendEmail}>
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="La tua email"
                    required
                    disabled={
                      resendStatus === "sending" || resendStatus === "sent"
                    }
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      resendStatus === "sending" || resendStatus === "sent"
                    }
                  >
                    {resendStatus === "sending"
                      ? "Invio..."
                      : "Invia nuovo link"}
                  </button>
                </form>

                {resendStatus === "sent" && (
                  <p className="resend-success">{resendMessage}</p>
                )}
                {resendStatus === "error" && (
                  <p className="resend-error">{resendMessage}</p>
                )}

                <button className="btn btn-link" onClick={() => navigate("/")}>
                  Torna alla Home
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
