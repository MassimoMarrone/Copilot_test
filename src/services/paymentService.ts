import { PrismaClient } from "@prisma/client";
import { stripe, mockStripeSessions } from "../config/stripe";
import { sendNotification } from "../utils/notification";
import { sendEmail, emailTemplates } from "../emailService";

const prisma = new PrismaClient();

export const paymentService = {
  async verifyPayment(sessionId: string) {
    let session;
    if (
      (process.env.STRIPE_SECRET_KEY === "sk_test_dummy" ||
        !process.env.STRIPE_SECRET_KEY) &&
      sessionId.startsWith("cs_test_")
    ) {
      session = mockStripeSessions[sessionId];
      if (!session) {
        throw new Error("Mock session not found");
      }
    } else {
      session = await stripe.checkout.sessions.retrieve(sessionId);
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
          return { success: true, booking: existingBooking };
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
            // Smart booking fields
            squareMetersRange: metadata.squareMetersRange || null,
            windowsCount: metadata.windowsCount
              ? parseInt(metadata.windowsCount, 10)
              : null,
            estimatedDuration: metadata.estimatedDuration
              ? parseInt(metadata.estimatedDuration, 10)
              : null,
            startTime: metadata.startTime || null,
            endTime: metadata.endTime || null,
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

        return { success: true, booking };
      } else {
        // Old flow
        const bookingId = metadata?.bookingId;
        if (!bookingId) {
          throw new Error("Booking ID missing in metadata");
        }
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
          return { success: true, booking: updatedBooking };
        } else {
          throw new Error("Booking not found");
        }
      }
    } else {
      throw new Error("Payment not completed");
    }
  },

  async createCheckoutSession(
    userId: string,
    bookingId: string,
    protocol: string,
    host: string
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.clientId !== userId) {
      throw new Error("Unauthorized to pay for this booking");
    }

    if (booking.paymentStatus !== "unpaid") {
      throw new Error(
        "This booking has already been paid or is not in a payable state"
      );
    }

    if (booking.status === "cancelled") {
      throw new Error("Cannot pay for a cancelled booking");
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
      success_url: `${protocol}://${host}/client-dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${protocol}://${host}/client-dashboard?payment=cancel`,
      metadata: {
        bookingId: booking.id,
        clientId: userId,
      },
    });

    return { id: session.id, url: session.url };
  },
};
