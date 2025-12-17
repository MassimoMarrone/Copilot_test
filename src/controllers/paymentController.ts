import { Request, Response } from "express";
import { paymentService } from "../services/paymentService";
import { stripe } from "../config/stripe";

export const paymentController = {
  async verifyPayment(req: Request, res: Response): Promise<void> {
    const { session_id } = req.query;

    try {
      if (!session_id || typeof session_id !== "string") {
        res.status(400).json({ error: "Session ID is required" });
        return;
      }

      const result = await paymentService.verifyPayment(session_id);
      res.json(result);
    } catch (error: any) {
      console.error("Payment verification error:", error);

      // Handle race condition - slot no longer available
      if (error.message?.startsWith("SLOT_NO_LONGER_AVAILABLE")) {
        // Try to refund the payment automatically
        try {
          const session = await stripe.checkout.sessions.retrieve(
            session_id as string
          );
          if (session.payment_intent) {
            await stripe.refunds.create({
              payment_intent: session.payment_intent as string,
              reason: "requested_by_customer",
            });
            console.log(
              `Refund issued for session ${session_id} due to race condition`
            );
          }
        } catch (refundError) {
          console.error("Failed to issue automatic refund:", refundError);
        }

        res.status(409).json({
          error:
            "Lo slot selezionato non è più disponibile. Un altro utente ha prenotato prima di te. Il pagamento verrà rimborsato automaticamente.",
          code: "SLOT_NO_LONGER_AVAILABLE",
        });
        return;
      }

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
