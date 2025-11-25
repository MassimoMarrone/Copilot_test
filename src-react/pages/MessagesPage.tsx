import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { ChatMessage, Conversation } from "../types/chat";
import "../styles/MessagesPage.css";

interface OutletContextType {
  refreshUnreadCount: () => void;
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { refreshUnreadCount } = useOutletContext<OutletContextType>();
  const [searchParams] = useSearchParams();
  const initialBookingId = searchParams.get("bookingId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileView(mobile);
      if (!mobile) setShowSidebar(true);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
      setupSocket();
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.bookingId);
      if (isMobileView) setShowSidebar(false);

      // Mark as read
      markAsRead(selectedConversation.bookingId);

      // Join the booking room for real-time updates
      if (socket) {
        console.log("Joining booking room:", selectedConversation.bookingId);
        socket.emit("join_booking", selectedConversation.bookingId);
      }
    }
  }, [selectedConversation, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialBookingId && conversations.length > 0 && !selectedConversation) {
      const targetConv = conversations.find(
        (c) => c.bookingId === initialBookingId
      );
      if (targetConv) {
        setSelectedConversation(targetConv);
      }
    }
  }, [conversations, initialBookingId]);

  const processedMessageIds = useRef<Set<string>>(new Set());

  const setupSocket = () => {
    if (!user) return;

    const newSocket = io({
      transports: ["websocket"],
      path: "/socket.io/",
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
      newSocket.emit("join_user_room", user.id);
    });

    newSocket.on("receive_message", (message: ChatMessage) => {
      // Prevent processing the same message multiple times
      if (processedMessageIds.current.has(message.id)) {
        return;
      }
      processedMessageIds.current.add(message.id);

      // Cleanup old IDs to prevent memory leak (keep last 100)
      if (processedMessageIds.current.size > 100) {
        const firstValue = processedMessageIds.current.values().next().value;
        if (firstValue) {
          processedMessageIds.current.delete(firstValue);
        }
      }

      // If message belongs to current chat, append it
      const currentSelected = selectedConversationRef.current;

      if (currentSelected && message.bookingId === currentSelected.bookingId) {
        setMessages((prev) => {
          // Prevent duplicates (double check)
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        // Mark as read immediately if we are looking at it
        if (message.senderId !== user.id) {
          markAsRead(message.bookingId);
        }
      }

      // Update conversation list (move to top, update last message)
      updateConversationList(message);

      // Refresh global unread count
      if (message.senderId !== user.id) {
        refreshUnreadCount();
      }
    });

    setSocket(newSocket);
  };

  const updateConversationList = (message: ChatMessage) => {
    setConversations((prev) => {
      const index = prev.findIndex((c) => c.bookingId === message.bookingId);

      // If conversation not found, reload list to get full details
      if (index === -1) {
        loadConversations();
        return prev;
      }

      const updatedConv = { ...prev[index] };
      updatedConv.lastMessage = message;
      updatedConv.updatedAt = message.createdAt;

      const currentSelected = selectedConversationRef.current;

      if (
        message.senderId !== user?.id &&
        (!currentSelected || currentSelected.bookingId !== message.bookingId)
      ) {
        updatedConv.unreadCount += 1;
      } else if (
        currentSelected &&
        currentSelected.bookingId === message.bookingId
      ) {
        updatedConv.unreadCount = 0;
      }

      const newConversations = [...prev];
      newConversations.splice(index, 1);
      newConversations.unshift(updatedConv);
      return newConversations;
    });
  };

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/my-conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Error loading conversations", error);
    }
  };

  const loadMessages = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);

        // Join the booking room
        if (socket) {
          socket.emit("join_booking", bookingId);
        }
      }
    } catch (error) {
      console.error("Error loading messages", error);
    }
  };

  const markAsRead = async (bookingId: string) => {
    try {
      await fetch(`/api/bookings/${bookingId}/messages/read`, {
        method: "PUT",
      });

      // Update local state
      setConversations((prev) =>
        prev.map((c) =>
          c.bookingId === bookingId ? { ...c, unreadCount: 0 } : c
        )
      );

      refreshUnreadCount();
    } catch (error) {
      console.error("Error marking messages as read", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await fetch(
        `/api/bookings/${selectedConversation.bookingId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: newMessage }),
        }
      );

      if (response.ok) {
        const savedMessage = await response.json();
        setNewMessage("");

        // Add to processed IDs to prevent duplicate from socket
        processedMessageIds.current.add(savedMessage.id);

        // Optimistically add message to UI (duplicate check in socket listener will prevent double entry)
        setMessages((prev) => {
          if (prev.some((m) => m.id === savedMessage.id)) return prev;
          return [...prev, savedMessage];
        });

        // Update conversation list immediately
        updateConversationList(savedMessage);
      }
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return formatTime(dateString);
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ieri";
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="messages-page">
      {/* Sidebar */}
      <div
        className={`conversations-sidebar ${
          !showSidebar && isMobileView ? "hidden" : ""
        }`}
      >
        <div className="conversations-header">
          <h2>Messaggi</h2>
        </div>
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="empty-state">
              <p>Nessuna conversazione attiva</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.bookingId}
                className={`conversation-item ${
                  selectedConversation?.bookingId === conv.bookingId
                    ? "active"
                    : ""
                } ${conv.unreadCount > 0 ? "unread" : ""}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="conversation-header">
                  <span className="conversation-title">
                    {conv.serviceTitle}
                  </span>
                  <span className="conversation-time">
                    {conv.lastMessage
                      ? formatDate(conv.lastMessage.createdAt)
                      : ""}
                  </span>
                </div>
                <div className="conversation-preview">
                  {conv.lastMessage ? (
                    <>
                      {conv.lastMessage.senderId === user?.id ? "Tu: " : ""}
                      {conv.lastMessage.message}
                    </>
                  ) : (
                    <em>Nessun messaggio</em>
                  )}
                </div>
                {conv.unreadCount > 0 && (
                  <span className="unread-badge">{conv.unreadCount}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedConversation ? (
          <>
            <div className="chat-header">
              <button
                className="back-button"
                onClick={() => {
                  setShowSidebar(true);
                  setSelectedConversation(null);
                }}
              >
                ←
              </button>
              <div className="chat-header-info">
                <h3>{selectedConversation.serviceTitle}</h3>
                <p>{selectedConversation.otherPartyEmail}</p>
              </div>
            </div>

            <div className="messages-container">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-bubble ${
                    msg.senderId === user?.id ? "sent" : "received"
                  }`}
                  title={`Inviato da: ${msg.senderEmail} (${msg.senderType})`}
                >
                  <div className="message-text">{msg.message}</div>
                  <div className="message-time">
                    {formatTime(msg.createdAt)}
                    {msg.read && msg.senderId === user?.id && (
                      <span className="read-receipt"> ✓✓</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="message-input"
                placeholder="Scrivi un messaggio..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button
                type="submit"
                className="send-button"
                disabled={!newMessage.trim()}
              >
                ➤
              </button>
            </form>
          </>
        ) : (
          <div className="empty-chat-state">
            <h3>Seleziona una conversazione</h3>
            <p>Scegli una chat dalla lista per iniziare a messaggiare</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
// test append
