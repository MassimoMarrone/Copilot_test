import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import ClientDashboard from "./components/ClientDashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClientDashboard />
    </BrowserRouter>
  </React.StrictMode>
);
