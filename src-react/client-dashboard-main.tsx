import React from "react";
import ReactDOM from "react-dom/client";
import ClientDashboard from "./components/ClientDashboard";

// Get Google Maps API key from meta tag or environment
const getGoogleMapsApiKey = (): string => {
  const metaTag = document.querySelector('meta[name="google-maps-api-key"]');
  if (metaTag) {
    return metaTag.getAttribute("content") || "";
  }
  // Fallback to empty string if not configured
  return "";
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClientDashboard />
  </React.StrictMode>
);
