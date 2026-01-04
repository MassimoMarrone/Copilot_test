import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { initSentry } from "./sentry";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

initSentry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider
    clientId={clientId || "YOUR_GOOGLE_CLIENT_ID_PLACEHOLDER"}
  >
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </GoogleOAuthProvider>
);
