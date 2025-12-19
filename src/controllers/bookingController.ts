import { Request, Response } from "express";
import { bookingService } from "../services/bookingService";
import { chatService } from "../services/chatService";
import { prisma } from "../lib/prisma";

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

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const bookings = await bookingService.getMyBookings(
        req.user!.id,
        page,
        limit
      );
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
      // Cloudinary returns the full URL in req.file.path
      // Now we support multiple files (up to 10)
      const files = req.files as Express.Multer.File[] | undefined;
      const photoProofUrls = files
        ? files.map((file) => (file as any).path)
        : [];

      const booking = await bookingService.completeBooking(
        id,
        req.user!.id,
        photoProofUrls
      );
      res.json(booking);
    } catch (error: any) {
      console.error("Error completing booking:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Only provider can complete booking") {
        res.status(403).json({ error: error.message });
      } else if (
        error.message.includes("foto") ||
        error.message.includes("Payment") ||
        error.message.includes("processed")
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to complete booking" });
      }
    }
  },

  async confirmServiceCompletion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const booking = await bookingService.confirmServiceCompletion(
        id,
        req.user!.id
      );
      res.json(booking);
    } catch (error: any) {
      console.error("Error confirming service completion:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Only the client")) {
        res.status(403).json({ error: error.message });
      } else if (
        error.message.includes("awaiting confirmation") ||
        error.message.includes("already confirmed") ||
        error.message.includes("disputed")
      ) {
        res.status(400).json({ error: error.message });
      } else if (
        typeof error.message === "string" &&
        (error.message.startsWith("PROVIDER_STRIPE_NOT_READY:") ||
          error.message.startsWith("PROVIDER_STRIPE_CHECK_FAILED:"))
      ) {
        res.status(400).json({
          error: error.message.split(":").slice(1).join(":").trim(),
          code: error.message.split(":")[0],
        });
      } else if (
        typeof error.message === "string" &&
        error.message.startsWith("PLATFORM_BALANCE_INSUFFICIENT:")
      ) {
        res.status(409).json({
          error: error.message.split(":").slice(1).join(":").trim(),
          code: "PLATFORM_BALANCE_INSUFFICIENT",
        });
      } else {
        res.status(500).json({ error: "Failed to confirm service completion" });
      }
    }
  },

  async openDispute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const booking = await bookingService.openDispute(
        id,
        req.user!.id,
        reason
      );
      res.json(booking);
    } catch (error: any) {
      console.error("Error opening dispute:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Only the client")) {
        res.status(403).json({ error: error.message });
      } else if (
        error.message.includes("awaiting confirmation") ||
        error.message.includes("already been opened") ||
        error.message.includes("motivazione")
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to open dispute" });
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
