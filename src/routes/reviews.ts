import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { PrismaClient } from "@prisma/client";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { sendNotification } from "../utils/notification";

const router = Router();
const prisma = new PrismaClient();

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
  async (req: Request, res: Response): Promise<void> => {
    const { serviceId, rating, comment } = req.body;
    const userId = req.user!.id;

    // Check if user has booked and completed the service
    const booking = await prisma.booking.findFirst({
      where: {
        serviceId,
        clientId: userId,
        status: "completed",
      },
    });

    if (!booking) {
      res.status(403).json({
        error: "You can only review services you have completed bookings for",
      });
      return;
    }

    // Check if already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        serviceId,
        clientId: userId,
      },
    });

    if (existingReview) {
      res.status(400).json({ error: "You have already reviewed this service" });
      return;
    }

    const review = await prisma.review.create({
      data: {
        serviceId,
        clientId: userId,
        bookingId: booking.id,
        providerId: booking.providerId,
        rating,
        comment,
      },
      include: {
        client: {
          select: {
            displayName: true,
          },
        },
      },
    });

    // Notify provider
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (service) {
      await sendNotification(
        service.providerId,
        "New Review",
        `You received a ${rating}-star review for ${service.title}`
      );
    }

    res.json(review);
  }
);

// Get reviews for a service
router.get(
  "/reviews/service/:serviceId",
  async (req: Request, res: Response): Promise<void> => {
    const { serviceId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { serviceId },
      include: {
        client: {
          select: {
            displayName: true,
            // avatarUrl: true // If we had avatar
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(reviews);
  }
);

// Get provider's reviews
router.get(
  "/my-reviews",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can access this" });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { providerId: req.user!.id },
      include: {
        client: {
          select: {
            displayName: true,
          },
        },
        service: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(reviews);
  }
);

export default router;
