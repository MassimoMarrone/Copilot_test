import { prisma } from "../lib/prisma";
import { stripe, mockStripeSessions } from "../config/stripe";
import { sendNotification } from "../utils/notification";
import { sendEmail, emailTemplates } from "../emailService";

// Helper function to convert time string to minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

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
        // New flow: Create booking after payment with race condition protection
        const bookingId = `booking-${session.id}`;

        // Check if booking already exists (idempotency)
        const existingBooking = await prisma.booking.findUnique({
          where: { id: bookingId },
        });

        if (existingBooking) {
          return { success: true, booking: existingBooking };
        }

        // Use transaction to prevent race conditions
        // This ensures atomicity: check availability + create booking in one atomic operation
        const booking = await prisma.$transaction(
          async (tx) => {
            // Re-verify slot availability inside transaction
            if (metadata.startTime && metadata.endTime) {
              const bookingDate = new Date(metadata.date);
              const startOfDay = new Date(bookingDate);
              startOfDay.setHours(0, 0, 0, 0);
              const endOfDay = new Date(bookingDate);
              endOfDay.setHours(23, 59, 59, 999);

              // Find conflicting bookings for the same service on the same day
              const conflictingBookings = await tx.booking.findMany({
                where: {
                  serviceId: metadata.serviceId,
                  status: { not: "cancelled" },
                  date: {
                    gte: startOfDay as any,
                    lte: endOfDay as any,
                  },
                  // Only check bookings with time slots
                  startTime: { not: null },
                  endTime: { not: null },
                },
              });

              // Check for time overlap
              const newStart = timeToMinutes(metadata.startTime);
              const newEnd = timeToMinutes(metadata.endTime);

              for (const existing of conflictingBookings) {
                if (existing.startTime && existing.endTime) {
                  const existingStart = timeToMinutes(existing.startTime);
                  const existingEnd = timeToMinutes(existing.endTime);

                  // Overlap formula: newStart < existingEnd AND newEnd > existingStart
                  const hasOverlap =
                    newStart < existingEnd && newEnd > existingStart;
                  if (hasOverlap) {
                    throw new Error(
                      "SLOT_NO_LONGER_AVAILABLE: Lo slot selezionato non è più disponibile. Un altro utente ha prenotato prima di te."
                    );
                  }
                }
              }
            }

            // Create booking inside transaction (atomic with availability check)
            return tx.booking.create({
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
                paymentStatus: "authorized", // Payment authorized but not captured yet (48h delay)
                paymentIntentId: paymentIntentId,
                paymentAuthorizedAt: new Date(), // Track when authorization happened for 48h capture
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
                // Selected extras
                selectedExtras: metadata.selectedExtras || null,
                // Client products they have at home
                clientProducts: metadata.clientProducts || null,
              },
            });
          },
          {
            // Serializable isolation level for maximum safety against race conditions
            isolationLevel: "Serializable",
          }
        );

        // Send notifications after successful transaction (outside transaction for performance)
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
        // Old flow (legacy)
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
              paymentStatus: "paid", // Changed from "authorized" to "paid"
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
