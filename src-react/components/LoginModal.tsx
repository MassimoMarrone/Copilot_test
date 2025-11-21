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
          window.location.reload();
        } else {
          navigate("/provider-dashboard");
        }
      } else {
        setErrorMessage(data.error || "Google login failed");
      }
    } catch (error) {
      setErrorMessage("Connection error");
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
          window.location.reload(); // Reload to update auth state
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
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="modal-title">Accedi</h2>

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
          <span style={{ padding: "0 10px", fontSize: "0.9rem" }}>OPPURE</span>
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
      </div>
    </div>
  );
};

export default LoginModal;
