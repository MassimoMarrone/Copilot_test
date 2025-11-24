import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { chatController } from "../controllers/chatController";

const router = Router();

// Send a message in a booking chat
router.post(
  "/messages",
  authenticate,
  [
    body("bookingId").isUUID().withMessage("Invalid booking ID"),
    body("message")
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Message must be between 1 and 1000 characters"),
  ],
  validate,
  chatController.sendMessage
);

// Get all messages for a booking
router.get("/messages", authenticate, chatController.getMessages);

// Get unread messages count
router.get(
  "/unread-messages-count",
  authenticate,
  chatController.getUnreadCount
);

// Mark messages as read for a booking
router.put("/messages/read", authenticate, chatController.markAsRead);

// Get all conversations for the current user
router.get("/my-conversations", authenticate, chatController.getConversations);

export default router;
