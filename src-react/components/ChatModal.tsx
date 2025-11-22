import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import "../styles/ChatModal.css";

interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderEmail: string;
  senderType: "client" | "provider";
  message: string;
  read?: boolean;
  createdAt: string;
}

interface ChatModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserType: "client" | "provider";
  otherPartyEmail: string;
  userId: string;
  userEmail: string;
}

const ChatModal: React.FC<ChatModalProps> = ({
  bookingId,
  isOpen,
  onClose,
  currentUserType,
  otherPartyEmail,
  userId,
  userEmail,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      // Initialize Socket.IO connection
      // Use relative path so it works both on localhost and via tunnel
      // Force websocket transport to avoid polling issues with tunnels
      socketRef.current = io({
        transports: ["websocket"],
        path: "/socket.io/",
      });

      socketRef.current.on("connect", () => {
        console.log("Connected to socket server");
        // Join the booking room
        socketRef.current?.emit("join_booking", bookingId);
      });

      socketRef.current.on("receive_message", (message: ChatMessage) => {
        setMessages((prevMessages) => [...prevMessages, message]);
        scrollToBottom();
      });

      // Load initial messages via API
      loadMessages();

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [isOpen, bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/bookings/${bookingId}/messages`);

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Errore nel caricamento dei messaggi");
      }
    } catch (err) {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      return;
    }

    if (socketRef.current) {
      const messageData = {
        bookingId,
        message: newMessage.trim(),
        senderId: userId,
        senderEmail: userEmail,
        senderType: currentUserType,
      };

      socketRef.current.emit("send_message", messageData);
      setNewMessage("");
    } else {
      setError("Errore di connessione al server chat");
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
                const isOwnMessage = msg.senderId === userId;
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
