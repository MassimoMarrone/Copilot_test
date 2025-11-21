import React, { useState, useEffect, useRef } from "react";
import "../styles/ChatModal.css";

interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderEmail: string;
  senderType: "client" | "provider";
  message: string;
  createdAt: string;
}

interface ChatModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserType: "client" | "provider";
  otherPartyEmail: string;
}

const ChatModal: React.FC<ChatModalProps> = ({
  bookingId,
  isOpen,
  onClose,
  currentUserType,
  otherPartyEmail,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      // Poll for new messages every 3 seconds
      const intervalId = setInterval(() => {
        loadMessages(true);
      }, 3000);

      return () => clearInterval(intervalId);
    }
  }, [isOpen, bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (isPolling = false) => {
    try {
      if (!isPolling) {
        setLoading(true);
        setError(null);
      }

      const response = await fetch(`/api/bookings/${bookingId}/messages`);

      if (response.ok) {
        const data = await response.json();
        // Only update if we have new messages or it's the first load to avoid re-renders
        setMessages((prevMessages) => {
          if (JSON.stringify(prevMessages) !== JSON.stringify(data)) {
            return data;
          }
          return prevMessages;
        });
      } else {
        if (!isPolling) {
          const errorData = await response.json();
          setError(errorData.error || "Errore nel caricamento dei messaggi");
        }
      }
    } catch (err) {
      if (!isPolling) {
        setError("Errore di connessione");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json();
        setMessages([...messages, sentMessage]);
        setNewMessage("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Errore nell'invio del messaggio");
      }
    } catch (err) {
      setError("Errore di connessione");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) {
      return "Ora";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min fa`;
    } else if (diffInHours < 24) {
      return `${diffInHours} ora fa`;
    } else if (diffInDays === 1) {
      return "Ieri";
    } else if (diffInDays < 7) {
      return `${diffInDays} giorni fa`;
    } else {
      return date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div
        className="chat-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-modal-header">
          <div className="chat-header-info">
            <h3>💬 Chat</h3>
            <p className="chat-with">
              Con: <strong>{otherPartyEmail}</strong>
            </p>
          </div>
          <button className="chat-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="chat-messages-container">
          {loading && messages.length === 0 ? (
            <div className="chat-loading">Caricamento messaggi...</div>
          ) : error ? (
            <div className="chat-error">{error}</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <p>Nessun messaggio ancora.</p>
              <p>Inizia la conversazione!</p>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((msg) => {
                const isOwnMessage = msg.senderType === currentUserType;
                return (
                  <div
                    key={msg.id}
                    className={`chat-message ${
                      isOwnMessage ? "own-message" : "other-message"
                    }`}
                  >
                    <div className="message-bubble">
                      <div className="message-text">{msg.message}</div>
                      <div className="message-time">
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Scrivi un messaggio..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            maxLength={1000}
            autoFocus
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!newMessage.trim()}
          >
            &#10148;
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;
