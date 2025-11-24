import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Get user notifications
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const userNotifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(userNotifications);
  }
);

// Mark notification as read
router.put(
  "/:id/read",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    res.json({ success: true });
  }
);

// Mark all notifications as read
router.put(
  "/read-all",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  }
);

export default router;
