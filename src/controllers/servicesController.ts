import { Request, Response } from "express";
import { servicesService } from "../services/servicesService";

export class ServicesController {
  async getAllServices(_req: Request, res: Response): Promise<void> {
    try {
      const services = await servicesService.getAllServices();
      res.json(services);
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
