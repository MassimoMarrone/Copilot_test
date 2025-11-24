import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { adminController } from "../controllers/adminController";

const router = Router();

// Get all users
router.get("/users", authenticate, requireAdmin, adminController.getAllUsers);

// Block user
router.post(
  "/users/:id/block",
  authenticate,
  requireAdmin,
  adminController.blockUser
);

// Unblock user
router.post(
  "/users/:id/unblock",
  authenticate,
  requireAdmin,
  adminController.unblockUser
);

// Delete user
router.delete(
  "/users/:id",
  authenticate,
  requireAdmin,
  adminController.deleteUser
);

// Get all services
router.get(
  "/services",
  authenticate,
  requireAdmin,
  adminController.getAllServices
);

// Delete service
router.delete(
  "/services/:id",
  authenticate,
  requireAdmin,
  adminController.deleteService
);

// Get all bookings
router.get(
  "/bookings",
  authenticate,
  requireAdmin,
  adminController.getAllBookings
);

// Cancel booking
router.post(
  "/bookings/:id/cancel",
  authenticate,
  requireAdmin,
  adminController.cancelBooking
);

// Delete booking
router.delete(
  "/bookings/:id",
  authenticate,
  requireAdmin,
  adminController.deleteBooking
);

// Get stats
router.get("/stats", authenticate, requireAdmin, adminController.getStats);

export default router;
