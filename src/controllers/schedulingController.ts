import { Request, Response } from "express";
import { schedulingService } from "../services/schedulingService";
import { prisma } from "../lib/prisma";

export const schedulingController = {
  /**
   * Calculate estimated duration based on apartment details
   */
  async getEstimatedDuration(req: Request, res: Response): Promise<void> {
    try {
      const { squareMetersRange, windowsCount } = req.query;

      if (!squareMetersRange || windowsCount === undefined) {
        res.status(400).json({
          error: "squareMetersRange and windowsCount are required",
        });
        return;
      }

      const duration = schedulingService.calculateEstimatedDuration(
        squareMetersRange as string,
        parseInt(windowsCount as string, 10)
      );

      res.json(duration);
    } catch (error: any) {
      console.error("Error calculating duration:", error);
      res.status(500).json({ error: "Failed to calculate duration" });
    }
  },

  /**
   * Get available time slots for a service on a specific date
   */
  async getAvailableSlots(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const { date, squareMetersRange, windowsCount } = req.query;

      if (!date) {
        res.status(400).json({ error: "date is required" });
        return;
      }

      // Calculate required duration if apartment details provided
      let requiredDuration = 120; // Default 2 hours
      if (squareMetersRange && windowsCount !== undefined) {
        const duration = schedulingService.calculateEstimatedDuration(
          squareMetersRange as string,
          parseInt(windowsCount as string, 10)
        );
        requiredDuration = duration.minutes;
      }

      const slots = await schedulingService.getAvailableSlots(
        serviceId,
        date as string,
        requiredDuration
      );

      // Also return service info for price calculation
      const service = (await prisma.service.findUnique({
        where: { id: serviceId },
      })) as any;

      // Calculate price if apartment details provided
      let calculatedPrice = service?.price || 0;
      if (service && squareMetersRange) {
        calculatedPrice = schedulingService.calculatePrice(
          { price: service.price, priceType: service.priceType || "fixed" },
          requiredDuration,
          squareMetersRange as string
        );
      }

      res.json({
        slots,
        estimatedDuration: requiredDuration,
        estimatedDurationFormatted: formatDuration(requiredDuration),
        calculatedPrice,
        workingHours: {
          start: service?.workingHoursStart || "08:00",
          end: service?.workingHoursEnd || "18:00",
        },
      });
    } catch (error: any) {
      console.error("Error getting available slots:", error);
      if (error.message === "Service not found") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to get available slots" });
      }
    }
  },

  /**
   * Get pricing estimate for a service based on apartment details
   */
  async getPriceEstimate(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const { squareMetersRange, windowsCount } = req.query;

      if (!squareMetersRange || windowsCount === undefined) {
        res.status(400).json({
          error: "squareMetersRange and windowsCount are required",
        });
        return;
      }

      const service = (await prisma.service.findUnique({
        where: { id: serviceId },
      })) as any;

      if (!service) {
        res.status(404).json({ error: "Service not found" });
        return;
      }

      const duration = schedulingService.calculateEstimatedDuration(
        squareMetersRange as string,
        parseInt(windowsCount as string, 10)
      );

      const price = schedulingService.calculatePrice(
        { price: service.price, priceType: service.priceType || "fixed" },
        duration.minutes,
        squareMetersRange as string
      );

      res.json({
        serviceTitle: service.title,
        basePrice: service.price,
        priceType: service.priceType || "fixed",
        estimatedDuration: duration,
        calculatedPrice: price,
        breakdown: getBreakdown(
          service.priceType || "fixed",
          service.price,
          duration.minutes,
          squareMetersRange as string
        ),
      });
    } catch (error: any) {
      console.error("Error calculating price estimate:", error);
      res.status(500).json({ error: "Failed to calculate price estimate" });
    }
  },
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${hours}h`;
}

function getBreakdown(
  priceType: string,
  basePrice: number,
  durationMinutes: number,
  squareMetersRange: string
): string {
  switch (priceType) {
    case "hourly":
      const hours = durationMinutes / 60;
      return `€${basePrice}/ora × ${hours.toFixed(1)} ore`;
    case "per_sqm":
      const avgSqm = getAverageSqm(squareMetersRange);
      return `€${basePrice}/m² × ~${avgSqm} m²`;
    case "fixed":
    default:
      return `Prezzo fisso`;
  }
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
