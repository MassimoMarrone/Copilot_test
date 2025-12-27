import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { stripe } from "../config/stripe";
import { paymentLogger } from "../utils/logger";

// Time to wait before capturing payment (in hours)
const CAPTURE_DELAY_HOURS = 48;

/**
 * Cron job per la cattura automatica dei pagamenti autorizzati
 * Esegue ogni ora e cattura i pagamenti per i booking dove:
 * - paymentStatus = "authorized"
 * - paymentAuthorizedAt è passata (> 48h dalla prenotazione)
 * - status !== "cancelled"
 */
export function startPaymentCaptureCronJob() {
  // Esegue ogni ora al minuto 30 (es: 10:30, 11:30, 12:30...)
  // Offset rispetto all'escrow cron per distribuire il carico
  cron.schedule("30 * * * *", async () => {
    console.log("[CRON] Starting payment capture check...");

    try {
      const result = await processPaymentCaptures();
      const totalProcessed = result.captured + result.failed;

      if (totalProcessed > 0) {
        console.log(
          `[CRON] Captured ${result.captured} payments, ${result.failed} failed`
        );
      } else {
        console.log("[CRON] No payments to capture");
      }
    } catch (error) {
      console.error("[CRON] Payment capture error:", error);
    }
  });

  console.log(
    `✅ Payment capture cron job scheduled (runs every hour, captures after ${CAPTURE_DELAY_HOURS}h)`
  );
}

/**
 * Process all bookings that need payment capture
 */
async function processPaymentCaptures(): Promise<{
  captured: number;
  failed: number;
}> {
  // Calculate the cutoff time (48 hours ago)
  const captureThreshold = new Date();
  captureThreshold.setHours(captureThreshold.getHours() - CAPTURE_DELAY_HOURS);

  // Find all bookings with authorized payments older than 48h
  const bookingsToCapture = await prisma.booking.findMany({
    where: {
      paymentStatus: "authorized",
      status: { not: "cancelled" },
      paymentAuthorizedAt: {
        lte: captureThreshold,
      },
      paymentIntentId: { not: null },
    },
  });

  let captured = 0;
  let failed = 0;

  for (const booking of bookingsToCapture) {
    try {
      // Skip mock payments in test mode
      if (booking.paymentIntentId?.startsWith("pi_mock_")) {
        console.log(
          `[CRON] Mock capture for booking ${booking.id}, paymentIntent: ${booking.paymentIntentId}`
        );
        await prisma.booking.update({
          where: { id: booking.id },
          data: { paymentStatus: "held_in_escrow" },
        });
        captured++;
        continue;
      }

      // Capture the payment with Stripe
      await stripe.paymentIntents.capture(booking.paymentIntentId!);

      // Update booking status
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: "held_in_escrow" },
      });

      paymentLogger.captured(booking.paymentIntentId!, booking.amount, "48h_auto_capture");
      console.log(
        `[CRON] Captured payment for booking ${booking.id}, amount: €${booking.amount}`
      );
      captured++;
    } catch (error: any) {
      console.error(
        `[CRON] Failed to capture payment for booking ${booking.id}:`,
        error.message
      );
      failed++;
    }
  }

  return { captured, failed };
}
