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
        where: { userType: "admin", isDeleted: false },
      });
      if (adminCount <= 1) {
        throw new Error("Cannot delete the last admin");
      }
    }

    // Use a transaction to ensure all operations succeed or none
    await prisma.$transaction(async (tx) => {
      // 1. Cancel all pending bookings for this user (as client or provider)
      await tx.booking.updateMany({
        where: {
          OR: [{ clientId: userId }, { providerId: userId }],
          status: "pending",
        },
        data: {
          status: "cancelled",
        },
      });

      // 2. Delete ChatMessages sent by this user (privacy)
      await tx.chatMessage.deleteMany({
        where: { senderId: userId },
      });

      // 3. Delete Services (if provider) - removes their active offerings
      await tx.service.deleteMany({ where: { providerId: userId } });

      // 4. Delete Notifications
      await tx.notification.deleteMany({ where: { userId: userId } });

      // 5. Mark email as deleted but preserve original for reference
      // Format: deleted_[timestamp]_[originalEmail] - frees up the email for re-registration
      const deletedEmail = `deleted_${Date.now()}_${user.email}`;

      // 6. Soft delete: Mark user as deleted but KEEP ALL DATA for legal/dispute purposes
      // - Bookings history preserved (for invoicing/disputes)
      // - Reviews preserved (given and received)
      // - Personal info preserved (for legal reference)
      await tx.user.update({
        where: { id: userId },
        data: {
          email: deletedEmail, // Free up original email
          password: "", // Invalidate password
          googleId: null, // Remove OAuth link
          verificationToken: null,
          verificationTokenExpires: null,
          isDeleted: true,
          deletedAt: new Date(),
          isBlocked: true, // Prevent any login attempts
          // KEEP: displayName, bio, avatarUrl, all booking/review relations
        },
      });
    });

    return { success: true };
  }
}

export const userService = new UserService();
