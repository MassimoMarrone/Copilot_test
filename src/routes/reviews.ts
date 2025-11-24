import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { reviewController } from "../controllers/reviewController";

const router = Router();

// Create a review
router.post(
  "/reviews",
  authenticate,
  [
    body("serviceId").isUUID().withMessage("Invalid service ID"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("comment")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("Comment too long"),
  ],
  validate,
  reviewController.createReview
);

// Get reviews for a service
router.get("/reviews/service/:serviceId", reviewController.getServiceReviews);

// Get provider's reviews
router.get("/my-reviews", authenticate, reviewController.getMyReviews);

export default router;
