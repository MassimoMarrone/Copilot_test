import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Square meters ranges and their base duration in minutes
const SQUARE_METERS_DURATION: Record<string, number> = {
  "0-50": 120, // 2 hours for small apartments
  "50-80": 180, // 3 hours for medium apartments
  "80-120": 240, // 4 hours for large apartments
  "120+": 300, // 5 hours for very large apartments
};

// Windows adjustment in minutes based on count
const WINDOWS_TIME_ADJUSTMENT: Record<number, number> = {
  0: 0,     // 0 finestre: tempo base invariato
  2: 30,    // 1-4 finestre: +30 min
  5: 60,    // 4-6 finestre: +1 ora
  8: 120,   // 6-10 finestre: +2 ore
};

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface EstimatedDuration {
  minutes: number;
  hours: number;
  formatted: string;
}

export const schedulingService = {
  /**
   * Calculate estimated duration based on apartment size and windows
   */
  calculateEstimatedDuration(
    squareMetersRange: string,
    windowsCount: number
  ): EstimatedDuration {
    // Base duration from square meters
    const baseDuration = SQUARE_METERS_DURATION[squareMetersRange] || 180;

    // Adjustment based on windows count
    const windowsAdjustment = WINDOWS_TIME_ADJUSTMENT[windowsCount] || 0;

    const totalMinutes = Math.max(60, baseDuration + windowsAdjustment); // Minimo 1 ora
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return {
      minutes: totalMinutes,
      hours: totalMinutes / 60,
      formatted:
        remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`,
    };
  },

  /**
   * Calculate price based on duration and service pricing
   */
  calculatePrice(
    service: { price: number; priceType: string },
    estimatedMinutes: number,
    squareMetersRange: string
  ): number {
    switch (service.priceType) {
      case "hourly":
        // Price per hour * estimated hours
        return Math.round(service.price * (estimatedMinutes / 60) * 100) / 100;
      case "per_sqm":
        // Price per sqm * average sqm of range
        const avgSqm = getAverageSqm(squareMetersRange);
        return Math.round(service.price * avgSqm * 100) / 100;
      case "fixed":
      default:
        return service.price;
    }
  },

  /**
   * Get available time slots for a service on a specific date
   */
  async getAvailableSlots(
    serviceId: string,
    date: string,
    requiredDurationMinutes: number
  ): Promise<TimeSlot[]> {
    const service = (await prisma.service.findUnique({
      where: { id: serviceId },
    })) as any;

    if (!service) {
      throw new Error("Service not found");
    }

    const workStart = service.workingHoursStart || "08:00";
    const workEnd = service.workingHoursEnd || "18:00";
    const slotDuration = service.slotDurationMinutes || 30;

    // Get all bookings for this service on this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = (await prisma.booking.findMany({
      where: {
        serviceId: serviceId,
        status: { not: "cancelled" },
        date: {
          gte: startOfDay as any,
          lte: endOfDay as any,
        },
      },
    })) as any[];

    // Check availability from service settings
    let availability: any = null;
    if (service.availability) {
      try {
        availability =
          typeof service.availability === "string"
            ? JSON.parse(service.availability)
            : service.availability;
      } catch (e) {
        console.error("Error parsing availability:", e);
      }
    }

    // Check if this day is blocked
    if (availability) {
      const dateString = startOfDay.toISOString().split("T")[0];
      if (
        availability.blockedDates &&
        availability.blockedDates.includes(dateString)
      ) {
        return []; // No slots available - day is blocked
      }

      // Check weekly availability
      const days = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const dayName = days[startOfDay.getDay()];
      if (availability.weekly) {
        const daySchedule = availability.weekly[dayName];
        if (daySchedule && !daySchedule.enabled) {
          return []; // No slots available - day disabled
        }
      }
    }

    // Generate all possible slots
    const slots: TimeSlot[] = [];
    const workStartMinutes = timeToMinutes(workStart);
    const workEndMinutes = timeToMinutes(workEnd);

    // Create slots based on slot duration
    for (
      let startMinutes = workStartMinutes;
      startMinutes + requiredDurationMinutes <= workEndMinutes;
      startMinutes += slotDuration
    ) {
      const endMinutes = startMinutes + requiredDurationMinutes;
      const startTime = minutesToTime(startMinutes);
      const endTime = minutesToTime(endMinutes);

      // Check if this slot conflicts with existing bookings
      const isAvailable = !existingBookings.some((booking) => {
        // Handle legacy bookings without startTime/endTime
        if (!booking.startTime || !booking.endTime) {
          // Legacy booking blocks the whole day
          return true;
        }

        const bookingStart = timeToMinutes(booking.startTime);
        const bookingEnd = timeToMinutes(booking.endTime);

        // Check for overlap
        return startMinutes < bookingEnd && endMinutes > bookingStart;
      });

      slots.push({
        startTime,
        endTime,
        available: isAvailable,
      });
    }

    return slots;
  },

  /**
   * Validate that a time slot is available for booking
   */
  async validateSlotAvailability(
    serviceId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all bookings for the day
    const existingBookings = (await prisma.booking.findMany({
      where: {
        serviceId: serviceId,
        status: { not: "cancelled" },
        date: {
          gte: startOfDay as any,
          lte: endOfDay as any,
        },
      },
    })) as any[];

    if (existingBookings.length === 0) {
      return true;
    }

    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    // Check each existing booking for conflicts
    for (const booking of existingBookings) {
      // If legacy booking exists (no startTime/endTime), the day is fully booked
      if (!booking.startTime || !booking.endTime) {
        return false;
      }

      const existingStart = timeToMinutes(booking.startTime);
      const existingEnd = timeToMinutes(booking.endTime);

      // Check for overlap: there's a conflict if the new slot overlaps with existing
      const hasOverlap = newStart < existingEnd && newEnd > existingStart;
      if (hasOverlap) {
        return false;
      }
    }

    return true;
  },
};

// Helper functions
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

function getAverageSqm(range: string): number {
  switch (range) {
    case "0-50":
      return 35;
    case "50-80":
      return 65;
    case "80-120":
      return 100;
    case "120+":
      return 150;
    default:
      return 65;
  }
}
