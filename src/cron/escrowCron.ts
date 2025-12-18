import cron from "node-cron";
import { escrowService } from "../services/escrowService";

/**
 * Cron job per il rilascio automatico dei pagamenti escrow
 * Esegue ogni ora e rilascia i pagamenti per i booking dove:
 * - awaitingClientConfirmation = true
 * - confirmationDeadline è passata (> 24h dalla completion)
 */
export function startEscrowCronJobs() {
  // Esegue ogni ora al minuto 0 (es: 10:00, 11:00, 12:00...)
  // Formato cron: minuto ora giorno-mese mese giorno-settimana
  cron.schedule("0 * * * *", async () => {
    console.log("[CRON] Starting escrow auto-release check...");

    try {
      const result = await escrowService.processAutoReleases();
      const totalProcessed = result.released + result.failed;

      if (totalProcessed > 0) {
        console.log(
          `[CRON] Auto-released ${result.released} payments, ${result.failed} failed`
        );
      } else {
        console.log("[CRON] No payments to auto-release");
      }
    } catch (error) {
      console.error("[CRON] Escrow auto-release error:", error);
    }
  });

  console.log("✅ Escrow cron job scheduled (runs every hour)");
}
