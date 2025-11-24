import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Get all users
router.get(
  "/users",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response) => {
    // Return users without passwords
    const users = await prisma.user.findMany();
    const safeUsers = users.map(({ password, ...user }: any) => user);
    res.json(safeUsers);
  }
);

// Block user
router.post(
  "/users/:id/block",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.userType === "admin") {
      res.status(400).json({ error: "Cannot block an admin" });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { isBlocked: true },
    });

    // Cancel all pending bookings for this user (as client or provider)
    await prisma.booking.updateMany({
      where: {
        OR: [{ clientId: id }, { providerId: id }],
        status: "pending",
      },
      data: {
        status: "cancelled",
      },
    });

    res.json({ success: true });
  }
);

// Unblock user
router.post(
  "/users/:id/unblock",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { isBlocked: false },
    });
    res.json({ success: true });
  }
);

// Delete user
router.delete(
  "/users/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Prevent deleting the last admin
    if (user.userType === "admin") {
      const adminCount = await prisma.user.count({
        where: { userType: "admin" },
      });
      if (adminCount <= 1) {
        res.status(400).json({ error: "Cannot delete the last admin" });
        return;
      }
    }

    await prisma.user.delete({ where: { id } });
    // Also clean up related data
    await prisma.service.deleteMany({ where: { providerId: id } });

    res.json({ success: true });
  }
);

// Get all services
router.get(
  "/services",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response) => {
    const services = await prisma.service.findMany();
    res.json(services);
  }
);

// Delete service
router.delete(
  "/services/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const service = await prisma.service.findUnique({ where: { id } });

    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    await prisma.service.delete({ where: { id } });
    res.json({ success: true });
  }
);

export default router;
