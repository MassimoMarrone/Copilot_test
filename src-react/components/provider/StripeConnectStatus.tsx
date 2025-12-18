import React, { useState, useEffect } from "react";
import { stripeConnectService } from "../../services/stripeConnectService";
import "./StripeConnectStatus.css";

interface StripeAccountStatus {
  hasAccount: boolean;
  isOnboarded: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: any;
}

interface StripeConnectStatusProps {
  onStatusChange?: (connected: boolean) => void;
}

const StripeConnectStatus: React.FC<StripeConnectStatusProps> = ({
  onStatusChange,
}) => {
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();

    // Check for onboarding completion from URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_onboarding") === "complete") {
      // Reload status after onboarding
      loadStatus();
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Notify parent of status changes
  useEffect(() => {
    if (status && onStatusChange) {
      onStatusChange(status.hasAccount && status.chargesEnabled);
    }
  }, [status, onStatusChange]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stripeConnectService.getAccountStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOnboarding = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const result = await stripeConnectService.startOnboarding();
      // Redirect to Stripe onboarding
      window.location.href = result.onboardingUrl;
    } catch (err: any) {
      setError(err.message);
      setActionLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const result = await stripeConnectService.getDashboardLink();
      // Open Stripe dashboard in new tab
      window.open(result.url, "_blank");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stripe-connect-status loading">
        <div className="spinner"></div>
        <span>Verifica stato pagamenti...</span>
      </div>
    );
  }

  // Not connected
  if (!status?.hasAccount) {
    return (
      <div className="stripe-connect-status not-connected">
        <div className="status-header">
          <span className="status-icon">💳</span>
          <div className="status-info">
            <h4>Configura i Pagamenti</h4>
            <p>Collega il tuo account per ricevere pagamenti dai clienti</p>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <button
          className="btn-connect"
          onClick={handleStartOnboarding}
          disabled={actionLoading}
        >
          {actionLoading ? "Reindirizzamento..." : "Collega con Stripe"}
        </button>
      </div>
    );
  }

  // Account exists but onboarding incomplete
  if (!status.isOnboarded || !status.chargesEnabled) {
    return (
      <div className="stripe-connect-status pending">
        <div className="status-header">
          <span className="status-icon">⏳</span>
          <div className="status-info">
            <h4>Completa la Configurazione</h4>
            <p>Il tuo account Stripe richiede ulteriori informazioni</p>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <button
          className="btn-connect"
          onClick={handleStartOnboarding}
          disabled={actionLoading}
        >
          {actionLoading ? "Reindirizzamento..." : "Completa Configurazione"}
        </button>
      </div>
    );
  }

  // Fully connected
  return (
    <div className="stripe-connect-status connected">
      <div className="status-header">
        <span className="status-icon">✅</span>
        <div className="status-info">
          <h4>Pagamenti Attivi</h4>
          <p>Puoi ricevere pagamenti dai clienti</p>
        </div>
      </div>
      <div className="status-badges">
        {status.chargesEnabled && (
          <span className="badge badge-success">Pagamenti ✓</span>
        )}
        {status.payoutsEnabled && (
          <span className="badge badge-success">Prelievi ✓</span>
        )}
      </div>
      {error && <div className="error-message">{error}</div>}
      <button
        className="btn-dashboard"
        onClick={handleOpenDashboard}
        disabled={actionLoading}
      >
        {actionLoading ? "Caricamento..." : "Apri Dashboard Stripe"}
      </button>
    </div>
  );
};

export default StripeConnectStatus;
