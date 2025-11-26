import { Request, Response } from "express";
import { userService } from "../services/userService";

export class UserController {
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        displayName,
        bio,
        firstName,
        lastName,
        phone,
        city,
        address,
        postalCode,
      } = req.body;
      const avatarUrl = req.file ? "/uploads/" + req.file.filename : undefined;

      const user = await userService.updateProfile(userId, {
        displayName,
        bio,
        firstName,
        lastName,
        phone,
        city,
        address,
        postalCode,
        avatarUrl,
      });

      res.json({
        success: true,
        user,
      });
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(404).json({ error: error.message || "User not found" });
    }
  }

  async getProviderProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const profile = await userService.getProviderProfile(id);
      res.json(profile);
    } catch (error: any) {
      console.error("Get provider profile error:", error);
      res.status(404).json({ error: error.message || "Provider not found" });
    }
  }

  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      await userService.deleteAccount(userId);
      res.clearCookie("token", {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" ||
          req.secure ||
          req.headers["x-forwarded-proto"] === "https",
        sameSite: "lax",
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete account error:", error);
      const status = error.message === "User not found" ? 404 : 400;
      res
        .status(status)
        .json({ error: error.message || "Failed to delete account" });
    }
  }
}

export const userController = new UserController();
