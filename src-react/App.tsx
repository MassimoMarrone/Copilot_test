import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ClientDashboard from "./components/ClientDashboard";
import ProviderDashboard from "./components/ProviderDashboard";
import AdminDashboard from "./components/AdminDashboard";
import UserProfile from "./components/UserProfile";
import "./styles/App.css";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/client-dashboard" element={<ClientDashboard />} />
        <Route path="/provider-dashboard" element={<ProviderDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/profile" element={<UserProfile />} />
      </Routes>
    </div>
  );
}

export default App;
