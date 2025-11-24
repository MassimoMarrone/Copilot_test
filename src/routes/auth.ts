import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body } from "express-validator";
import { OAuth2Client } from "google-auth-library";
import { PrismaClient } from "@prisma/client";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { sendEmail, emailTemplates } from "../emailService";

const router = Router();
const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Register
router.post(
  "/register",
  authLimiter,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, acceptedTerms } = req.body;

      if (acceptedTerms !== true && acceptedTerms !== "true") {
        res
          .status(400)
          .json({ error: "You must accept the Terms & Conditions" });
        return;
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ error: "User already exists" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          userType: "client",
          isClient: true,
          isProvider: false,
          acceptedTerms: true,
          createdAt: new Date(),
        },
      });

      sendEmail(
        user.email,
        "Benvenuto in Domy!",
        emailTemplates.welcome(user.email.split("@")[0])
      );

      const token = jwt.sign(
        { id: user.id, email: user.email, userType: "client" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" ||
          req.secure ||
          req.headers["x-forwarded-proto"] === "https",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        userType: "client",
        isClient: true,
        isProvider: false,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  }
);

// Login
router.post(
  "/login",
  authLimiter,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        res.status(400).json({ error: "Invalid credentials" });
        return;
      }

      if (!user.password) {
        res.status(400).json({ error: "Please sign in with Google" });
        return;
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        res.status(400).json({ error: "Invalid credentials" });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, userType: user.userType },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" ||
          req.secure ||
          req.headers["x-forwarded-proto"] === "https",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, userType: user.userType });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// Google Auth
router.post(
  "/auth/google",
  authLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, acceptedTerms } = req.body;

      if (!process.env.GOOGLE_CLIENT_ID) {
        console.error("GOOGLE_CLIENT_ID is not set");
        res.status(500).json({ error: "Server configuration error" });
        return;
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        res.status(400).json({ error: "Invalid Google token" });
        return;
      }

      const { email, sub: googleId } = payload;

      let user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { email },
            data: { googleId },
          });
        }
      } else {
        if (acceptedTerms !== true && acceptedTerms !== "true") {
          res.status(400).json({
            error: "Devi accettare i Termini e Condizioni per registrarti",
            code: "TERMS_REQUIRED",
          });
          return;
        }

        user = await prisma.user.create({
          data: {
            email,
            password: "",
            userType: "client",
            isClient: true,
            isProvider: false,
            acceptedTerms: true,
            createdAt: new Date(),
            googleId,
          },
        });
      }

      const jwtToken = jwt.sign(
        { id: user.id, email: user.email, userType: user.userType },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.cookie("token", jwtToken, {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" ||
          req.secure ||
          req.headers["x-forwarded-proto"] === "https",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, userType: user.userType });
    } catch (error) {
      console.error("Google Auth error:", error);
      res.status(401).json({ error: "Google authentication failed" });
    }
  }
);

// Logout
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token");
  res.json({ success: true });
});

// Get current user
router.get(
  "/me",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        userType: user.userType,
        isClient: user.isClient,
        isProvider: user.isProvider,
      });
    } catch (error) {
      console.error("Error in /api/me:", error);
      res.status(500).json({ error: "Internal server error fetching user" });
    }
  }
);

// Become a provider
router.post(
  "/become-provider",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { acceptedProviderTerms } = req.body;

      if (acceptedProviderTerms !== true && acceptedProviderTerms !== "true") {
        res
          .status(400)
          .json({ error: "You must accept the Provider Terms & Conditions" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (user.isProvider) {
        res.status(400).json({ error: "You are already a provider" });
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          isProvider: true,
          acceptedProviderTerms: true,
        },
      });

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          userType: "client",
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" ||
          req.secure ||
          req.headers["x-forwarded-proto"] === "https",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, isProvider: true });
    } catch (error) {
      console.error("Become provider error:", error);
      res.status(500).json({ error: "Failed to become provider" });
    }
  }
);

export default router;
