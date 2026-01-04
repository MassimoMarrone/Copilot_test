import React from "react";
import * as Sentry from "@sentry/react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log minimale in console; eventuale integrazione Sentry può essere aggiunta qui.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Unhandled error", error, errorInfo);

    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 720, width: "100%" }}>
          <h1 style={{ margin: 0, marginBottom: 12 }}>
            Qualcosa è andato storto
          </h1>
          <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.85 }}>
            Si è verificato un errore imprevisto. Puoi ricaricare la pagina e
            riprovare.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #e0e0e0",
              background: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Ricarica
          </button>

          {import.meta.env.DEV && this.state.error?.message && (
            <pre
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 8,
                background: "#f6f6f6",
                overflowX: "auto",
                fontSize: 12,
              }}
            >
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
