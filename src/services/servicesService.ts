import { prisma } from "../lib/prisma";

interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  products?: string[];
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export class ServicesService {
  async getAllServices(
    page: number = 1,
    limit: number = 12,
    filters?: SearchFilters
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      provider: {
        isBlocked: false,
      },
    };

    // Category filter
    if (filters?.category && filters.category !== "Tutte") {
      where.category = filters.category;
    }

    // Price filters
    if (filters?.minPrice !== undefined && filters.minPrice > 0) {
      where.price = { ...where.price, gte: filters.minPrice };
    }
    if (filters?.maxPrice !== undefined && filters.maxPrice < Infinity) {
      where.price = { ...where.price, lte: filters.maxPrice };
    }

    // Text search filter
    if (filters?.query && filters.query.trim()) {
      where.OR = [
        { title: { contains: filters.query, mode: "insensitive" } },
        { description: { contains: filters.query, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination info
    const totalCount = await prisma.service.count({ where });

    let services = await prisma.service.findMany({
      where,
      include: {
        reviews: true,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Post-filter by products (JSON field)
    if (filters?.products && filters.products.length > 0) {
      services = services.filter((service: any) => {
        if (!service.productsUsed) return false;
        let products: string[] = [];
        try {
          products =
            typeof service.productsUsed === "string"
              ? JSON.parse(service.productsUsed)
              : service.productsUsed;
        } catch (e) {
          return false;
        }
        return filters.products!.every((p) => products.includes(p));
      });
    }

    // Post-filter by location (Haversine formula)
    // Check if client's location is within the provider's coverage radius
    if (filters?.latitude && filters?.longitude) {
      services = services.filter((service: any) => {
        if (!service.latitude || !service.longitude) return false;
        const distance = this.calculateDistance(
          filters.latitude!,
          filters.longitude!,
          service.latitude,
          service.longitude
        );
        // Use the provider's coverage radius (default 20km if not set)
        const providerCoverageKm = service.coverageRadiusKm || 20;
        return distance <= providerCoverageKm;
      });
    }

    const mappedServices = services.map((service: any) => {
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

      let parsedExtraServices = [];
      if (service.extraServices) {
        try {
          parsedExtraServices =
            typeof service.extraServices === "string"
              ? JSON.parse(service.extraServices)
              : service.extraServices;
        } catch (e) {
          console.error("Error parsing extraServices:", e);
        }
      }

      return {
        ...service,
        productsUsed: parsedProducts,
        availability: parsedAvailability,
        extraServices: parsedExtraServices,
        reviewCount,
        averageRating: parseFloat(averageRating.toFixed(1)),
      };
    });

    return {
      services: mappedServices,
      pagination: {
        page,
        limit,
        totalCount: mappedServices.length, // Adjusted after post-filtering
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    };
  }

  // Haversine formula to calculate distance between two coordinates
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async createService(userId: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isProvider) {
      throw new Error("Only providers can create services");
    }

    // Check if provider has Stripe Connect account
    if (!user.stripeAccountId) {
      throw new Error(
        "Devi collegare il tuo account Stripe prima di poter pubblicare servizi. Vai nelle impostazioni pagamenti."
      );
    }

    const {
      title,
      description,
      category,
      price,
      priceType,
      address,
      latitude,
      longitude,
      productsUsed,
      imageUrl,
      workingHoursStart,
      workingHoursEnd,
      extraServices,
      coverageRadiusKm,
    } = data;

    // Validazione indirizzo obbligatorio
    if (!address || address.trim().length < 5) {
      throw new Error("L'indirizzo è obbligatorio");
    }

    const defaultDaySchedule = {
      enabled: true,
      slots: [
        {
          start: workingHoursStart || "08:00",
          end: workingHoursEnd || "18:00",
        },
      ],
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
        priceType: priceType || "hourly",
        productsUsed: productsUsed
          ? typeof productsUsed === "string"
            ? productsUsed
            : JSON.stringify(productsUsed)
          : JSON.stringify([]),
        extraServices: extraServices
          ? typeof extraServices === "string"
            ? extraServices
            : JSON.stringify(extraServices)
          : null,
        address: address.trim(),
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        imageUrl,
        createdAt: new Date(),
        workingHoursStart: workingHoursStart || "08:00",
        workingHoursEnd: workingHoursEnd || "18:00",
        slotDurationMinutes: 30, // Fixed at 30 minutes
        coverageRadiusKm: coverageRadiusKm ? parseInt(coverageRadiusKm) : 20,
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
      priceType,
      address,
      latitude,
      longitude,
      availability,
      productsUsed,
      imageUrl,
      extraServices,
      coverageRadiusKm,
      workingHoursStart,
      workingHoursEnd,
    } = data;

    const updateData: any = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (price) updateData.price = parseFloat(price);
    if (priceType) updateData.priceType = priceType;
    if (address !== undefined) updateData.address = address;
    if (latitude) updateData.latitude = parseFloat(latitude);
    if (longitude) updateData.longitude = parseFloat(longitude);
    if (productsUsed) {
      updateData.productsUsed =
        typeof productsUsed === "string"
          ? productsUsed
          : JSON.stringify(productsUsed);
    }
    if (extraServices !== undefined) {
      updateData.extraServices = extraServices
        ? typeof extraServices === "string"
          ? extraServices
          : JSON.stringify(extraServices)
        : null;
    }
    if (coverageRadiusKm !== undefined) {
      updateData.coverageRadiusKm = parseInt(coverageRadiusKm);
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
    if (workingHoursStart) {
      updateData.workingHoursStart = workingHoursStart;
    }
    if (workingHoursEnd) {
      updateData.workingHoursEnd = workingHoursEnd;
    }
    // slotDurationMinutes is fixed at 30, not editable

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

      let parsedExtraServices = [];
      if (service.extraServices) {
        try {
          parsedExtraServices =
            typeof service.extraServices === "string"
              ? JSON.parse(service.extraServices)
              : service.extraServices;
        } catch (e) {
          console.error("Error parsing extraServices", e);
        }
      }

      return {
        ...service,
        productsUsed: parsedProducts,
        availability: parsedAvailability,
        extraServices: parsedExtraServices,
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
      throw new Error(
        "Cannot delete service with active bookings. Please cancel them first."
      );
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
