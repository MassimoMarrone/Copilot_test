import { Request, Response } from "express";
import { bookingService } from "../services/bookingService";
import { chatService } from "../services/chatService";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const bookingController = {
  async createBooking(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.userType !== "client") {
        res.status(403).json({ error: "Only clients can create bookings" });
        return;
      }

      const result = await bookingService.createBooking(
        req.user!.id,
        req.user!.email,
        {
          ...req.body,
          protocol: req.protocol,
          host: req.get("host") || "",
        }
      );

      res.json(result);
    } catch (error: any) {
      console.error("Booking creation error:", error);
      if (error.message === "Service not found") {
        res.status(404).json({ error: error.message });
      } else if (
        error.message.includes("not available") ||
        error.message.includes("already booked") ||
        error.message.includes("prezzo del servizio")
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({
          error:
            "Failed to create booking checkout session: " +
            (error.message || "Unknown error"),
        });
      }
    }
  },

  async getMyBookings(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.userType !== "client") {
        res.status(403).json({ error: "Only clients can access this" });
        return;
      }

      const bookings = await bookingService.getMyBookings(req.user!.id);
      res.json(bookings);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  },

  async getProviderBookings(req: Request, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user || !user.isProvider) {
        res.status(403).json({ error: "Only providers can access this" });
        return;
      }

      const bookings = await bookingService.getProviderBookings(req.user!.id);
      res.json(bookings);
    } catch (error: any) {
      console.error("Error fetching provider bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  },

  async cancelBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const booking = await bookingService.cancelBooking(id, req.user!.id);
      res.json(booking);
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Unauthorized") {
        res.status(403).json({ error: error.message });
      } else if (
        error.message === "Booking already cancelled" ||
        error.message === "Cannot cancel completed booking"
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to cancel booking" });
      }
    }
  },

  async completeBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const booking = await bookingService.completeBooking(id, req.user!.id);
      res.json(booking);
    } catch (error: any) {
      console.error("Error completing booking:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Only provider can complete booking") {
        res.status(403).json({ error: error.message });
      } else if (
        error.message.includes("Payment must be authorized") ||
        error.message.includes("Payment processing failed")
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to complete booking" });
      }
    }
  },

  // Legacy/Compatibility routes for messages
  async getBookingMessages(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params; // bookingId
      const messages = await chatService.getMessages(id, req.user!.id);
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching booking messages:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "You do not have access to this chat") {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch messages" });
      }
    }
  },

  async sendBookingMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params; // bookingId
      const { message } = req.body;

      const result = await chatService.sendMessage(
        req.user!.id,
        req.user!.email,
        req.user!.userType,
        {
          bookingId: id,
          message,
        }
      );
      res.json(result);
    } catch (error: any) {
      console.error("Error sending booking message:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "You do not have access to this chat") {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  },
};
