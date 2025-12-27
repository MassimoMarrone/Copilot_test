import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import "./styles/App.css";

// Lazy load pages for better performance
const ServicesPage = React.lazy(() => import("./pages/ServicesPage"));
const BookingsPage = React.lazy(() => import("./pages/BookingsPage"));
const MessagesPage = React.lazy(() => import("./pages/MessagesPage"));
const ClientDashboard = React.lazy(() => import("./components/ClientDashboard"));
const ProviderDashboard = React.lazy(() => import("./components/ProviderDashboard"));
const AdminDashboard = React.lazy(() => import("./components/AdminDashboard"));
const UserProfile = React.lazy(() => import("./components/UserProfile"));
const ProviderProfilePage = React.lazy(() => import("./pages/ProviderProfilePage"));
const VerifyEmailPage = React.lazy(() => import("./pages/VerifyEmailPage"));
const ProviderOnboarding = React.lazy(() => import("./pages/ProviderOnboarding"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));
const CookiePolicy = React.lazy(() => import("./pages/CookiePolicy"));

// Loading spinner component
const PageLoader = () => (
  <div style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "50vh",
    flexDirection: "column",
    gap: "16px"
  }}>
    <div style={{
      width: "40px",
      height: "40px",
      border: "3px solid #e0e0e0",
      borderTopColor: "#1a1a1a",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite"
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Verify email page - outside Layout for cleaner look */}
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Legal pages - outside Layout for cleaner look */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />

            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/client-dashboard" element={<ClientDashboard />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route
                path="/provider-onboarding"
                element={<ProviderOnboarding />}
              />
              <Route
                path="/provider/:providerId"
                element={<ProviderProfilePage />}
              />

              {/* Legacy Dashboards - eventually refactor these too */}
              <Route path="/provider-dashboard" element={<ProviderDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
    </AuthProvider>
  );
}

export default App;
