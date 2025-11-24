import { get, put } from "./api";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  link?: string;
}

export const notificationService = {
  // Get user notifications
  getNotifications: async (): Promise<Notification[]> => {
    return get<Notification[]>("/api/notifications");
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<{ success: boolean }> => {
    return put<{ success: boolean }>(`/api/notifications/${id}/read`, {});
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ success: boolean }> => {
    return put<{ success: boolean }>("/api/notifications/read-all", {});
  },
};
