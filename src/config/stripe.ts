import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

export const stripe = new Stripe(
  (process.env.STRIPE_SECRET_KEY || "sk_test_dummy").trim(),
  {
    apiVersion: "2025-11-17.clover" as any,
  }
);

export const mockStripeSessions: Record<string, any> = {};
