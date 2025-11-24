import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { PrismaClient } from "@prisma/client";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { getIO } from "../socket";

const router = Router();
const prisma = new PrismaClient();

// Send a message in a booking chat
router.post(
  "/messages",
  authenticate,
  [
    body("bookingId").isUUID().withMessage("Invalid booking ID"),
    body("message")
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Message must be between 1 and 1000 characters"),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const { bookingId, message } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (
      booking.clientId !== req.user!.id &&
      booking.providerId !== req.user!.id
    ) {
      res.status(403).json({ error: "You do not have access to this chat" });
      return;
    }

    let senderType: "client" | "provider" = req.user!.userType as
      | "client"
      | "provider";

    if (
      booking.providerId === req.user!.id &&
      booking.clientId === req.user!.id
    ) {
      if (req.body.senderType === "provider") senderType = "provider";
      else if (req.body.senderType === "client") senderType = "client";
    } else if (booking.providerId === req.user!.id) {
      senderType = "provider";
    } else if (booking.clientId === req.user!.id) {
      senderType = "client";
    }

    const chatMessage = await prisma.chatMessage.create({
      data: {
        bookingId,
        senderId: req.user!.id,
        senderEmail: req.user!.email,
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
        booking.clientId === req.user!.id
          ? booking.providerId
          : booking.clientId;

      io.to(`user_${recipientId}`).emit("receive_message", chatMessage);

      io.to(`user_${recipientId}`).emit("message_received_notification", {
        bookingId,
        senderId: req.user!.id,
      });
    } catch (e) {
      console.error("Socket error:", e);
    }

    res.json(chatMessage);
  }
);

// Get all messages for a booking
router.get(
  "/messages",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.query.bookingId as string;

    if (!bookingId) {
      res.status(400).json({ error: "Booking ID is required" });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (
      booking.clientId !== req.user!.id &&
      booking.providerId !== req.user!.id
    ) {
      res.status(403).json({ error: "You do not have access to this chat" });
      return;
    }

    const messages = await prisma.chatMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  }
);

// Get unread messages count
router.get(
  "/unread-messages-count",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const userBookings = await prisma.booking.findMany({
      where: {
        OR: [{ clientId: userId }, { providerId: userId }],
      },
      select: { id: true },
    });

    const bookingIds = userBookings.map((b: any) => b.id);

    if (bookingIds.length === 0) {
      res.json({ count: 0 });
      return;
    }

    const unreadCount = await prisma.chatMessage.count({
      where: {
        bookingId: { in: bookingIds },
        senderId: { not: userId },
        read: false,
      },
    });

    res.json({ count: unreadCount });
  }
);

// Mark messages as read for a booking
router.put(
  "/messages/read",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { bookingId } = req.body;

    if (!bookingId) {
      res.status(400).json({ error: "Booking ID is required" });
      return;
    }
    const userId = req.user!.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.clientId !== userId && booking.providerId !== userId) {
      res.status(403).json({ error: "You do not have access to this chat" });
      return;
    }

    await prisma.chatMessage.updateMany({
      where: {
        bookingId: bookingId,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    res.json({ success: true });
  }
);

// Get all conversations for the current user
router.get(
  "/my-conversations",
  authenticate,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const userBookings = await prisma.booking.findMany({
      where: {
        OR: [{ clientId: userId }, { providerId: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                read: false,
              },
            },
          },
        },
      },
    });

    const conversations = userBookings.map((booking: any) => {
      const lastMessage = booking.messages[0] || null;
      const unreadCount = booking._count.messages;

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

    res.json(conversations);
  }
);

export default router;
