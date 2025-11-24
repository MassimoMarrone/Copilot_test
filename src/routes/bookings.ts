import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { PrismaClient } from "@prisma/client";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { sendNotification } from "../utils/notification";
import { sendEmail, emailTemplates } from "../emailService";
import { stripe, mockStripeSessions } from "../config/stripe";

const router = Router();
const prisma = new PrismaClient();

// Create booking and checkout session (clients only)
router.post(
  "/bookings",
  authenticate,
  [
    body("serviceId").notEmpty().withMessage("Service ID is required"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("clientPhone")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Phone number must be less than 50 characters"),
    body("preferredTime")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Preferred time must be less than 50 characters"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Notes must be less than 1000 characters"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.user!.userType !== "client") {
        res.status(403).json({ error: "Only clients can create bookings" });
        return;
      }

      const { serviceId, date, clientPhone, preferredTime, notes, address } =
        req.body;

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: { provider: true },
      });

      if (!service) {
        res.status(404).json({ error: "Service not found" });
        return;
      }

      // Check service availability
      if (service.availability) {
        const bookingDateObj = new Date(date);
        const dateString = bookingDateObj.toISOString().split("T")[0];

        let availability: any = service.availability;
        if (typeof availability === "string") {
          try {
            availability = JSON.parse(availability);
          } catch (e) {
            console.error("Error parsing availability for booking:", e);
            availability = null;
          }
        }

        if (availability) {
          if (
            availability.blockedDates &&
            availability.blockedDates.includes(dateString)
          ) {
            res.status(400).json({
              error: "The service is not available on this date (blocked).",
            });
            return;
          }

          const days = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ];
          const dayName = days[bookingDateObj.getDay()];

          if (availability.weekly) {
            const daySchedule = availability.weekly[dayName];
            if (daySchedule && !daySchedule.enabled) {
              res.status(400).json({
                error: `The service is not available on ${dayName}s.`,
              });
              return;
            }
          }
        }
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingBooking = await prisma.booking.findFirst({
        where: {
          serviceId: serviceId,
          status: { not: "cancelled" },
          date: {
            gte: startOfDay as any,
            lte: endOfDay as any,
          },
        },
      });

      if (existingBooking) {
        res.status(400).json({
          error:
            "This service is already booked for the selected date. Please choose a different date.",
        });
        return;
      }

      if (service.price < 0.5) {
        res.status(400).json({
          error:
            "Il prezzo del servizio è inferiore al minimo consentito per i pagamenti online (€0.50).",
        });
        return;
      }

      const safeMetadata = {
        serviceId: service.id,
        clientId: req.user!.id,
        clientEmail: req.user!.email.substring(0, 500),
        providerId: service.providerId,
        providerEmail: service.providerEmail.substring(0, 500),
        serviceTitle: service.title.substring(0, 500),
        amount: service.price.toString(),
        date: date,
        clientPhone: (clientPhone || "").substring(0, 500),
        preferredTime: (preferredTime || "").substring(0, 500),
        notes: (notes || "").substring(0, 500),
        address: (address || "").substring(0, 500),
      };

      let session;

      if (
        process.env.STRIPE_SECRET_KEY === "sk_test_dummy" ||
        !process.env.STRIPE_SECRET_KEY
      ) {
        console.log("Using mock Stripe session for testing");
        const mockSessionId = "cs_test_" + Date.now();
        const mockSession = {
          id: mockSessionId,
          status: "complete",
          payment_status: "unpaid",
          payment_intent: "pi_mock_" + Date.now(),
          metadata: safeMetadata,
        };
        mockStripeSessions[mockSessionId] = mockSession;

        session = {
          id: mockSessionId,
          url: `${req.protocol}://${req.get(
            "host"
          )}/client-dashboard?payment=success&session_id=${mockSessionId}`,
        };
      } else {
        session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: service.title,
                  description: `Service booking for ${new Date(
                    date
                  ).toLocaleDateString("it-IT")}`,
                },
                unit_amount: Math.round(service.price * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          payment_intent_data: {
            capture_method: "manual",
          },
          success_url: `${req.protocol}://${req.get(
            "host"
          )}/client-dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.protocol}://${req.get(
            "host"
          )}/client-dashboard?payment=cancel`,
          metadata: safeMetadata,
        });
      }

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Booking creation error:", error);
      res.status(500).json({
        error:
          "Failed to create booking checkout session: " +
          (error.message || "Unknown error"),
      });
    }
  }
);

