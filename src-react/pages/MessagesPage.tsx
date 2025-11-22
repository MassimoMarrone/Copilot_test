import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ChatModal from "../components/ChatModal";
import { useOutletContext } from "react-router-dom";
import "../styles/MessagesPage.css";

interface Conversation {
  bookingId: string;
  serviceTitle: string;
  otherPartyEmail: string;
  lastMessage: {
    message: string;
    createdAt: string;
  } | null;
  updatedAt: string;
  unreadCount: number;
}

interface OutletContextType {
  refreshUnreadCount: () => void;
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { refreshUnreadCount } = useOutletContext<OutletContextType>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );
  const [selectedOtherPartyEmail, setSelectedOtherPartyEmail] = useState<
    string | null
  >(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/my-conversations");
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (bookingId: string) => {
    try {
      await fetch(`/api/bookings/${bookingId}/messages/read`, {
        method: "PUT",
      });
      refreshUnreadCount();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const handleOpenChat = (bookingId: string, otherPartyEmail: string) => {
    setSelectedBookingId(bookingId);
    setSelectedOtherPartyEmail(otherPartyEmail);
    markAsRead(bookingId);
  };

  const handleCloseChat = () => {
    setSelectedBookingId(null);
    setSelectedOtherPartyEmail(null);
    loadConversations(); // Refresh to update last message
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="messages-page">
      <div className="page-header">
        <h1>I Miei Messaggi</h1>
      </div>

      {loading ? (
        <div className="loading-spinner">Caricamento...</div>
      ) : (
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="empty-state">
              <p>Non hai ancora conversazioni attive.</p>
              <p>Le chat si attivano quando prenoti un servizio.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.bookingId}
                className={`conversation-card ${
                  conv.unreadCount > 0 ? "unread" : ""
                }`}
                onClick={() =>
                  handleOpenChat(conv.bookingId, conv.otherPartyEmail)
                }
              >
                <div className="conversation-avatar">
                  {conv.otherPartyEmail.charAt(0).toUpperCase()}
                </div>
                <div className="conversation-content">
                  <div className="conversation-header">
                    <h3>{conv.serviceTitle}</h3>
                    <span className="conversation-time">
                      {formatTime(conv.updatedAt)}
                    </span>
                  </div>
                  <p className="conversation-with">
                    Con: {conv.otherPartyEmail}
                  </p>
                  <div className="conversation-footer">
                    <p className="conversation-preview">
                      {conv.lastMessage ? (
                        conv.lastMessage.message
                      ) : (
                        <em>Nessun messaggio</em>
                      )}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="unread-badge">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedBookingId && selectedOtherPartyEmail && user && (
        <ChatModal
          bookingId={selectedBookingId}
          isOpen={true}
          onClose={handleCloseChat}
          currentUserType={user.userType === "client" ? "client" : "provider"}
          otherPartyEmail={selectedOtherPartyEmail}
          userId={user.id}
          userEmail={user.email}
        />
      )}
    </div>
  );
};

export default MessagesPage;
