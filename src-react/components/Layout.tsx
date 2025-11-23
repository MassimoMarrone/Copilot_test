import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import BecomeProviderModal from "./BecomeProviderModal";
import { io } from "socket.io-client";

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showBecomeProviderModal, setShowBecomeProviderModal] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const location = useLocation();

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/unread-messages-count");
      if (response.ok) {
        const data = await response.json();
        setUnreadMessagesCount(data.count);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();

      const socket = io();
      socket.emit("join_user_room", user.id);

      socket.on("message_received_notification", () => {
        fetchUnreadCount(); // Re-fetch to get accurate count
      });

      return () => {
        socket.disconnect();
      };
    } else {
      setUnreadMessagesCount(0);
    }
  }, [user]);

  // Re-fetch when location changes (e.g. navigating away from messages might trigger updates)
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [location.pathname, user]);

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        onLogout={logout}
        onLoginClick={() => setShowLoginModal(true)}
        onRegisterClick={() => setShowRegisterModal(true)}
        onBecomeProvider={() => setShowBecomeProviderModal(true)}
        unreadMessagesCount={unreadMessagesCount}
      />
      <main className="app-content">
        <Outlet
          context={{
            openLogin: () => setShowLoginModal(true),
            openRegister: () => setShowRegisterModal(true),
            openBecomeProvider: () => setShowBecomeProviderModal(true),
            refreshUnreadCount: fetchUnreadCount,
          }}
        />
      </main>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />

      <BecomeProviderModal
        isOpen={showBecomeProviderModal}
        onClose={() => setShowBecomeProviderModal(false)}
      />
    </div>
  );
};

export default Layout;
