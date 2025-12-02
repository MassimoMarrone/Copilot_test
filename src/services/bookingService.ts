import { PrismaClient } from "@prisma/client";
import { stripe, mockStripeSessions } from "../config/stripe";
import { sendNotification } from "../utils/notification";
import { sendEmail, emailTemplates } from "../emailService";
import { schedulingService } from "./schedulingService";
import { bookingLogger, paymentLogger } from "../utils/logger";

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
      // New smart booking fields
      squareMetersRange?: string;
      windowsCount?: number;
      startTime?: string;
      endTime?: string;
      selectedExtras?: { name: string; price: number }[];
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
      squareMetersRange,
      windowsCount,
      startTime,
      endTime,
      selectedExtras,
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
          throw new Error(
            "The service is not available on this date (blocked)."
          );
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

    // Calculate estimated duration if apartment details provided
    let estimatedDuration: number | null = null;
    if (squareMetersRange && windowsCount !== undefined) {
      const duration = schedulingService.calculateEstimatedDuration(
        squareMetersRange,
        windowsCount
      );
      estimatedDuration = duration.minutes;
    }

    // Validate time slot availability if startTime/endTime provided
    if (startTime && endTime) {
      const isSlotAvailable = await schedulingService.validateSlotAvailability(
        serviceId,
        date,
        startTime,
        endTime
      );
      if (!isSlotAvailable) {
        throw new Error(
          "L'orario selezionato non è più disponibile. Per favore scegli un altro orario."
        );
      }
    } else {
      // Legacy check: block entire day if no time slot specified
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
    }

    // Calculate price (dynamic if apartment details provided)
    let finalPrice = service.price;
    if (squareMetersRange && estimatedDuration) {
      finalPrice = schedulingService.calculatePrice(
        {
          price: service.price,
          priceType: (service as any).priceType || "fixed",
        },
        estimatedDuration,
        squareMetersRange
      );
    }

    // Add selected extras to the price
    let extrasTotal = 0;
    if (selectedExtras && selectedExtras.length > 0) {
      extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
      finalPrice += extrasTotal;
    }

    if (finalPrice < 0.5) {
      throw new Error(
        "Il prezzo del servizio è inferiore al minimo consentito per i pagamenti online (€0.50)."
      );
    }

    // Build booking description
    let bookingDescription = `Prenotazione per ${new Date(
      date
    ).toLocaleDateString("it-IT")}`;
    if (startTime && endTime) {
      bookingDescription += ` dalle ${startTime} alle ${endTime}`;
    }
    if (squareMetersRange) {
      bookingDescription += ` - ${squareMetersRange}m²`;
    }

    const safeMetadata = {
      serviceId: service.id,
      clientId: userId,
      clientEmail: userEmail.substring(0, 500),
      providerId: service.providerId,
      providerEmail: service.providerEmail.substring(0, 500),
      serviceTitle: service.title.substring(0, 500),
      amount: finalPrice.toString(),
      date: date,
      clientPhone: (clientPhone || "").substring(0, 500),
      preferredTime: (preferredTime || "").substring(0, 500),
      notes: (notes || "").substring(0, 500),
      address: (address || "").substring(0, 500),
      // New smart booking fields
      squareMetersRange: (squareMetersRange || "").substring(0, 50),
      windowsCount: (windowsCount || 0).toString(),
      estimatedDuration: (estimatedDuration || 0).toString(),
      startTime: (startTime || "").substring(0, 10),
      endTime: (endTime || "").substring(0, 10),
      // Selected extras (JSON stringified, max 500 chars for Stripe)
      selectedExtras: selectedExtras
        ? JSON.stringify(selectedExtras).substring(0, 500)
        : "",
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
                description: bookingDescription,
              },
              unit_amount: Math.round(finalPrice * 100),
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

    // Log payment initiated
    paymentLogger.initiated(session.id, finalPrice, userId);

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

    // Handle refund if payment was made
    let newPaymentStatus = booking.paymentStatus;
    const needsRefund =
      booking.paymentStatus === "authorized" ||
      booking.paymentStatus === "held_in_escrow";

    if (needsRefund && booking.paymentIntentId) {
      try {
        // Check if it's a mock payment (for testing)
        if (booking.paymentIntentId.startsWith("pi_mock_")) {
          console.log(
            `Mock refund processed for booking ${booking.id}, paymentIntent: ${booking.paymentIntentId}`
          );
          newPaymentStatus = "refunded";
        } else {
          // Real Stripe refund
          await stripe.refunds.create({
            payment_intent: booking.paymentIntentId,
          });
          console.log(
            `Stripe refund processed for booking ${booking.id}, paymentIntent: ${booking.paymentIntentId}`
          );
          newPaymentStatus = "refunded";
        }
      } catch (refundError: any) {
        console.error("Refund failed:", refundError);
        // If refund fails, we still cancel the booking but log the error
        // The admin can manually process the refund later
        console.error(
          `MANUAL REFUND NEEDED for booking ${booking.id}: ${refundError.message}`
        );
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "cancelled",
        paymentStatus: newPaymentStatus,
      },
    });

    // Log booking cancelled
    bookingLogger.cancelled(bookingId, userId, "User cancelled");

    // Notify the other party
    const recipientId =
      booking.clientId === userId ? booking.providerId : booking.clientId;
    const cancellerName =
      booking.clientId === userId ? "Il cliente" : "Il fornitore";
    const wasRefunded = newPaymentStatus === "refunded";

    await sendNotification(
      recipientId,
      "Prenotazione Cancellata",
      `${cancellerName} ha cancellato la prenotazione per ${
        booking.service.title
      } del ${new Date(booking.date).toLocaleDateString("it-IT")}${
        wasRefunded ? ". Il pagamento è stato rimborsato." : ""
      }`
    );

    // Send cancellation emails
    const refundMessage = wasRefunded
      ? " Il pagamento è stato rimborsato automaticamente."
      : "";

    sendEmail(
      booking.clientEmail,
      "Prenotazione Cancellata",
      emailTemplates.bookingCancelled(
        booking.clientEmail.split("@")[0],
        booking.serviceTitle,
        booking.clientId === userId
          ? `Hai cancellato questa prenotazione.${refundMessage}`
          : `Cancellata dal fornitore.${refundMessage}`
      )
    );

    sendEmail(
      booking.providerEmail,
      "Prenotazione Cancellata",
      emailTemplates.bookingCancelled(
        booking.providerEmail.split("@")[0],
        booking.serviceTitle,
        booking.providerId === userId
          ? `Hai cancellato questa prenotazione.${refundMessage}`
          : `Cancellata dal cliente.${refundMessage}`
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

    // Log booking completed
    bookingLogger.completed(bookingId);

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
