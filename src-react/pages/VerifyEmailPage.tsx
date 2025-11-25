import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/VerifyEmailPage.css";

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const verified = searchParams.get("verified");
    const errorMsg = searchParams.get("error");
    
    // If already verified (redirected from backend)
    if (verified === "true") {
      setStatus("success");
      setMessage("La tua email è stata verificata con successo!");
      checkAuth();
      return;
    }

    // If error from redirect
    if (errorMsg) {
      setStatus("error");
      setMessage(decodeURIComponent(errorMsg));
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("Token di verifica mancante.");
      return;
    }

    // Call the API to verify the token
    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/verify-email?token=${token}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json",
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
  }, [searchParams, checkAuth]);

  // Countdown and redirect
  useEffect(() => {
    if (status === "loading") return;

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
  }, [status, navigate]);

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
              Verrai reindirizzato alla home tra <strong>{countdown}</strong> secondi...
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
            <p className="redirect-message">
              Verrai reindirizzato alla home tra <strong>{countdown}</strong> secondi...
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/")}>
              Vai alla Home
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
