import { PrismaClient } from "@prisma/client";
import { getIO } from "../socket";

const prisma = new PrismaClient();

export const chatService = {
  async sendMessage(
    userId: string,
    userEmail: string,
    userType: string,
    data: { bookingId: string; message: string; senderType?: string }
  ) {
    const { bookingId, message } = data;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw new Error("You do not have access to this chat");
    }

    let senderType: "client" | "provider" = userType as "client" | "provider";

    if (booking.providerId === userId && booking.clientId === userId) {
      if (data.senderType === "provider") senderType = "provider";
      else if (data.senderType === "client") senderType = "client";
    } else if (booking.providerId === userId) {
      senderType = "provider";
    } else if (booking.clientId === userId) {
      senderType = "client";
    }

    const chatMessage = await prisma.chatMessage.create({
      data: {
        bookingId,
        senderId: userId,
        senderEmail: userEmail,
        senderType: senderType,
        message,
        read: false,
        createdAt: new Date(),
      },
    });

    try {
      const io = getIO();
      io.to(bookingId).emit("receive_message", chatMessage);

      const recipientId =
        booking.clientId === userId ? booking.providerId : booking.clientId;

      io.to(`user_${recipientId}`).emit("receive_message", chatMessage);

      io.to(`user_${recipientId}`).emit("message_received_notification", {
        bookingId,
        senderId: userId,
      });
    } catch (e) {
      console.error("Socket error:", e);
    }

    return chatMessage;
  },

  async getMessages(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw new Error("You do not have access to this chat");
    }

    const messages = await prisma.chatMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
    });

    return messages;
  },

  async getUnreadCount(userId: string) {
    const userBookings = await prisma.booking.findMany({
      where: {
        OR: [{ clientId: userId }, { providerId: userId }],
      },
      select: { id: true },
    });

    const bookingIds = userBookings.map((b: any) => b.id);

    if (bookingIds.length === 0) {
      return 0;
    }

    const unreadCount = await prisma.chatMessage.count({
      where: {
        bookingId: { in: bookingIds },
        senderId: { not: userId },
        read: false,
      },
    });

    return unreadCount;
  },

  async markAsRead(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw new Error("You do not have access to this chat");
    }

    await prisma.chatMessage.updateMany({
      where: {
        bookingId: bookingId,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    return { success: true };
  },

  async getConversations(userId: string) {
    // Ottimizzato: query separate più leggere invece di N+1
    const userBookings = await prisma.booking.findMany({
      where: {
        OR: [{ clientId: userId }, { providerId: userId }],
      },
      select: {
        id: true,
        serviceTitle: true,
        clientId: true,
        clientEmail: true,
        providerEmail: true,
        createdAt: true,
      },
    });

    if (userBookings.length === 0) {
      return [];
    }

    const bookingIds = userBookings.map((b) => b.id);

    // Query per ultimi messaggi (una sola query per tutti i booking)
    const lastMessages = await prisma.$queryRaw<
      Array<{
        bookingId: string;
        id: string;
        senderId: string;
        senderEmail: string;
        senderType: string;
        message: string;
        read: boolean;
        createdAt: Date;
      }>
    >`
      SELECT DISTINCT ON ("bookingId") *
      FROM "ChatMessage"
      WHERE "bookingId" = ANY(${bookingIds})
      ORDER BY "bookingId", "createdAt" DESC
    `;

    // Query per conteggio non letti (una sola query per tutti i booking)
    const unreadCounts = await prisma.chatMessage.groupBy({
      by: ["bookingId"],
      where: {
        bookingId: { in: bookingIds },
        senderId: { not: userId },
        read: false,
      },
      _count: { id: true },
    });

    // Mappa per lookup veloce
    const lastMessageMap = new Map(lastMessages.map((m) => [m.bookingId, m]));
    const unreadMap = new Map(
      unreadCounts.map((u) => [u.bookingId, u._count.id])
    );

    const conversations = userBookings.map((booking) => {
      const lastMessage = lastMessageMap.get(booking.id) || null;
      const unreadCount = unreadMap.get(booking.id) || 0;

      return {
        bookingId: booking.id,
        serviceTitle: booking.serviceTitle,
        otherPartyEmail:
          booking.clientId === userId
            ? booking.providerEmail
            : booking.clientEmail,
        lastMessage: lastMessage,
        updatedAt: lastMessage ? lastMessage.createdAt : booking.createdAt,
        unreadCount,
      };
    });

    conversations.sort(
      (a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return conversations;
  },
};
