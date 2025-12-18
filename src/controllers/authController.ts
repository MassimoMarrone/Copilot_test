import { Request, Response } from "express";
import { authService } from "../services/authService";
import { setAuthCookie, clearAuthCookie } from "../utils/cookies";

// Helper to get client IP address
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Add IP and user agent for consent tracking
      const registrationData = {
        ...req.body,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || "unknown",
      };
      
      const result = await authService.register(registrationData);
      res.json({ success: true, message: result.message });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        res.status(400).json({ error: "Token di verifica non valido" });
        return;
      }

      const { token: authToken } = await authService.verifyEmail(token);

      setAuthCookie(res, req, authToken);

      // Return JSON for API calls, redirect for direct browser access
      const acceptHeader = req.headers.accept || "";
      if (acceptHeader.includes("application/json")) {
        res.json({ success: true, message: "Email verificata con successo" });
      } else {
        // Direct browser access - redirect to frontend verify page
        res.redirect(`/verify-email?token=${token}&verified=true`);
      }
    } catch (error: any) {
      console.error("Email verification error:", error);
      const acceptHeader = req.headers.accept || "";
      if (acceptHeader.includes("application/json")) {
        res.status(400).json({ error: error.message || "Verifica fallita" });
      } else {
        res.redirect(
          `/verify-email?error=${encodeURIComponent(error.message)}`
        );
      }
    }
  }

  async resendVerificationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email richiesta" });
        return;
      }

      const result = await authService.resendVerificationEmail(email);
      res.json({ success: true, message: result.message });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res
        .status(400)
        .json({ error: error.message || "Errore durante l'invio" });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { user, token } = await authService.login(req.body);

      setAuthCookie(res, req, token);

      res.json({ success: true, userType: user.userType });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Login failed" });
    }
  }

  async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { token, acceptedTerms } = req.body;
      const { user, token: jwtToken } = await authService.googleLogin(
        token,
        acceptedTerms
      );

      setAuthCookie(res, req, jwtToken);

      res.json({ success: true, userType: user.userType });
    } catch (error: any) {
      console.error("Google Auth error:", error);
      const status = error.code === "TERMS_REQUIRED" ? 400 : 401;
      res.status(status).json({
        error: error.message || "Google authentication failed",
        code: error.code,
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    clearAuthCookie(res, req);
    res.json({ success: true });
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const user = await authService.getUser(req.user!.id);
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        city: user.city,
        address: user.address,
        postalCode: user.postalCode,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        userType: user.userType,
        isClient: user.isClient,
        isProvider: user.isProvider,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel,
        onboardingStatus: user.onboardingStatus,
        createdAt: user.createdAt,
      });
    } catch (error: any) {
      console.error("Error in /api/me:", error);
      res.status(error.message === "User not found" ? 404 : 500).json({
        error: error.message || "Internal server error fetching user",
      });
    }
  }

  async becomeProvider(req: Request, res: Response): Promise<void> {
    try {
      const { acceptedProviderTerms } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = req.headers["user-agent"];
      
      const { token } = await authService.becomeProvider(
        req.user!.id,
        acceptedProviderTerms,
        ipAddress,
        userAgent
      );

      setAuthCookie(res, req, token);

      res.json({ success: true, isProvider: true });
    } catch (error: any) {
      console.error("Become provider error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to become provider" });
    }
  }
}

export const authController = new AuthController();
