import { Request, Response } from "express";
import { reviewService } from "../services/reviewService";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const reviewController = {
  async createReview(req: Request, res: Response): Promise<void> {
    try {
      const result = await reviewService.createReview(req.user!.id, req.body);
      res.json(result);
    } catch (error: any) {
      console.error("Error creating review:", error);
      if (
        error.message ===
          "You can only review services you have completed bookings for" ||
        error.message === "You have already reviewed this service"
      ) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create review" });
      }
    }
  },

  async getServiceReviews(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const reviews = await reviewService.getServiceReviews(serviceId);
      res.json(reviews);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  },

  async getMyReviews(req: Request, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user || !user.isProvider) {
        res.status(403).json({ error: "Only providers can access this" });
        return;
      }

      const reviews = await reviewService.getMyReviews(req.user!.id);
      res.json(reviews);
    } catch (error: any) {
      console.error("Error fetching provider reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  },
};
