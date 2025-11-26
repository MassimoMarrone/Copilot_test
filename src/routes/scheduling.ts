import { Router } from "express";
import { schedulingController } from "../controllers/schedulingController";

const router = Router();

// Get estimated duration based on apartment details (public)
router.get("/estimate-duration", schedulingController.getEstimatedDuration);

// Get available time slots for a service on a specific date (public)
router.get(
  "/services/:serviceId/available-slots",
  schedulingController.getAvailableSlots
);

// Get price estimate for a service (public)
router.get(
  "/services/:serviceId/price-estimate",
  schedulingController.getPriceEstimate
);

export default router;