// Get client's bookings
router.get(
  "/my-bookings",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    if (req.user!.userType !== "client") {
      res.status(403).json({ error: "Only clients can access this" });
      return;
    }

    const myBookings = await prisma.booking.findMany({
      where: { clientId: req.user!.id },
      include: {
        review: true,
      },
    });

    const enrichedBookings = myBookings.map((booking: any) => {
      const hasReview = !!booking.review;
      const { review, ...bookingData } = booking;
      return { ...bookingData, hasReview };
    });

    res.json(enrichedBookings);
  }
);

// Get provider's bookings
router.get(
  "/provider-bookings",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can access this" });
      return;
    }
    const providerBookings = await prisma.booking.findMany({
      where: { providerId: req.user!.id },
    });
    res.json(providerBookings);
  }
);

// Cancel booking
router.post(
  "/bookings/:id/cancel",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.id;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.clientId !== userId && booking.providerId !== userId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    if (booking.status === "cancelled") {
      res.status(400).json({ error: "Booking already cancelled" });
      return;
    }

    if (booking.status === "completed") {
      res.status(400).json({ error: "Cannot cancel completed booking" });
      return;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: "cancelled" },
    });

    // Notify the other party
    const recipientId =
      booking.clientId === userId ? booking.providerId : booking.clientId;
    const cancellerName =
      booking.clientId === userId ? "The client" : "The provider";

    await sendNotification(
      recipientId,
      "Booking Cancelled",
      `${cancellerName} has cancelled the booking for ${
        booking.service.title
      } on ${new Date(booking.date).toISOString().split("T")[0]}`
    );

    // Send cancellation emails
    sendEmail(
      booking.clientEmail,
      "Prenotazione Cancellata",
      emailTemplates.bookingCancelled(
        booking.clientEmail.split("@")[0],
        booking.serviceTitle,
        "Cancellata dal fornitore"
      )
    );

    sendEmail(
      booking.providerEmail,
      "Prenotazione Cancellata",
      emailTemplates.bookingCancelled(
        booking.providerEmail.split("@")[0],
        booking.serviceTitle,
        "Hai cancellato questa prenotazione"
      )
    );

    res.json(updatedBooking);
  }
);

// Complete booking (Provider only)
router.post(
  "/bookings/:id/complete",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.id;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.providerId !== userId) {
      res.status(403).json({ error: "Only provider can complete booking" });
      return;
    }

    if (
      booking.paymentStatus !== "held_in_escrow" &&
      booking.paymentStatus !== "authorized"
    ) {
      res.status(400).json({
        error:
          "Payment must be authorized or held in escrow before completing the service",
      });
      return;
    }

    try {
      if (booking.paymentStatus === "authorized" && booking.paymentIntentId) {
        if (booking.paymentIntentId.startsWith("pi_mock_")) {
          console.log(`Mock captured payment for booking ${booking.id}`);
        } else {
          await stripe.paymentIntents.capture(booking.paymentIntentId);
        }
      }
    } catch (e: any) {
      res
        .status(500)
        .json({ error: "Payment processing failed: " + e.message });
      return;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: "completed",
        paymentStatus: "released",
        completedAt: new Date(),
      },
    });

    await sendNotification(
      booking.clientId,
      "Booking Completed",
      `The service ${booking.service.title} has been marked as completed.`
    );

    // Send completion email
    sendEmail(
      booking.clientEmail,
      "Servizio Completato - Lascia una recensione",
      emailTemplates.bookingCompleted(
        booking.clientEmail.split("@")[0],
        booking.serviceTitle
      )
    );

    res.json(updatedBooking);
  }
);

export default router;
