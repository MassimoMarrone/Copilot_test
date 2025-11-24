import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { upload } from "../config/upload";

const router = Router();
const prisma = new PrismaClient();

// Get all services (for clients to browse)
router.get("/services", async (_req: Request, res: Response): Promise<void> => {
  try {
    // Filter out services from blocked providers
    const services = await prisma.service.findMany({
      where: {
        provider: {
          isBlocked: false,
        },
      },
      include: {
        reviews: true,
      },
    });

    const activeServices = services.map((service: any) => {
      const reviewCount = service.reviews.length;
      const averageRating =
        reviewCount > 0
          ? service.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) /
            reviewCount
          : 0;

      // Parse JSON fields
      let parsedProducts = [];
      if (service.productsUsed) {
        try {
          parsedProducts =
            typeof service.productsUsed === "string"
              ? JSON.parse(service.productsUsed)
              : service.productsUsed;
        } catch (e) {
          console.error("Error parsing productsUsed:", e);
          parsedProducts = [];
        }
      }

      let parsedAvailability = null;
      if (service.availability) {
        try {
          parsedAvailability =
            typeof service.availability === "string"
              ? JSON.parse(service.availability)
              : service.availability;
        } catch (e) {
          console.error("Error parsing availability:", e);
        }
      }

      return {
        ...service,
        productsUsed: parsedProducts,
        availability: parsedAvailability,
        reviewCount,
        averageRating: parseFloat(averageRating.toFixed(1)),
      };
    });
    res.json(activeServices);
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// Create service (providers only)
router.post(
  "/services",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err) => {
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
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can create services" });
      return;
    }

    const {
      title,
      description,
      category,
      price,
      address,
      latitude,
      longitude,
      productsUsed,
    } = req.body;

    let imageUrl = undefined;
    if (req.file) {
      imageUrl = "/uploads/" + req.file.filename;
    } else {
      // Default image logic
      const lowerTitle = title.toLowerCase();
      const lowerDesc = description.toLowerCase();
      if (
        lowerTitle.includes("pulizia") ||
        lowerDesc.includes("pulizia") ||
        lowerTitle.includes("cleaning") ||
        lowerDesc.includes("cleaning")
      ) {
        imageUrl = "/assets/cleaning.jpg";
      } else {
        // Default fallback image
        imageUrl = "/assets/cleaning.jpg";
      }
    }

    const defaultDaySchedule = {
      enabled: true,
      slots: [{ start: "09:00", end: "17:00" }],
    };

    const defaultWeeklySchedule = {
      monday: { ...defaultDaySchedule },
      tuesday: { ...defaultDaySchedule },
      wednesday: { ...defaultDaySchedule },
      thursday: { ...defaultDaySchedule },
      friday: { ...defaultDaySchedule },
      saturday: { ...defaultDaySchedule, enabled: false },
      sunday: { ...defaultDaySchedule, enabled: false },
    };

    const service = await prisma.service.create({
      data: {
        providerId: req.user!.id,
        providerEmail: req.user!.email,
        title,
        description,
        category: category || "Altro",
        price: parseFloat(price),
        productsUsed: productsUsed
          ? typeof productsUsed === "string"
            ? productsUsed
            : JSON.stringify(productsUsed)
          : JSON.stringify([]),
        address: address || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        imageUrl,
        createdAt: new Date(),
        availability: JSON.stringify({
          weekly: defaultWeeklySchedule,
          blockedDates: [],
        }),
      },
    });

    res.json(service);
  }
);

// Update a service
router.put(
  "/services/:id",
  authenticate,
  upload.single("image"),
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
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can update services" });
      return;
    }

    const existingService = await prisma.service.findFirst({
      where: { id, providerId: req.user!.id },
    });

    if (!existingService) {
      res.status(404).json({ error: "Service not found or unauthorized" });
      return;
    }

    const {
      title,
      description,
      category,
      price,
      address,
      latitude,
      longitude,
      availability,
      productsUsed,
    } = req.body;

    const updateData: any = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (price) updateData.price = parseFloat(price);
    if (address !== undefined) updateData.address = address;
    if (latitude) updateData.latitude = parseFloat(latitude);
    if (longitude) updateData.longitude = parseFloat(longitude);
    if (productsUsed) {
      updateData.productsUsed =
        typeof productsUsed === "string"
          ? productsUsed
          : JSON.stringify(productsUsed);
    }

    if (req.file) {
      updateData.imageUrl = "/uploads/" + req.file.filename;
    }

    if (availability) {
      updateData.availability =
        typeof availability === "string"
          ? availability
          : JSON.stringify(availability);
    }

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
    });

    res.json(service);
  }
);

