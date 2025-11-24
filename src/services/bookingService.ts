import { PrismaClient } from "@prisma/client";
import { stripe, mockStripeSessions } from "../config/stripe";
import { sendNotification } from "../utils/notification";
import { sendEmail, emailTemplates } from "../emailService";

const prisma = new PrismaClient();

export const bookingService = {
  async createBooking(
    userId: string,
    userEmail: string,
    data: {
      serviceId: string;
      date: string;
      clientPhone?: string;
      preferredTime?: string;
      notes?: string;
      address?: string;
      protocol: string;
      host: string;
    }
  ) {
    const {
      serviceId,
      date,
      clientPhone,
      preferredTime,
      notes,
      address,
      protocol,
      host,
    } = data;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { provider: true },
    });

    if (!service) {
      throw new Error("Service not found");
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
          throw new Error("The service is not available on this date (blocked).");
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
            throw new Error(`The service is not available on ${dayName}s.`);
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
      throw new Error(
        "This service is already booked for the selected date. Please choose a different date."
      );
    }

    if (service.price < 0.5) {
      throw new Error(
        "Il prezzo del servizio è inferiore al minimo consentito per i pagamenti online (€0.50)."
      );
    }

    const safeMetadata = {
      serviceId: service.id,
      clientId: userId,
      clientEmail: userEmail.substring(0, 500),
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
        url: `${protocol}://${host}/client-dashboard?payment=success&session_id=${mockSessionId}`,
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
        success_url: `${protocol}://${host}/client-dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${protocol}://${host}/client-dashboard?payment=cancel`,
        metadata: safeMetadata,
      });
    }

    return { id: session.id, url: session.url };
  },

  async getMyBookings(userId: string) {
    const myBookings = await prisma.booking.findMany({
      where: { clientId: userId },
      include: {
        review: true,
      },
    });

    const enrichedBookings = myBookings.map((booking: any) => {
      const hasReview = !!booking.review;
      const { review, ...bookingData } = booking;
      return { ...bookingData, hasReview };
    });

    return enrichedBookings;
  },

  async getProviderBookings(providerId: string) {
    const providerBookings = await prisma.booking.findMany({
      where: { providerId: providerId },
    });
    return providerBookings;
  },

  async cancelBooking(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw new Error("Unauthorized");
    }

    if (booking.status === "cancelled") {
      throw new Error("Booking already cancelled");
    }

    if (booking.status === "completed") {
      throw new Error("Cannot cancel completed booking");
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
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

    return updatedBooking;
  },

  async completeBooking(bookingId: string, providerId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.providerId !== providerId) {
      throw new Error("Only provider can complete booking");
    }

    if (
      booking.paymentStatus !== "held_in_escrow" &&
      booking.paymentStatus !== "authorized"
    ) {
      throw new Error(
        "Payment must be authorized or held in escrow before completing the service"
      );
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
      throw new Error("Payment processing failed: " + e.message);
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
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

    return updatedBooking;
  },
};
