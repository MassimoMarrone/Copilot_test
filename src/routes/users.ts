import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { upload } from "../config/upload";
import { userController } from "../controllers/userController";

const router = Router();

// Update profile
router.put(
  "/me/profile",
  authenticate,
  upload.single("avatar"),
  [
    body("displayName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Display name must be between 2 and 50 characters"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Bio must be less than 500 characters"),
  ],
  validate,
  userController.updateProfile
);

// Get public provider profile
router.get(
  "/providers/:id",
  userController.getProviderProfile
);

// Delete own account
router.delete(
  "/me",
  authenticate,
  userController.deleteAccount
);

export default router;
