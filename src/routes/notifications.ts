import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { notificationController } from "../controllers/notificationController";

const router = Router();

// Get user notifications
router.get(
  "/",
  authenticate,
  notificationController.getNotifications
);

// Mark notification as read
router.put(
  "/:id/read",
  authenticate,
  notificationController.markAsRead
);

// Mark all notifications as read
router.put(
  "/read-all",
  authenticate,
  notificationController.markAllAsRead
);

export default router;
