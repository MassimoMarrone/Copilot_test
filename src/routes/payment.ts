import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { paymentController } from "../controllers/paymentController";

const router = Router();

// Verify payment and create booking
router.get(
  "/verify-payment",
  authenticate,
  paymentController.verifyPayment
);

// Legacy Stripe Payment Route
router.post(
  "/create-checkout-session",
  authenticate,
  paymentController.createCheckoutSession
);

export default router;
