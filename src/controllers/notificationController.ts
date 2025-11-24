import { Request, Response } from "express";
import { notificationService } from "../services/notificationService";

export const notificationController = {
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const notifications = await notificationService.getNotifications(
        req.user!.id
      );
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  },

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await notificationService.markAsRead(id, req.user!.id);
      res.json(result);
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      if (error.message === "Notification not found") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to mark notification as read" });
      }
    }
  },

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const result = await notificationService.markAllAsRead(req.user!.id);
      res.json(result);
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      res
        .status(500)
        .json({ error: "Failed to mark all notifications as read" });
    }
  },
};
