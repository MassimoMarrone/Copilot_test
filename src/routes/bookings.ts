import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { bookingController } from "../controllers/bookingController";

const router = Router();

// Create booking and checkout session (clients only)
router.post(
  "/bookings",
  authenticate,
  [
    body("serviceId").notEmpty().withMessage("Service ID is required"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("clientPhone")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Phone number must be less than 50 characters"),
    body("preferredTime")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Preferred time must be less than 50 characters"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Notes must be less than 1000 characters"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
  ],
  validate,
  bookingController.createBooking
);

// Get client's bookings
router.get(
  "/my-bookings",
  authenticate,
  bookingController.getMyBookings
);

// Get provider's bookings
router.get(
  "/provider-bookings",
  authenticate,
  bookingController.getProviderBookings
);

// Cancel booking
router.post(
  "/bookings/:id/cancel",
  authenticate,
  bookingController.cancelBooking
);

// Complete booking (Provider only)
router.post(
  "/bookings/:id/complete",
  authenticate,
  bookingController.completeBooking
);

export default router;
