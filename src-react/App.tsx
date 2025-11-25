import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ServicesPage from "./pages/ServicesPage";
import BookingsPage from "./pages/BookingsPage";
import MessagesPage from "./pages/MessagesPage";
import ClientDashboard from "./components/ClientDashboard";
import ProviderDashboard from "./components/ProviderDashboard";
import AdminDashboard from "./components/AdminDashboard";
import UserProfile from "./components/UserProfile";
import ProviderProfilePage from "./pages/ProviderProfilePage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import "./styles/App.css";

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          {/* Verify email page - outside Layout for cleaner look */}
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/client-dashboard" element={<ClientDashboard />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route
              path="/provider/:providerId"
              element={<ProviderProfilePage />}
            />

            {/* Legacy Dashboards - eventually refactor these too */}
            <Route path="/provider-dashboard" element={<ProviderDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
