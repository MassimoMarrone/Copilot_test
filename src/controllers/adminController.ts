import { Request, Response } from "express";
import { adminService } from "../services/adminService";

export const adminController = {
  async getAllUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await adminService.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },

  async blockUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await adminService.blockUser(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error blocking user:", error);
      if (error.message === "User not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Cannot block an admin") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to block user" });
      }
    }
  },

  async unblockUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await adminService.unblockUser(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      if (error.message === "User not found") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to unblock user" });
      }
    }
  },

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await adminService.deleteUser(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      if (error.message === "User not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Cannot delete the last admin") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to delete user" });
      }
    }
  },

  async getAllServices(_req: Request, res: Response): Promise<void> {
    try {
      const services = await adminService.getAllServices();
      res.json(services);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  },

  async deleteService(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await adminService.deleteService(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error deleting service:", error);
      if (error.message === "Service not found") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to delete service" });
      }
    }
  },

  async getAllBookings(_req: Request, res: Response): Promise<void> {
    try {
      const bookings = await adminService.getAllBookings();
      res.json(bookings);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  },

  async cancelBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await adminService.cancelBooking(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to cancel booking" });
      }
    }
  },

  async deleteBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await adminService.deleteBooking(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error deleting booking:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to delete booking" });
      }
    }
  },

  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  },

  // ============ SUPER ADMIN ONLY ============

  async getAllAdmins(_req: Request, res: Response): Promise<void> {
    try {
      const admins = await adminService.getAllAdmins();
      res.json(admins);
    } catch (error: any) {
      console.error("Error fetching admins:", error);
      res.status(500).json({ error: "Failed to fetch admins" });
    }
  },

  async promoteToAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await adminService.promoteToAdmin(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error promoting user:", error);
      if (error.message === "User not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "User is already an admin") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to promote user" });
      }
    }
  },

  async demoteAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const currentAdminId = req.user!.id;
      const result = await adminService.demoteAdmin(id, currentAdminId);
      res.json(result);
    } catch (error: any) {
      console.error("Error demoting admin:", error);
      if (error.message === "User not found") {
        res.status(404).json({ error: error.message });
      } else if (
        error.message === "User is not an admin" ||
        error.message === "Cannot demote a super admin" ||
        error.message === "Cannot demote yourself"
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to demote admin" });
      }
    }
  },

  // ============ PROVIDER ONBOARDING ============

  async getPendingOnboardings(_req: Request, res: Response): Promise<void> {
    try {
      const pending = await adminService.getPendingOnboardings();
      res.json(pending);
    } catch (error: any) {
      console.error("Error fetching pending onboardings:", error);
      res.status(500).json({ error: "Failed to fetch pending onboardings" });
    }
  },

  async getOnboardingDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const details = await adminService.getOnboardingDetails(id);
      res.json(details);
    } catch (error: any) {
      console.error("Error fetching onboarding details:", error);
      if (error.message === "User not found") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch onboarding details" });
      }
    }
  },

  async approveOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await adminService.approveOnboarding(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error approving onboarding:", error);
      if (error.message === "User not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Onboarding not under review") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to approve onboarding" });
      }
    }
  },

  async rejectOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason) {
        res.status(400).json({ error: "Rejection reason is required" });
        return;
      }
      const result = await adminService.rejectOnboarding(id, reason);
      res.json(result);
    } catch (error: any) {
      console.error("Error rejecting onboarding:", error);
      if (error.message === "User not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Onboarding not under review") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to reject onboarding" });
      }
    }
  },

  // ============ DISPUTE MANAGEMENT ============

  async getDisputes(req: Request, res: Response): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const disputes = await adminService.getDisputes(status);
      res.json(disputes);
    } catch (error: any) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ error: "Failed to fetch disputes" });
    }
  },

  async getDisputeDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const details = await adminService.getDisputeDetails(id);
      res.json(details);
    } catch (error: any) {
      console.error("Error fetching dispute details:", error);
      if (
        error.message === "Booking not found" ||
        error.message === "This booking has no dispute"
      ) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch dispute details" });
      }
    }
  },

  async resolveDispute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resolution, notes } = req.body;

      if (!resolution || !["refund", "release"].includes(resolution)) {
        res
          .status(400)
          .json({ error: "Invalid resolution. Must be 'refund' or 'release'" });
        return;
      }

      if (!notes || notes.trim().length < 5) {
        res
          .status(400)
          .json({ error: "Notes are required (min 5 characters)" });
        return;
      }

      const adminId = req.user!.id;
      const result = await adminService.resolveDispute(
        id,
        adminId,
        resolution,
        notes
      );
      res.json(result);
    } catch (error: any) {
      console.error("Error resolving dispute:", error);
      if (error.message === "Booking not found") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "This dispute is not pending") {
        res.status(400).json({ error: error.message });
      } else {
        res
          .status(500)
          .json({ error: "Failed to resolve dispute: " + error.message });
      }
    }
  },
};
