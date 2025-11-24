import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const adminService = {
  async getAllUsers() {
    const users = await prisma.user.findMany();
    const safeUsers = users.map(({ password, ...user }: any) => user);
    return safeUsers;
  },

  async blockUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.userType === "admin") {
      throw new Error("Cannot block an admin");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });

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

    return { success: true };
  },

  async unblockUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
    });
    return { success: true };
  },

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    // Prevent deleting the last admin
    if (user.userType === "admin") {
      const adminCount = await prisma.user.count({
        where: { userType: "admin" },
      });
      if (adminCount <= 1) {
        throw new Error("Cannot delete the last admin");
      }
    }

    await prisma.user.delete({ where: { id: userId } });
    // Also clean up related data
    await prisma.service.deleteMany({ where: { providerId: userId } });

    return { success: true };
  },

  async getAllServices() {
    const services = await prisma.service.findMany();
    return services;
  },

  async deleteService(serviceId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new Error("Service not found");
    }

    await prisma.service.delete({ where: { id: serviceId } });
    return { success: true };
  },

  async getAllBookings() {
    const bookings = await prisma.booking.findMany({
      orderBy: { date: "desc" },
    });
    return bookings;
  },

  async cancelBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
    });
    return { success: true };
  },

  async deleteBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    await prisma.booking.delete({ where: { id: bookingId } });
    return { success: true };
  },

  async getStats() {
    const totalUsers = await prisma.user.count();
    const totalServices = await prisma.service.count();
    const totalBookings = await prisma.booking.count();

    // Calculate total revenue (sum of amounts of completed bookings)
    const completedBookings = await prisma.booking.findMany({
      where: { status: "completed" },
      select: { amount: true },
    });

    const totalRevenue = completedBookings.reduce(
      (sum, booking) => sum + booking.amount,
      0
    );

    return {
      totalUsers,
      totalServices,
      totalBookings,
      totalRevenue,
    };
  },
};
