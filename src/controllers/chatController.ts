import { Request, Response } from "express";
import { chatService } from "../services/chatService";

export const chatController = {
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const result = await chatService.sendMessage(
        req.user!.id,
        req.user!.email,
        req.user!.userType,
        req.body
      );
      res.json(result);
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "You do not have access to this chat") {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  },

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const bookingId = req.query.bookingId as string;
      if (!bookingId) {
        res.status(400).json({ error: "Booking ID is required" });
        return;
      }

      const messages = await chatService.getMessages(bookingId, req.user!.id);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "You do not have access to this chat") {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch messages" });
      }
    }
  },

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const count = await chatService.getUnreadCount(req.user!.id);
      res.json({ count });
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  },

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.body;
      if (!bookingId) {
        res.status(400).json({ error: "Booking ID is required" });
        return;
      }

      const result = await chatService.markAsRead(bookingId, req.user!.id);
      res.json(result);
    } catch (error: any) {
      console.error("Error marking messages as read:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "You do not have access to this chat") {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to mark messages as read" });
      }
    }
  },

  async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const conversations = await chatService.getConversations(req.user!.id);
      res.json(conversations);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  },
};
