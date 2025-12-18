import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { stripeConnectService } from "../services/stripeConnectService";
import { stripe } from "../config/stripe";

const router = Router();

/**
 * Start Stripe Connect onboarding for a provider
 * POST /api/stripe-connect/onboard
 */
router.post("/onboard", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Build return URLs
    const protocol = req.protocol;
    const host = req.get("host") || "";
    const baseUrl = `${protocol}://${host}`;

    const returnUrl = `${baseUrl}/provider-dashboard?stripe_onboarding=complete`;
    const refreshUrl = `${baseUrl}/provider-dashboard?stripe_onboarding=refresh`;

    const result = await stripeConnectService.createOnboardingLink(
      userId,
      returnUrl,
      refreshUrl
    );

    res.json({
      success: true,
      onboardingUrl: result.url,
      accountId: result.accountId,
    });
  } catch (error: any) {
    console.error("Stripe Connect onboarding error:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to start onboarding" });
  }
});

/**
 * Get provider's Stripe account status
 * GET /api/stripe-connect/status
 */
router.get("/status", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const status = await stripeConnectService.getAccountStatus(userId);
    res.json(status);
  } catch (error: any) {
    console.error("Stripe Connect status error:", error);
    res.status(400).json({ error: error.message || "Failed to get status" });
  }
});

/**
 * Get link to Stripe Express dashboard
 * GET /api/stripe-connect/dashboard-link
 */
router.get(
  "/dashboard-link",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await stripeConnectService.createDashboardLink(userId);
      res.json({ url: result.url });
    } catch (error: any) {
      console.error("Stripe dashboard link error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to get dashboard link" });
    }
  }
);

/**
 * Stripe webhook handler for Connect events
 * POST /api/stripe-connect/webhook
 */
router.post(
  "/webhook",
  // Use raw body for webhook signature verification
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn("STRIPE_WEBHOOK_SECRET not configured");
      res.status(400).json({ error: "Webhook secret not configured" });
      return;
    }

    let event;

    try {
      // req.body should be raw buffer for webhook verification
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        webhookSecret
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    switch (event.type) {
      case "account.updated":
        await stripeConnectService.handleAccountUpdated(event.data.object);
        break;

      case "account.application.deauthorized":
        console.log("Provider disconnected Stripe account:", event.data.object);
        // TODO: Handle provider disconnection
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  }
);

export default router;
