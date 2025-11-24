import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { sendNotification } from "../utils/notification";
import { sendEmail, emailTemplates } from "../emailService";
import { stripe, mockStripeSessions } from "../config/stripe";

const router = Router();
const prisma = new PrismaClient();

// Verify payment and create booking
router.get(
  "/verify-payment",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { session_id } = req.query;

      if (!session_id || typeof session_id !== "string") {
        res.status(400).json({ error: "Session ID is required" });
        return;
      }

      let session;
      if (
        (process.env.STRIPE_SECRET_KEY === "sk_test_dummy" ||
          !process.env.STRIPE_SECRET_KEY) &&
        session_id.startsWith("cs_test_")
      ) {
        session = mockStripeSessions[session_id];
        if (!session) {
          res.status(404).json({ error: "Mock session not found" });
          return;
        }
      } else {
        session = await stripe.checkout.sessions.retrieve(session_id);
      }

      if (session.status === "complete") {
        const metadata = session.metadata;
        const paymentIntentId = session.payment_intent as string;

        if (metadata?.serviceId) {
          // New flow: Create booking after payment
          const bookingId = `booking-${session.id}`;

          const existingBooking = await prisma.booking.findUnique({
            where: { id: bookingId },
          });

          if (existingBooking) {
            res.json({ success: true, booking: existingBooking });
            return;
          }

          const booking = await prisma.booking.create({
            data: {
              id: bookingId,
              serviceId: metadata.serviceId,
              clientId: metadata.clientId,
              clientEmail: metadata.clientEmail,
              providerId: metadata.providerId,
              providerEmail: metadata.providerEmail,
              serviceTitle: metadata.serviceTitle,
              amount: parseFloat(metadata.amount),
              date: new Date(metadata.date) as any,
              status: "pending",
              paymentStatus: "authorized",
              paymentIntentId: paymentIntentId,
              createdAt: new Date(),
              clientPhone: metadata.clientPhone || null,
              preferredTime: metadata.preferredTime || null,
              notes: metadata.notes || null,
              address: metadata.address || null,
            },
          });

          sendNotification(
            booking.providerId,
            "Nuova Prenotazione",
            `Hai ricevuto una nuova prenotazione per "${booking.serviceTitle}"`,
            "success"
          );

          sendEmail(
            booking.providerEmail,
            "Nuova Prenotazione Ricevuta",
            emailTemplates.newBookingProvider(
              booking.providerEmail.split("@")[0],
              booking.clientEmail.split("@")[0],
              booking.serviceTitle,
              new Date(booking.date).toLocaleDateString("it-IT")
            )
          );

          sendEmail(
            booking.clientEmail,
            "Prenotazione Confermata",
            emailTemplates.newBookingClient(
              booking.clientEmail.split("@")[0],
              booking.serviceTitle,
              new Date(booking.date).toLocaleDateString("it-IT")
            )
          );

          res.json({ success: true, booking });
        } else {
          // Old flow
          const bookingId = metadata?.bookingId;
          const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
          });

          if (booking) {
            const updatedBooking = await prisma.booking.update({
              where: { id: bookingId },
              data: {
                paymentStatus: "authorized",
                paymentIntentId: paymentIntentId,
              },
            });
            res.json({ success: true, booking: updatedBooking });
          } else {
            res.status(404).json({ error: "Booking not found" });
          }
        }
      } else {
        res.status(400).json({ error: "Payment not completed" });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Payment verification failed" });
    }
  }
);

// Legacy Stripe Payment Route
router.post(
  "/create-checkout-session",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { bookingId } = req.body;
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      if (booking.clientId !== req.user!.id) {
        res.status(403).json({ error: "Unauthorized to pay for this booking" });
        return;
      }

      if (booking.paymentStatus !== "unpaid") {
        res.status(400).json({
          error:
            "This booking has already been paid or is not in a payable state",
        });
        return;
      }

      if (booking.status === "cancelled") {
        res.status(400).json({ error: "Cannot pay for a cancelled booking" });
        return;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: booking.serviceTitle,
                description: `Booking ID: ${booking.id}`,
              },
              unit_amount: Math.round(booking.amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.protocol}://${req.get(
          "host"
        )}/client-dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get(
          "host"
        )}/client-dashboard?payment=cancel`,
        metadata: {
          bookingId: booking.id,
          clientId: req.user!.id,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
);

export default router;