// Get provider's services
router.get(
  "/my-services",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    // Note: The original route was /api/my-services, so here it is /my-services relative to /api/services?
    // No, in server.ts it was /api/my-services.
    // If I mount this router at /api/services, then this becomes /api/services/my-services.
    // This changes the API path!
    // I should be careful.
    // If I want to keep /api/my-services, I should mount it separately or handle it in server.ts or change the frontend.
    // Changing frontend is risky.
    // I can mount this router at /api/services and also have a separate route for /api/my-services?
    // Or I can put /my-services inside this router and mount it at /api/services, so the path becomes /api/services/my-services.
    // I should check if I can change the path.
    // Let's assume I will mount this at /api/services.
    // Then /api/my-services becomes /api/services/my-services.
    // I should probably keep the original paths if possible.
    // But grouping by resource is better.
    // I will keep it as /my-services inside this router, and mount the router at /api/services.
    // So the new path is /api/services/my-services.
    // I will need to update the frontend or add a redirect/alias in server.ts.
    // Actually, I can just add a route in server.ts that uses this controller logic, or just keep it here and update frontend.
    // But the user asked for backend refactoring.
    // I will try to keep paths compatible if possible.
    // If I mount at /api, then I need to prefix routes with /services.
    // Let's mount at /api/services.
    // Then /api/services/my-services is the new path.
    // The old path was /api/my-services.
    // I will add a comment about this change.
    // Wait, I can define the route as /my-services in a separate router or just handle it.
    // Let's stick to RESTful design: /api/services/my-services is better, but /api/providers/me/services is even better.
    // But for now, let's just put it here.
    // I will check if I can mount it at /api and define full paths.
    // No, that defeats the purpose of modular routers.
    // I will define it here as /my-services.
    // And I will add a redirect or alias in server.ts if needed, or just accept the change.
    // Actually, I can mount the same router at multiple paths or just add specific routes in server.ts.
    // Let's just put it here and I will update server.ts to mount it at /api/services.
    // And I will add a specific route for /api/my-services in server.ts that delegates to this handler? No that's messy.
    // I will just change the path to /api/services/my-services in the frontend? No, I shouldn't change frontend if not requested.
    // I will mount this router at /api/services.
    // And I will add a separate route in server.ts for /api/my-services that points to the same logic?
    // Or I can just put /my-services in a separate router mounted at /api.
    // Let's put it in `src/routes/services.ts` but define the path as `/my-services`.
    // In `server.ts`, I will mount `servicesRouter` at `/api/services`.
    // So it becomes `/api/services/my-services`.
    // I will also add a rewrite in `server.ts` or just leave it.
    // Let's look at `users.ts`. I have `/me/profile`. Mounted at `/api/users`? No, `/api`.
    // If I mount `usersRouter` at `/api`, then `/me/profile` works.
    // So I can mount `servicesRouter` at `/api` and define routes as `/services`, `/services/:id`, `/my-services`.
    // This allows keeping the old paths!
    // Yes, I will mount all routers at `/api` or specific paths.
    // If I mount at `/api`, I need to include the prefix in the route definitions.
    // Let's do that for `services.ts`.

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can access this" });
      return;
    }
    const myServices = await prisma.service.findMany({
      where: { providerId: req.user!.id },
    });

    const parsedServices = myServices.map((service) => {
      let parsedProducts = [];
      if (service.productsUsed) {
        try {
          parsedProducts =
            typeof service.productsUsed === "string"
              ? JSON.parse(service.productsUsed)
              : service.productsUsed;
        } catch (e) {
          console.error("Error parsing productsUsed", e);
        }
      }

      let parsedAvailability = null;
      if (service.availability) {
        try {
          parsedAvailability =
            typeof service.availability === "string"
              ? JSON.parse(service.availability)
              : service.availability;
        } catch (e) {
          console.error("Error parsing availability", e);
        }
      }

      return {
        ...service,
        productsUsed: parsedProducts,
        availability: parsedAvailability,
      };
    });

    res.json(parsedServices);
  }
);

// Delete a service
router.delete(
  "/services/:id",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can delete services" });
      return;
    }

    const existingService = await prisma.service.findFirst({
      where: { id, providerId: req.user!.id },
    });

    if (!existingService) {
      res.status(404).json({ error: "Service not found or unauthorized" });
      return;
    }

    // Check if there are active bookings
    const activeBookings = await prisma.booking.findMany({
      where: {
        serviceId: id,
        status: { in: ["pending", "confirmed", "paid"] },
      },
    });

    if (activeBookings.length > 0) {
      res.status(400).json({
        error:
          "Cannot delete service with active bookings. Please cancel them first.",
      });
      return;
    }

    await prisma.service.delete({
      where: { id },
    });

    res.json({ success: true });
  }
);

// Get booked dates for a specific service
router.get(
  "/services/:serviceId/booked-dates",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { serviceId } = req.params;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    // Get all non-cancelled bookings for this service
    const serviceBookings = await prisma.booking.findMany({
      where: {
        serviceId: serviceId,
        status: { not: "cancelled" },
      },
    });

    // Extract unique dates
    const bookedDates = Array.from(
      new Set(
        serviceBookings.map(
          (b: any) => new Date(b.date).toISOString().split("T")[0]
        )
      )
    );

    res.json({ bookedDates });
  }
);

export default router;
