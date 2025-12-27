import React, { useState, useEffect, useCallback } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";
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

// Get publishable key from meta tag or env
const getPublishableKey = (): string => {
  // Try to get from meta tag first
  const metaTag = document.querySelector('meta[name="stripe-publishable-key"]');
  if (metaTag) {
    return metaTag.getAttribute("content") || "";
  }
  // Fallback to window variable or empty string
  return (window as any).STRIPE_PUBLISHABLE_KEY || "";
};

const StripeConnectStatus: React.FC<StripeConnectStatusProps> = ({
  onStatusChange,
}) => {
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmbedded, setShowEmbedded] = useState(false);
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);

  const loadStatus = useCallback(async () => {
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
  }, []);

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
  }, [loadStatus]);

  // Notify parent of status changes
  useEffect(() => {
    if (status && onStatusChange) {
      onStatusChange(status.hasAccount && status.chargesEnabled);
    }
  }, [status, onStatusChange]);

  const handleStartEmbeddedOnboarding = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const publishableKey = getPublishableKey();
      if (!publishableKey) {
        throw new Error("Stripe publishable key not configured");
      }

      // Initialize Stripe Connect
      const instance = loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => {
          const result = await stripeConnectService.getAccountSession();
          return result.clientSecret;
        },
        appearance: {
          overlays: "dialog",
          variables: {
            colorPrimary: "#635bff",
          },
        },
      });

      setStripeConnectInstance(instance);
      setShowEmbedded(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOnboardingExit = () => {
    setShowEmbedded(false);
    setStripeConnectInstance(null);
    // Reload status after onboarding
    loadStatus();
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

  // Show embedded onboarding
  if (showEmbedded && stripeConnectInstance) {
    return (
      <div className="stripe-connect-status embedded-onboarding">
        <div className="embedded-header">
          <h4>Configura il tuo Account Pagamenti</h4>
          <button
            className="btn-close"
            onClick={handleOnboardingExit}
            title="Chiudi"
          >
            ✕
          </button>
        </div>
        <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
          <ConnectAccountOnboarding onExit={handleOnboardingExit} />
        </ConnectComponentsProvider>
      </div>
    );
  }

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
          onClick={handleStartEmbeddedOnboarding}
          disabled={actionLoading}
        >
          {actionLoading ? "Caricamento..." : "Collega con Stripe"}
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
          onClick={handleStartEmbeddedOnboarding}
          disabled={actionLoading}
        >
          {actionLoading ? "Caricamento..." : "Completa Configurazione"}
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
