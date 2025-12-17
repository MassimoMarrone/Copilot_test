import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { uploadService } from "../config/cloudinary";
import { servicesController } from "../controllers/servicesController";
import multer from "multer";

const router = Router();

// Get all services (for clients to browse)
router.get("/services", servicesController.getAllServices);

// Create service (providers only)
router.post(
  "/services",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    uploadService.single("image")(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res
            .status(400)
            .json({ error: "File size too large. Maximum size is 5MB." });
          return;
        }
        res.status(400).json({ error: "File upload error: " + err.message });
        return;
      } else if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  [
    body("title")
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Title must be between 3 and 200 characters"),
    body("description")
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be between 10 and 2000 characters"),
    body("category")
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Category must be between 3 and 50 characters"),
    body("price")
      .isFloat({ min: 0.5 })
      .withMessage("Price must be at least €0.50"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
    body("latitude")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Latitude must be between -90 and 90"),
    body("longitude")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Longitude must be between -180 and 180"),
    body("productsUsed")
      .optional()
      .custom((value) => {
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) throw new Error("Must be an array");
            return true;
          } catch {
            throw new Error("Products used must be a valid JSON array string");
          }
        }
        return true;
      }),
  ],
  validate,
  servicesController.createService
);

// Update a service
router.put(
  "/services/:id",
  authenticate,
  uploadService.single("image"),
  [
    body("title")
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Title must be between 3 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be between 10 and 2000 characters"),
    body("category")
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Category must be between 3 and 50 characters"),
    body("price")
      .optional()
      .isFloat({ min: 0.5 })
      .withMessage("Price must be at least €0.50"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
    body("latitude")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Latitude must be between -90 and 90"),
    body("longitude")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Longitude must be between -180 and 180"),
    body("productsUsed")
      .optional()
      .custom((value) => {
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) throw new Error("Must be an array");
            return true;
          } catch {
            throw new Error("Products used must be a valid JSON array string");
          }
        }
        return true;
      }),
    body("availability")
      .optional()
      .custom((value) => {
        if (typeof value === "string") {
          try {
            JSON.parse(value);
            return true;
          } catch {
            throw new Error("Availability must be a valid JSON string");
          }
        }
        return true; // If it's already an object (e.g. from JSON body)
      }),
  ],
  validate,
  servicesController.updateService
);

// Get provider's services
router.get("/my-services", authenticate, servicesController.getMyServices);

// Delete a service
router.delete("/services/:id", authenticate, servicesController.deleteService);

// Get booked dates for a specific service
router.get(
  "/services/:serviceId/booked-dates",
  authenticate,
  servicesController.getBookedDates
);

export default router;
