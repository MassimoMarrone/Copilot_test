import { prisma } from "../lib/prisma";

export const notificationService = {
  async getNotifications(userId: string) {
    const userNotifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return userNotifications;
  },

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return { success: true };
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  },
};
