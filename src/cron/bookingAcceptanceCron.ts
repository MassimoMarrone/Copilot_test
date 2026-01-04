import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { bookingService } from "../services/bookingService";

// Provider must accept within 24h
const ACCEPTANCE_WINDOW_HOURS = 24;

/**
 * Cron job: cancella automaticamente le prenotazioni non accettate entro 24h
 * e rimborsa automaticamente il cliente.
 */
export function startBookingAcceptanceCronJob() {
  // Ogni 15 minuti (distribuisce meglio il carico)
  cron.schedule("*/15 * * * *", async () => {
    console.log("[CRON] Starting booking acceptance timeout check...");

    try {
      const result = await processAcceptanceTimeouts();
      if (result.cancelled > 0) {
        console.log(
          `[CRON] Acceptance timeouts processed: cancelled ${result.cancelled}, failed ${result.failed}`
        );
      } else {
        console.log("[CRON] No acceptance timeouts");
      }
    } catch (error) {
      console.error("[CRON] Acceptance timeout cron error:", error);
    }
  });

  console.log(
    `✅ Booking acceptance cron job scheduled (runs every 15m, cancels after ${ACCEPTANCE_WINDOW_HOURS}h)`
  );
}

async function processAcceptanceTimeouts(): Promise<{
  cancelled: number;
  failed: number;
}> {
  const now = new Date();
  const legacyThreshold = new Date();
  legacyThreshold.setHours(
    legacyThreshold.getHours() - ACCEPTANCE_WINDOW_HOURS
  );

  // Cancel bookings still pending and unaccepted
  const candidates = await prisma.booking.findMany({
    where: {
      status: "pending",
      acceptedAt: null,
      OR: [
        { acceptanceDeadline: { lte: now } },
        { acceptanceDeadline: null, createdAt: { lte: legacyThreshold } },
      ],
      // We only care about bookings that actually have a payment intent
      paymentIntentId: { not: null },
    },
    select: { id: true },
  });

  let cancelled = 0;
  let failed = 0;

  for (const b of candidates) {
    try {
      await bookingService.cancelBookingForAcceptanceTimeout(b.id);
      cancelled++;
    } catch (error: any) {
      console.error(
        `[CRON] Failed to auto-cancel booking ${b.id} for acceptance timeout:`,
        error?.message || error
      );
      failed++;
    }
  }

  return { cancelled, failed };
}
