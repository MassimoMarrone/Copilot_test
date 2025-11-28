import { Request, Response } from "express";
import { servicesService } from "../services/servicesService";

export class ServicesController {
  async getAllServices(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      
      // Parse filters from query params
      const filters: any = {};
      
      if (req.query.query) {
        filters.query = req.query.query as string;
      }
      if (req.query.category) {
        filters.category = req.query.category as string;
      }
      if (req.query.minPrice) {
        filters.minPrice = parseFloat(req.query.minPrice as string);
      }
      if (req.query.maxPrice) {
        const maxPrice = parseFloat(req.query.maxPrice as string);
        if (maxPrice < 10000) { // Only apply if not "infinity"
          filters.maxPrice = maxPrice;
        }
      }
      if (req.query.products) {
        filters.products = (req.query.products as string).split(',');
      }
      if (req.query.latitude && req.query.longitude) {
        filters.latitude = parseFloat(req.query.latitude as string);
        filters.longitude = parseFloat(req.query.longitude as string);
        filters.radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 50;
      }
      
      const result = await servicesService.getAllServices(page, limit, filters);
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  }

  async createService(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      let imageUrl = undefined;
      if (req.file) {
        imageUrl = "/uploads/" + req.file.filename;
      } else {
        const { title, description } = req.body;
        const lowerTitle = title.toLowerCase();
        const lowerDesc = description.toLowerCase();
        if (
          lowerTitle.includes("pulizia") ||
          lowerDesc.includes("pulizia") ||
          lowerTitle.includes("cleaning") ||
          lowerDesc.includes("cleaning")
        ) {
          imageUrl = "/assets/cleaning.jpg";
        } else {
          imageUrl = "/assets/cleaning.jpg";
        }
      }

      const serviceData = { ...req.body, imageUrl };
      const service = await servicesService.createService(userId, serviceData);
      res.json(service);
    } catch (error: any) {
      console.error("Create service error:", error);
      const status =
        error.message === "Only providers can create services" ? 403 : 500;
      res
        .status(status)
        .json({ error: error.message || "Failed to create service" });
    }
  }

  async updateService(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const imageUrl = req.file ? "/uploads/" + req.file.filename : undefined;
      const serviceData = { ...req.body, imageUrl };

      const service = await servicesService.updateService(
        userId,
        id,
        serviceData
      );
      res.json(service);
    } catch (error: any) {
      console.error("Update service error:", error);
      let status = 500;
      if (error.message === "Only providers can update services") status = 403;
      if (error.message === "Service not found or unauthorized") status = 404;
      res
        .status(status)
        .json({ error: error.message || "Failed to update service" });
    }
  }

  async getMyServices(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const services = await servicesService.getMyServices(userId);
      res.json(services);
    } catch (error: any) {
      console.error("Get my services error:", error);
      const status =
        error.message === "Only providers can access this" ? 403 : 500;
      res
        .status(status)
        .json({ error: error.message || "Failed to fetch services" });
    }
  }

  async deleteService(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      await servicesService.deleteService(userId, id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete service error:", error);
      let status = 500;
      if (error.message === "Only providers can delete services") status = 403;
      if (error.message === "Service not found or unauthorized") status = 404;
      if (error.message.includes("active bookings")) status = 400;
      res
        .status(status)
        .json({ error: error.message || "Failed to delete service" });
    }
  }

  async getBookedDates(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const result = await servicesService.getBookedDates(serviceId);
      res.json(result);
    } catch (error: any) {
      console.error("Get booked dates error:", error);
      const status = error.message === "Service not found" ? 404 : 500;
      res
        .status(status)
        .json({ error: error.message || "Failed to fetch booked dates" });
    }
  }
}

export const servicesController = new ServicesController();
