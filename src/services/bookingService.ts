import { prisma } from "../lib/prisma";
import { stripe, mockStripeSessions } from "../config/stripe";
import { sendNotification } from "../utils/notification";
import { sendEmail, emailTemplates } from "../emailService";
import { schedulingService } from "./schedulingService";
import { bookingLogger, paymentLogger } from "../utils/logger";
import { stripeConnectService } from "./stripeConnectService";

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

    // Verify provider has Stripe Connect account set up
    const provider = service.provider;
    if (!provider.stripeAccountId) {
      throw new Error(
        "Il provider non ha ancora configurato i pagamenti. Contattalo per completare la configurazione."
      );
    }

    // Verify provider can receive payments (account is onboarded)
    const canReceive = await stripeConnectService.canReceivePayments(
      provider.id
    );
    if (!canReceive) {
      throw new Error(
        "Il provider non può ancora ricevere pagamenti. L'onboarding Stripe non è completo."
      );
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

    // Calculate platform fee (application fee)
    const amountInCents = Math.round(finalPrice * 100);
    const platformFeeInCents = Math.round(
      amountInCents * (stripeConnectService.getPlatformFeePercent() / 100)
    );

    if (
      process.env.STRIPE_SECRET_KEY === "sk_test_dummy" ||
      !process.env.STRIPE_SECRET_KEY
    ) {
      console.log("Using mock Stripe session for testing");
      const mockSessionId = "cs_test_" + Date.now();
      const mockSession = {
        id: mockSessionId,
        status: "complete",
        payment_status: "paid",
        payment_intent: "pi_mock_" + Date.now(),
        metadata: safeMetadata,
      };
      mockStripeSessions[mockSessionId] = mockSession;

      session = {
        id: mockSessionId,
        url: `${protocol}://${host}/client-dashboard?payment=success&session_id=${mockSessionId}`,
      };
    } else {
      // Escrow: Payment goes to PLATFORM first, NOT directly to provider
      // Transfer to provider happens only after client confirms service completion
      // This ensures we never have to "take back" money from providers
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
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        // NO transfer_data - money stays on platform until service is confirmed
        // We store provider's stripeAccountId in metadata for later transfer
        payment_intent_data: {
          metadata: {
            providerStripeAccountId: provider.stripeAccountId!,
            platformFeeAmount: platformFeeInCents.toString(),
          },
        },
        success_url: `${protocol}://${host}/client-dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${protocol}://${host}/client-dashboard?payment=cancel`,
        metadata: {
          ...safeMetadata,
          providerStripeAccountId: provider.stripeAccountId!,
          platformFeeAmount: platformFeeInCents.toString(),
        },
      });
    }

    // Log payment initiated
    paymentLogger.initiated(session.id, finalPrice, userId);

    return { id: session.id, url: session.url };
  },

  async getMyBookings(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const myBookings = await prisma.booking.findMany({
      where: { clientId: userId },
      include: {
        review: true,
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    });

    const enrichedBookings = myBookings.map((booking: any) => {
      const hasReview = !!booking.review;
      const { review, ...bookingData } = booking;
      return { ...bookingData, hasReview };
    });

    // Non inviare URL foto se non sono necessari (riduce payload + esposizione URL)
    // Le foto vengono mostrate al cliente solo durante `awaiting_confirmation`.
    const sanitizedBookings = enrichedBookings.map((booking: any) => {
      if (booking.status !== "awaiting_confirmation") {
        const { photoProof, photoProofs, ...rest } = booking;
        return rest;
      }
      return booking;
    });

    return sanitizedBookings;
  },

  async getProviderBookings(providerId: string) {
    const providerBookings = await prisma.booking.findMany({
      where: { providerId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        serviceId: true,
        clientId: true,
        providerId: true,
        serviceTitle: true,
        date: true,
        amount: true,
        providerEmail: true,
        clientEmail: true,
        status: true,
        paymentStatus: true,
        photoProof: true,
        clientPhone: true,
        preferredTime: true,
        notes: true,
        address: true,
        createdAt: true,
        squareMetersRange: true,
        windowsCount: true,
        estimatedDuration: true,
        startTime: true,
        endTime: true,
      },
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

    // Check if refund is needed - now includes "paid" status for Stripe Connect
    const needsRefund =
      booking.paymentStatus === "paid" ||
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
          // With Stripe Connect, this refunds from the platform and reverses the transfer to the provider
          await stripe.refunds.create({
            payment_intent: booking.paymentIntentId,
            // reverse_transfer: true automatically reverses the transfer to connected account
            reverse_transfer: true,
            // refund_application_fee: true returns the platform fee as well
            refund_application_fee: true,
          });
          console.log(
            `Stripe Connect refund processed for booking ${booking.id}, paymentIntent: ${booking.paymentIntentId}`
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

  /**
   * Provider marks service as completed by uploading proof photos
   * This puts the booking in "awaiting_confirmation" state
   * Client has 24h to confirm or dispute
   */
  async completeBooking(
    bookingId: string,
    providerId: string,
    photoProofUrls: string[] // Now accepts array of 1-10 photos
  ) {
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

    // Validate photo count (1-10 photos required)
    if (!photoProofUrls || photoProofUrls.length === 0) {
      throw new Error(
        "Devi caricare almeno 1 foto come prova del servizio completato"
      );
    }
    if (photoProofUrls.length > 10) {
      throw new Error("Puoi caricare massimo 10 foto");
    }

    // Verify payment is in escrow
    if (booking.paymentStatus !== "held_in_escrow") {
      throw new Error(
        "Il pagamento deve essere in escrow per completare il servizio"
      );
    }

    // Already awaiting confirmation?
    if (booking.awaitingClientConfirmation) {
      throw new Error("Il servizio è già in attesa di conferma dal cliente");
    }

    // Calculate 24h deadline
    const confirmationDeadline = new Date();
    confirmationDeadline.setHours(confirmationDeadline.getHours() + 24);

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "awaiting_confirmation",
        photoProof: photoProofUrls[0], // Legacy field - first photo
        photoProofs: JSON.stringify(photoProofUrls), // All photos as JSON array
        awaitingClientConfirmation: true,
        confirmationDeadline: confirmationDeadline,
      },
    });

    // Log booking awaiting confirmation
    bookingLogger.completed(bookingId);

    // Notify client to confirm or dispute
    await sendNotification(
      booking.clientId,
      "Servizio Completato - Conferma Richiesta ✅",
      `Il provider ha completato "${booking.service.title}". Hai 24 ore per confermare o aprire una controversia.`,
      "info"
    );

    // Send email to client
    await sendEmail(
      booking.clientEmail,
      "Conferma il Servizio Completato",
      emailTemplates.awaitingConfirmation(
        booking.clientEmail.split("@")[0],
        booking.serviceTitle,
        confirmationDeadline,
        photoProofUrls.length
      )
    );

    return updatedBooking;
  },

  /**
   * Client confirms service was completed satisfactorily
   * This releases the payment to the provider
   */
  async confirmServiceCompletion(bookingId: string, clientId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, provider: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.clientId !== clientId) {
      throw new Error("Only the client can confirm service completion");
    }

    if (!booking.awaitingClientConfirmation) {
      throw new Error("This booking is not awaiting confirmation");
    }

    if (booking.disputeStatus) {
      throw new Error("Cannot confirm a disputed booking");
    }

    // Import escrowService dynamically to avoid circular dependency
    const { escrowService } = await import("./escrowService");

    // Release payment to provider
    const updatedBooking = await escrowService.releasePaymentToProvider(
      bookingId,
      "client_confirmed"
    );

    // Notify provider
    await sendNotification(
      booking.providerId,
      "Servizio Confermato! 🎉",
      `Il cliente ha confermato il completamento di "${booking.serviceTitle}". Pagamento in arrivo!`,
      "success"
    );

    return updatedBooking;
  },

  /**
   * Client opens a dispute for unsatisfactory service
   * This blocks the payment and notifies admin
   */
  async openDispute(bookingId: string, clientId: string, reason: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, provider: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.clientId !== clientId) {
      throw new Error("Only the client can open a dispute");
    }

    if (!booking.awaitingClientConfirmation) {
      throw new Error("This booking is not awaiting confirmation");
    }

    if (booking.disputeStatus) {
      throw new Error("A dispute has already been opened for this booking");
    }

    if (!reason || reason.trim().length < 10) {
      throw new Error("Devi fornire una motivazione di almeno 10 caratteri");
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "disputed",
        disputeStatus: "pending",
        disputeReason: reason,
        disputeOpenedAt: new Date(),
        awaitingClientConfirmation: false, // No longer auto-releases
      },
    });

    // Notify provider
    await sendNotification(
      booking.providerId,
      "Controversia Aperta ⚠️",
      `Il cliente ha aperto una controversia per "${booking.serviceTitle}". Un amministratore verificherà la situazione.`,
      "warning"
    );

    // Notify admins (you might want to create a specific admin notification system)
    console.log(`DISPUTE OPENED: Booking ${bookingId} - Reason: ${reason}`);

    // Send email to support (you can configure this email)
    await sendEmail(
      process.env.SUPPORT_EMAIL || "support@domy.com",
      `Nuova Controversia - Booking ${bookingId}`,
      `
        <h2>Nuova Controversia</h2>
        <p><strong>Booking ID:</strong> ${bookingId}</p>
        <p><strong>Servizio:</strong> ${booking.serviceTitle}</p>
        <p><strong>Cliente:</strong> ${booking.clientEmail}</p>
        <p><strong>Provider:</strong> ${booking.providerEmail}</p>
        <p><strong>Importo:</strong> €${booking.amount.toFixed(2)}</p>
        <p><strong>Motivo:</strong> ${reason}</p>
        <p>Accedi al pannello admin per gestire la controversia.</p>
      `
    );

    return updatedBooking;
  },
};
