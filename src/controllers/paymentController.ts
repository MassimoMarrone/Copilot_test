import { Request, Response } from "express";
import { paymentService } from "../services/paymentService";

export const paymentController = {
  async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const { session_id } = req.query;

      if (!session_id || typeof session_id !== "string") {
        res.status(400).json({ error: "Session ID is required" });
        return;
      }

      const result = await paymentService.verifyPayment(session_id);
      res.json(result);
    } catch (error: any) {
      console.error("Payment verification error:", error);
      if (error.message === "Mock session not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Payment not completed") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Payment verification failed" });
      }
    }
  },

  async createCheckoutSession(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.body;
      const result = await paymentService.createCheckoutSession(
        req.user!.id,
        bookingId,
        req.protocol,
        req.get("host") || ""
      );
      res.json(result);
    } catch (error: any) {
      console.error("Stripe error:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Unauthorized to pay for this booking") {
        res.status(403).json({ error: error.message });
      } else if (
        error.message.includes("already been paid") ||
        error.message.includes("cancelled booking")
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create checkout session" });
      }
    }
  },
};
