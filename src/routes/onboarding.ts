import express from "express";
import {
  providerOnboarding,
  getProviderOnboardingStatus,
  uploadOnboardingDocument,
} from "../controllers/onboardingController";
import { authenticate } from "../middleware/auth";
import { uploadDocument } from "../config/cloudinary";

const router = express.Router();

// Endpoint per invio dati onboarding provider
router.post("/", authenticate, providerOnboarding);

// Endpoint per recuperare stato onboarding provider
router.get("/status", authenticate, getProviderOnboardingStatus);

// Endpoint per upload documenti (fronte/retro)
router.post(
  "/upload-document",
  authenticate,
  uploadDocument.single("document"),
  uploadOnboardingDocument
);

export default router;
