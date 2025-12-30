import express from "express";
import {
  providerOnboarding,
  getProviderOnboardingStatus,
  uploadOnboardingDocument,
  uploadOnboardingSelfie,
} from "../controllers/onboardingController";
import { authenticate } from "../middleware/auth";
import { uploadAvatar, uploadDocument } from "../config/cloudinary";

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

// Endpoint per upload selfie onboarding
router.post(
  "/upload-selfie",
  authenticate,
  uploadAvatar.single("selfie"),
  uploadOnboardingSelfie
);

export default router;
