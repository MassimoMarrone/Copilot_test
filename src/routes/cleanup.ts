import { Router, Request, Response } from "express";
import { cleanupOldPhotoProofs } from "../utils/cleanupService";
import { escrowService } from "../services/escrowService";

const router = Router();

/**
 * Cleanup endpoint - should be called by a cron job
 * Protected by a secret key to prevent unauthorized access
 */
router.post("/cleanup/photo-proofs", async (req: Request, res: Response) => {
  try {
    // Verify secret key (set this in environment variables)
    const { secret } = req.body;
    const expectedSecret = process.env.CLEANUP_SECRET_KEY;

    if (!expectedSecret) {
      console.warn("CLEANUP_SECRET_KEY not set - cleanup endpoint disabled");
      res.status(503).json({ error: "Cleanup service not configured" });
      return;
    }

    if (secret !== expectedSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Default to 7 days, allow override via request
    const daysOld = parseInt(req.body.daysOld) || 7;

    const result = await cleanupOldPhotoProofs(daysOld);

    res.json({
      success: true,
      message: `Cleanup completed`,
      ...result,
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    res.status(500).json({ error: "Cleanup failed: " + error.message });
  }
});

/**
 * Escrow auto-release endpoint - should be called by a cron job (every hour)
 * Releases payments to providers for bookings where the 24h confirmation deadline has passed
 * Protected by a secret key to prevent unauthorized access
 */
router.post("/cleanup/escrow-release", async (req: Request, res: Response) => {
  try {
    // Verify secret key (set this in environment variables)
    const { secret } = req.body;
    const expectedSecret = process.env.CLEANUP_SECRET_KEY;

    if (!expectedSecret) {
      console.warn(
        "CLEANUP_SECRET_KEY not set - escrow release endpoint disabled"
      );
      res.status(503).json({ error: "Escrow release service not configured" });
      return;
    }

    if (secret !== expectedSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await escrowService.processAutoReleases();

    res.json({
      success: true,
      message: `Auto-release completed`,
      ...result,
    });
  } catch (error: any) {
    console.error("Escrow auto-release error:", error);
    res
      .status(500)
      .json({ error: "Escrow auto-release failed: " + error.message });
  }
});

/**
 * Health check for cron monitoring
 */
router.get("/cleanup/status", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    cleanupEnabled: !!process.env.CLEANUP_SECRET_KEY,
    escrowReleaseEnabled: !!process.env.CLEANUP_SECRET_KEY,
  });
});

export default router;
