import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { PrismaClient } from "@prisma/client";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { upload } from "../config/upload";

const router = Router();
const prisma = new PrismaClient();

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
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { displayName, bio } = req.body;

    try {
      const updateData: any = {};
      if (displayName) updateData.displayName = displayName;
      if (bio) updateData.bio = bio;
      if (req.file) {
        updateData.avatarUrl = "/uploads/" + req.file.filename;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          isProvider: user.isProvider,
        },
      });
    } catch (error) {
      res.status(404).json({ error: "User not found" });
    }
  }
);

// Get public provider profile
router.get(
  "/providers/:id",
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const provider = await prisma.user.findFirst({
      where: { id, isProvider: true },
    });

    if (!provider) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }

    // Get provider's services
    const providerServices = await prisma.service.findMany({
      where: { providerId: id },
    });

    // Get provider's reviews
    const providerReviews = await prisma.review.findMany({
      where: { providerId: id },
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { email: true },
        },
      },
    });

    // Calculate average rating
    const averageRating =
      providerReviews.length > 0
        ? providerReviews.reduce((acc: number, r: any) => acc + r.rating, 0) /
          providerReviews.length
        : 0;

    res.json({
      id: provider.id,
      displayName: provider.displayName || provider.email.split("@")[0],
      bio: provider.bio,
      avatarUrl: provider.avatarUrl,
      createdAt: provider.createdAt,
      services: providerServices,
      reviews: providerReviews.map((r: any) => ({
        ...r,
        clientName: r.client?.email.split("@")[0] || "Client",
        helpfulCount: r.helpfulCount || 0,
      })),
      averageRating: parseFloat(averageRating.toFixed(1)),
      reviewCount: providerReviews.length,
    });
  }
);

// Delete own account
router.delete(
  "/me",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Prevent deleting the last admin if the user is an admin
    if (user.userType === "admin") {
      const adminCount = await prisma.user.count({
        where: { userType: "admin" },
      });
      if (adminCount <= 1) {
        res.status(400).json({ error: "Cannot delete the last admin" });
        return;
      }
    }

    // Cancel all pending bookings for this user (as client or provider)
    await prisma.booking.updateMany({
      where: {
        OR: [{ clientId: userId }, { providerId: userId }],
        status: "pending",
      },
      data: {
        status: "cancelled",
      },
    });

    // Remove user
    await prisma.user.delete({ where: { id: userId } });

    // Clean up related data
    await prisma.service.deleteMany({ where: { providerId: userId } });

    // Clear cookie
    res.clearCookie("token");
    res.json({ success: true });
  }
);

export default router;
