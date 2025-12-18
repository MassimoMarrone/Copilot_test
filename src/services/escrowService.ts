import { stripe } from "../config/stripe";
import { prisma } from "../lib/prisma";
import { sendNotification } from "../utils/notification";
import { sendEmail, emailTemplates } from "../emailService";
import { paymentLogger } from "../utils/logger";

// Platform fee percentage
const PLATFORM_FEE_PERCENT = parseInt(
  process.env.PLATFORM_FEE_PERCENT || "15",
  10
);

export const escrowService = {
  /**
   * Transfer funds to provider after service is confirmed
   * Called when: client confirms OR 24h auto-release
   */
  async releasePaymentToProvider(
    bookingId: string,
    reason: "client_confirmed" | "auto_released"
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: true,
        client: true,
        service: true,
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.paymentStatus !== "held_in_escrow") {
      throw new Error(
        `Cannot release payment - current status: ${booking.paymentStatus}`
      );
    }

    if (!booking.provider.stripeAccountId) {
      throw new Error("Provider has no Stripe account configured");
    }

    // Calculate amounts
    const totalAmountCents = Math.round(booking.amount * 100);
    const platformFeeCents = Math.round(
      totalAmountCents * (PLATFORM_FEE_PERCENT / 100)
    );
    const providerAmountCents = totalAmountCents - platformFeeCents;

    try {
      // For mock payments (testing)
      if (booking.paymentIntentId?.startsWith("pi_mock_")) {
        console.log(
          `Mock transfer to provider for booking ${bookingId}: €${(
            providerAmountCents / 100
          ).toFixed(2)}`
        );
      } else {
        // Create transfer to provider's connected account
        await stripe.transfers.create({
          amount: providerAmountCents,
          currency: "eur",
          destination: booking.provider.stripeAccountId,
          transfer_group: `booking_${bookingId}`,
          metadata: {
            bookingId: bookingId,
            reason: reason,
            platformFee: platformFeeCents.toString(),
          },
        });
      }

      // Update booking status
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "completed",
          paymentStatus: "released",
          completedAt: new Date(),
          clientConfirmedAt: reason === "client_confirmed" ? new Date() : null,
          awaitingClientConfirmation: false,
        },
      });

      // Log payment released
      paymentLogger.captured(
        booking.paymentIntentId || bookingId,
        booking.amount,
        reason
      );

      // Notify provider
      await sendNotification(
        booking.providerId,
        "Pagamento Ricevuto! 💰",
        `Hai ricevuto €${(providerAmountCents / 100).toFixed(2)} per "${
          booking.serviceTitle
        }"`,
        "success"
      );

      // Send email to provider
      await sendEmail(
        booking.providerEmail,
        "Pagamento Ricevuto",
        emailTemplates.paymentReleased(
          booking.provider.displayName || booking.providerEmail.split("@")[0],
          booking.serviceTitle,
          providerAmountCents / 100,
          reason
        )
      );

      return updatedBooking;
    } catch (error: any) {
      console.error(
        `Failed to release payment for booking ${bookingId}:`,
        error
      );
      throw new Error(`Payment release failed: ${error.message}`);
    }
  },

  /**
   * Refund payment to client (for disputes resolved in client's favor)
   */
  async refundPaymentToClient(bookingId: string, reason: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, service: true },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.paymentStatus !== "held_in_escrow") {
      throw new Error(
        `Cannot refund - current status: ${booking.paymentStatus}`
      );
    }

    try {
      // For mock payments
      if (booking.paymentIntentId?.startsWith("pi_mock_")) {
        console.log(`Mock refund for booking ${bookingId}`);
      } else if (booking.paymentIntentId) {
        await stripe.refunds.create({
          payment_intent: booking.paymentIntentId,
          reason: "requested_by_customer",
        });
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "cancelled",
          paymentStatus: "refunded",
          disputeStatus: "resolved_refund",
          disputeResolvedAt: new Date(),
          disputeNotes: reason,
          awaitingClientConfirmation: false,
        },
      });

      // Notify client
      await sendNotification(
        booking.clientId,
        "Rimborso Effettuato",
        `Hai ricevuto un rimborso di €${booking.amount.toFixed(2)} per "${
          booking.serviceTitle
        }"`,
        "success"
      );

      return updatedBooking;
    } catch (error: any) {
      console.error(`Failed to refund booking ${bookingId}:`, error);
      throw new Error(`Refund failed: ${error.message}`);
    }
  },

  /**
   * Process all bookings that have passed 24h confirmation deadline
   * Called by cron job
   */
  async processAutoReleases() {
    const now = new Date();

    const expiredBookings = await prisma.booking.findMany({
      where: {
        awaitingClientConfirmation: true,
        confirmationDeadline: {
          lte: now,
        },
        disputeStatus: null, // Not in dispute
        paymentStatus: "held_in_escrow",
      },
    });

    console.log(
      `Processing ${expiredBookings.length} bookings for auto-release`
    );

    const results = {
      released: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const booking of expiredBookings) {
      try {
        await this.releasePaymentToProvider(booking.id, "auto_released");
        results.released++;
        console.log(`Auto-released payment for booking ${booking.id}`);
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${booking.id}: ${error.message}`);
        console.error(`Failed to auto-release booking ${booking.id}:`, error);
      }
    }

    return results;
  },

  /**
   * Get platform fee percentage
   */
  getPlatformFeePercent(): number {
    return PLATFORM_FEE_PERCENT;
  },
};
