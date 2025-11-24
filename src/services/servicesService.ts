import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ServicesService {
  async getAllServices() {
    const services = await prisma.service.findMany({
      where: {
        provider: {
          isBlocked: false,
        },
      },
      include: {
        reviews: true,
      },
    });

    return services.map((service: any) => {
      const reviewCount = service.reviews.length;
      const averageRating =
        reviewCount > 0
          ? service.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) /
            reviewCount
          : 0;

      let parsedProducts = [];
      if (service.productsUsed) {
        try {
          parsedProducts =
            typeof service.productsUsed === "string"
              ? JSON.parse(service.productsUsed)
              : service.productsUsed;
        } catch (e) {
          console.error("Error parsing productsUsed:", e);
          parsedProducts = [];
        }
      }

      let parsedAvailability = null;
      if (service.availability) {
        try {
          parsedAvailability =
            typeof service.availability === "string"
              ? JSON.parse(service.availability)
              : service.availability;
        } catch (e) {
          console.error("Error parsing availability:", e);
        }
      }

      return {
        ...service,
        productsUsed: parsedProducts,
        availability: parsedAvailability,
        reviewCount,
        averageRating: parseFloat(averageRating.toFixed(1)),
      };
    });
  }

  async createService(userId: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isProvider) {
      throw new Error("Only providers can create services");
    }

    const {
      title,
      description,
      category,
      price,
      address,
      latitude,
      longitude,
      productsUsed,
      imageUrl,
    } = data;

    const defaultDaySchedule = {
      enabled: true,
      slots: [{ start: "09:00", end: "17:00" }],
    };

    const defaultWeeklySchedule = {
      monday: { ...defaultDaySchedule },
      tuesday: { ...defaultDaySchedule },
      wednesday: { ...defaultDaySchedule },
      thursday: { ...defaultDaySchedule },
      friday: { ...defaultDaySchedule },
      saturday: { ...defaultDaySchedule, enabled: false },
      sunday: { ...defaultDaySchedule, enabled: false },
    };

    return prisma.service.create({
      data: {
        providerId: userId,
        providerEmail: user.email,
        title,
        description,
        category: category || "Altro",
        price: parseFloat(price),
        productsUsed: productsUsed
          ? typeof productsUsed === "string"
            ? productsUsed
            : JSON.stringify(productsUsed)
          : JSON.stringify([]),
        address: address || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        imageUrl,
        createdAt: new Date(),
        availability: JSON.stringify({
          weekly: defaultWeeklySchedule,
          blockedDates: [],
        }),
      },
    });
  }

  async updateService(userId: string, serviceId: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isProvider) {
      throw new Error("Only providers can update services");
    }

    const existingService = await prisma.service.findFirst({
      where: { id: serviceId, providerId: userId },
    });

    if (!existingService) {
      throw new Error("Service not found or unauthorized");
    }

    const {
      title,
      description,
      category,
      price,
      address,
      latitude,
      longitude,
      availability,
      productsUsed,
      imageUrl,
    } = data;

    const updateData: any = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (price) updateData.price = parseFloat(price);
    if (address !== undefined) updateData.address = address;
    if (latitude) updateData.latitude = parseFloat(latitude);
    if (longitude) updateData.longitude = parseFloat(longitude);
    if (productsUsed) {
      updateData.productsUsed =
        typeof productsUsed === "string"
          ? productsUsed
          : JSON.stringify(productsUsed);
    }
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }
    if (availability) {
      updateData.availability =
        typeof availability === "string"
          ? availability
          : JSON.stringify(availability);
    }

    return prisma.service.update({
      where: { id: serviceId },
      data: updateData,
    });
  }

  async getMyServices(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isProvider) {
      throw new Error("Only providers can access this");
    }

    const myServices = await prisma.service.findMany({
      where: { providerId: userId },
    });

    return myServices.map((service) => {
      let parsedProducts = [];
      if (service.productsUsed) {
        try {
          parsedProducts =
            typeof service.productsUsed === "string"
              ? JSON.parse(service.productsUsed)
              : service.productsUsed;
        } catch (e) {
          console.error("Error parsing productsUsed", e);
        }
      }

      let parsedAvailability = null;
      if (service.availability) {
        try {
          parsedAvailability =
            typeof service.availability === "string"
              ? JSON.parse(service.availability)
              : service.availability;
        } catch (e) {
          console.error("Error parsing availability", e);
        }
      }

      return {
        ...service,
        productsUsed: parsedProducts,
        availability: parsedAvailability,
      };
    });
  }

  async deleteService(userId: string, serviceId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isProvider) {
      throw new Error("Only providers can delete services");
    }

    const existingService = await prisma.service.findFirst({
      where: { id: serviceId, providerId: userId },
    });

    if (!existingService) {
      throw new Error("Service not found or unauthorized");
    }

    const activeBookings = await prisma.booking.findMany({
      where: {
        serviceId: serviceId,
        status: { in: ["pending", "confirmed", "paid"] },
      },
    });

    if (activeBookings.length > 0) {
      throw new Error("Cannot delete service with active bookings. Please cancel them first.");
    }

    await prisma.service.delete({
      where: { id: serviceId },
    });

    return { success: true };
  }

  async getBookedDates(serviceId: string) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new Error("Service not found");
    }

    const serviceBookings = await prisma.booking.findMany({
      where: {
        serviceId: serviceId,
        status: { not: "cancelled" },
      },
    });

    const bookedDates = Array.from(
      new Set(
        serviceBookings.map(
          (b: any) => new Date(b.date).toISOString().split("T")[0]
        )
      )
    );

    return { bookedDates };
  }
}

export const servicesService = new ServicesService();
