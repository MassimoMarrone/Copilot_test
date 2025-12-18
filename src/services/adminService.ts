import { prisma } from "../lib/prisma";

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

    // Additional stats for dashboard
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: today } },
    });

    const pendingBookings = await prisma.booking.count({
      where: { status: "pending" },
    });

    const activeProviders = await prisma.user.count({
      where: { isProvider: true, isBlocked: false },
    });

    const completedBookingsCount = await prisma.booking.count({
      where: { status: "completed" },
    });

    return {
      totalUsers,
      totalServices,
      totalBookings,
      totalRevenue,
      newUsersToday,
      pendingBookings,
      activeProviders,
      completedBookings: completedBookingsCount,
    };
  },

  // ============ SUPER ADMIN ONLY ============

  async getAllAdmins() {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
        adminLevel: true,
        createdAt: true,
      },
    });
    return admins;
  },

  async promoteToAdmin(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isAdmin) {
      throw new Error("User is already an admin");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin: true,
        adminLevel: "standard",
        userType: "admin",
      },
    });

    return { success: true, message: "User promoted to admin" };
  },

  async demoteAdmin(userId: string, currentAdminId: string) {
    if (userId === currentAdminId) {
      throw new Error("Cannot demote yourself");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isAdmin) {
      throw new Error("User is not an admin");
    }

    if (user.adminLevel === "super") {
      throw new Error("Cannot demote a super admin");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin: false,
        adminLevel: null,
        userType: user.isProvider ? "provider" : "client",
      },
    });

    return { success: true, message: "Admin demoted to user" };
  },

  // ============ PROVIDER ONBOARDING ============

  async getPendingOnboardings() {
    const pending = await prisma.user.findMany({
      where: {
        isProvider: true,
        onboardingStatus: { in: ["under_review", "documents_uploaded", "pending"] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        onboardingStatus: true,
        onboardingStep: true,
        createdAt: true,
        phone: true,
        city: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return pending;
  },

  async getOnboardingDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        onboardingStatus: true,
        onboardingStep: true,
        onboardingCompletedAt: true,
        onboardingRejectedAt: true,
        onboardingRejectionReason: true,
        createdAt: true,
        // Step 1
        dateOfBirth: true,
        fiscalCode: true,
        vatNumber: true,
        phone: true,
        address: true,
        city: true,
        postalCode: true,
        // Step 2
        idDocumentType: true,
        idDocumentNumber: true,
        idDocumentExpiry: true,
        idDocumentFrontUrl: true,
        idDocumentBackUrl: true,
        // Step 3
        iban: true,
        bankAccountHolder: true,
        // Step 4
        workingZones: true,
        yearsOfExperience: true,
        hasOwnEquipment: true,
        insuranceNumber: true,
        insuranceExpiry: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },

  async approveOnboarding(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.onboardingStatus !== "under_review") {
      throw new Error("Onboarding not under review");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStatus: "approved",
        onboardingCompletedAt: new Date(),
        onboardingRejectedAt: null,
        onboardingRejectionReason: null,
      },
    });

    return { success: true, message: "Onboarding approved" };
  },

  async rejectOnboarding(userId: string, reason: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.onboardingStatus !== "under_review") {
      throw new Error("Onboarding not under review");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStatus: "rejected",
        onboardingRejectedAt: new Date(),
        onboardingRejectionReason: reason,
      },
    });

    return { success: true, message: "Onboarding rejected" };
  },
};
