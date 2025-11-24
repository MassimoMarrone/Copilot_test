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
