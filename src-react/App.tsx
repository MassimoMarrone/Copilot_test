import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ClientDashboard from "./components/ClientDashboard";
import "./styles/App.css";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/client-dashboard" element={<ClientDashboard />} />
        {/* Aggiungeremo qui la rotta per il provider in futuro */}
        <Route
          path="/provider-dashboard"
          element={<div>Dashboard Fornitore (In costruzione)</div>}
        />
      </Routes>
    </div>
  );
}

export default App;
