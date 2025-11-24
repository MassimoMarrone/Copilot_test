import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class UserService {
  async updateProfile(
    userId: string,
    data: { displayName?: string; bio?: string; avatarUrl?: string }
  ) {
    const updateData: any = {};
    if (data.displayName) updateData.displayName = data.displayName;
    if (data.bio) updateData.bio = data.bio;
    if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      isProvider: user.isProvider,
    };
  }

  async getProviderProfile(providerId: string) {
    const provider = await prisma.user.findFirst({
      where: { id: providerId, isProvider: true },
    });

    if (!provider) {
      throw new Error("Provider not found");
    }

    // Get provider's services
    const providerServices = await prisma.service.findMany({
      where: { providerId },
    });

    // Get provider's reviews
    const providerReviews = await prisma.review.findMany({
      where: { providerId },
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

    return {
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
    };
  }

  async deleteAccount(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    // Prevent deleting the last admin if the user is an admin
    if (user.userType === "admin") {
      const adminCount = await prisma.user.count({
        where: { userType: "admin" },
      });
      if (adminCount <= 1) {
        throw new Error("Cannot delete the last admin");
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

    return { success: true };
  }
}

export const userService = new UserService();
