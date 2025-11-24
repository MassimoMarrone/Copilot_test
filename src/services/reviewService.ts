import { PrismaClient } from "@prisma/client";
import { sendNotification } from "../utils/notification";

const prisma = new PrismaClient();

export const reviewService = {
  async createReview(
    userId: string,
    data: { serviceId: string; rating: number; comment?: string }
  ) {
    const { serviceId, rating, comment } = data;

    // Check if user has booked and completed the service
    const booking = await prisma.booking.findFirst({
      where: {
        serviceId,
        clientId: userId,
        status: "completed",
      },
    });

    if (!booking) {
      throw new Error(
        "You can only review services you have completed bookings for"
      );
    }

    // Check if already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        serviceId,
        clientId: userId,
      },
    });

    if (existingReview) {
      throw new Error("You have already reviewed this service");
    }

    const review = await prisma.review.create({
      data: {
        serviceId,
        clientId: userId,
        bookingId: booking.id,
        providerId: booking.providerId,
        rating,
        comment: comment || "",
      },
      include: {
        client: {
          select: {
            displayName: true,
          },
        },
      },
    });

    // Notify provider
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (service) {
      await sendNotification(
        service.providerId,
        "New Review",
        `You received a ${rating}-star review for ${service.title}`
      );
    }

    return review;
  },

  async getServiceReviews(serviceId: string) {
    const reviews = await prisma.review.findMany({
      where: { serviceId },
      include: {
        client: {
          select: {
            displayName: true,
            // avatarUrl: true // If we had avatar
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reviews;
  },

  async getMyReviews(providerId: string) {
    const reviews = await prisma.review.findMany({
      where: { providerId },
      include: {
        client: {
          select: {
            displayName: true,
          },
        },
        service: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reviews;
  },
};
