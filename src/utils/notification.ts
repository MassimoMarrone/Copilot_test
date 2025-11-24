import { PrismaClient } from "@prisma/client";
import { getIO } from "../socket";
import { Notification } from "../types";

const prisma = new PrismaClient();

export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: Notification["type"] = "info",
  link?: string
): Promise<void> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: new Date(),
        link,
      },
    });

    const io = getIO();
    io.to(`user_${userId}`).emit("new_notification", notification);
  } catch (err) {
    console.error("Failed to create/emit notification", err);
  }
};
