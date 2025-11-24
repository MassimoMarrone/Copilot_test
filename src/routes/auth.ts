import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { authController } from "../controllers/authController";

const router = Router();

// Register
router.post(
  "/register",
  authLimiter,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  validate,
  authController.register
);

// Login
router.post(
  "/login",
  authLimiter,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  authController.login
);

// Google Auth
router.post("/auth/google", authLimiter, authController.googleAuth);

// Logout
router.post("/logout", authController.logout);

// Get current user
router.get("/me", authenticate, authController.getMe);

// Become a provider
router.post("/become-provider", authenticate, authController.becomeProvider);

export default router;
