import { get, post, put } from "./api";

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderEmail: string;
  senderType: "client" | "provider";
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  bookingId: string;
  serviceTitle: string;
  otherPartyEmail: string;
  lastMessage: ChatMessage | null;
  updatedAt: string;
  unreadCount: number;
}

export const chatService = {
  // Get messages for a booking
  getMessages: async (bookingId: string): Promise<ChatMessage[]> => {
    console.log("Fetching messages via /api/messages for:", bookingId);
    return get<ChatMessage[]>(`/api/messages?bookingId=${bookingId}`);
  },

  // Send a message
  sendMessage: async (
    bookingId: string,
    message: string
  ): Promise<ChatMessage> => {
    console.log("Sending message via /api/messages for:", bookingId);
    return post<ChatMessage>("/api/messages", { bookingId, message });
  },

  // Mark messages as read
  markAsRead: async (bookingId: string): Promise<{ success: boolean }> => {
    console.log("Marking as read via /api/messages/read for:", bookingId);
    return put<{ success: boolean }>("/api/messages/read", { bookingId });
  },

  // Get unread count
  getUnreadCount: async (): Promise<{ count: number }> => {
    return get<{ count: number }>("/api/unread-messages-count");
  },

  // Get all conversations
  getMyConversations: async (): Promise<Conversation[]> => {
    return get<Conversation[]>("/api/my-conversations");
  },
};
