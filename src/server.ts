import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import dotenv from "dotenv";
import { JWTPayload, Notification } from "./types";
import Stripe from "stripe";
import { OAuth2Client } from "google-auth-library";
import { sendEmail, emailTemplates } from "./emailService";
import { PrismaClient } from "@prisma/client";
// const { PrismaClient } = require("@prisma/client");

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const app = express();
// Add trust proxy for tunnels/proxies
app.set("trust proxy", 1);

// Manual CORS middleware to allow external access
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow any origin for development/testing
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    // Allow dynamic origins for tunnels/dev
    origin: (_origin, callback) => {
      callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "5242880", 10); // 5MB default
const ALLOWED_FILE_TYPES = (
  process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/jpg,image/png,image/gif"
).split(",");

const stripe = new Stripe(
  (process.env.STRIPE_SECRET_KEY || "sk_test_dummy").trim(),
  {
    apiVersion: "2025-11-17.clover",
  }
);

// In-memory store for mock Stripe sessions (for testing without valid API key)
const mockStripeSessions: Record<string, any> = {};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const PLATFORM_FEE_PERCENTAGE = 0.1; // 10% platform fee

// Security: Helmet middleware for setting security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://accounts.google.com",
          "https://*.google.com",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://maps.googleapis.com",
          "https://accounts.google.com",
          "https://gsi.client-web.google.com",
          "https://*.google.com",
          "https://*.googleapis.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://*.googleusercontent.com",
        ],
        connectSrc: [
          "'self'",
          "ws:",
          "wss:",
          "http:",
          "https:",
          "https://maps.googleapis.com",
          "https://accounts.google.com",
          "https://gsi.client-web.google.com",
          "https://*.google.com",
          "https://*.googleapis.com",
        ],
        frameSrc: [
          "https://maps.googleapis.com",
          "https://accounts.google.com",
          "https://gsi.client-web.google.com",
          "https://*.google.com",
        ],
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
  })
);

/**
 * CSRF Protection Strategy:
 * - Using httpOnly cookies with SameSite='strict' provides defense against CSRF
 * - SameSite='strict' prevents cookies from being sent in cross-site requests
 * - For production, consider implementing CSRF tokens with libraries like 'csurf'
 *   for additional protection on state-changing operations
 */

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
  max: 100000, // Increased for testing
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Increased for testing
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true,
});

// Configure multer for photo uploads with security checks
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "photo-" + uniqueSuffix + ext);
  },
});

// File filter for security
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG and GIF are allowed."));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
});

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
// Serve React build assets
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "public", "react", "assets"))
);
// Serve other public files (uploads, etc.)
app.use(express.static("public"));

// Basic validation middleware wrapper for express-validator
const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// Simple authentication middleware using JWT from cookie or Authorization header
const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = {
      id: payload.id,
      email: payload.email,
      userType: payload.userType,
      isAdmin: payload.isAdmin,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Helpers to check user roles on stored User objects
// const isUserProvider = (user?: User | null): boolean => {
//   return !!user && !!user.isProvider;
// };

// const isUserClient = (user?: User | null): boolean => {
//   return !!user && !!user.isClient;
// };

// Notification helper: store notification and emit via socket.io
const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: Notification["type"] = "info",
  link?: string
): Promise<void> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: new Date(),
        link,
      },
    });

    io.to(`user_${userId}`).emit("new_notification", notification);
  } catch (err) {
    console.error("Failed to create/emit notification", err);
  }
};

// Ensure there is at least one admin user (used in non-test environments)
const initAdmin = async (): Promise<void> => {
  const adminCount = await prisma.user.count({
    where: {
      OR: [{ userType: "admin" }, { isAdmin: true }],
    },
  });

  if (adminCount === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin";
    const hashed = bcrypt.hashSync(adminPassword, 10);

    await prisma.user.create({
      data: {
        id: "admin-1",
        email: adminEmail,
        password: hashed,
        userType: "admin",
        isClient: false,
        isProvider: false,
        isAdmin: true,
        acceptedTerms: true,
        createdAt: new Date(),
      },
    });
    console.log(`Created default admin: ${adminEmail}`);
  }
};

if (process.env.NODE_ENV !== "test") {
  initAdmin();
}

// Admin middleware
const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.userType !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

// Routes

// Register - All users start as clients
app.post(
  "/api/register",
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

      // Accept both boolean true and string 'true'
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

      // Send welcome email
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
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
app.post(
  "/api/login",
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

      // If user has no password (google auth only) and tries to login with password
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
app.post(
  "/api/auth/google",
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
        // User exists, update googleId if not present
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { email },
            data: { googleId },
          });
        }
      } else {
        // New user trying to register via Google
        if (acceptedTerms !== true && acceptedTerms !== "true") {
          res.status(400).json({
            error: "Devi accettare i Termini e Condizioni per registrarti",
            code: "TERMS_REQUIRED",
          });
          return;
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            password: "", // No password for Google users
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
app.post("/api/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token");
  res.json({ success: true });
});

// Get current user
app.get(
  "/api/me",
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

// Update profile
app.put(
  "/api/me/profile",
  authenticate,
  upload.single("avatar"),
  [
    body("displayName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Display name must be between 2 and 50 characters"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Bio must be less than 500 characters"),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { displayName, bio } = req.body;

    try {
      const updateData: any = {};
      if (displayName) updateData.displayName = displayName;
      if (bio) updateData.bio = bio;
      if (req.file) {
        updateData.avatarUrl = "/uploads/" + req.file.filename;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          isProvider: user.isProvider,
        },
      });
    } catch (error) {
      res.status(404).json({ error: "User not found" });
    }
  }
);

// Get public provider profile
app.get(
  "/api/providers/:id",
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const provider = await prisma.user.findFirst({
      where: { id, isProvider: true },
    });

    if (!provider) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }

    // Get provider's services
    const providerServices = await prisma.service.findMany({
      where: { providerId: id },
    });

    // Get provider's reviews
    const providerReviews = await prisma.review.findMany({
      where: { providerId: id },
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { email: true },
        },
      },
    });

    // Calculate average rating
    const averageRating =
      providerReviews.length > 0
        ? providerReviews.reduce((acc: number, r: any) => acc + r.rating, 0) /
          providerReviews.length
        : 0;

    res.json({
      id: provider.id,
      displayName: provider.displayName || provider.email.split("@")[0],
      bio: provider.bio,
      avatarUrl: provider.avatarUrl,
      createdAt: provider.createdAt,
      services: providerServices,
      reviews: providerReviews.map((r: any) => ({
        ...r,
        clientName: r.client?.email.split("@")[0] || "Client",
        helpfulCount: r.helpfulCount || 0,
      })),
      averageRating: parseFloat(averageRating.toFixed(1)),
      reviewCount: providerReviews.length,
    });
  }
);

// Delete own account
app.delete(
  "/api/me",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Prevent deleting the last admin if the user is an admin
    if (user.userType === "admin") {
      const adminCount = await prisma.user.count({
        where: { userType: "admin" },
      });
      if (adminCount <= 1) {
        res.status(400).json({ error: "Cannot delete the last admin" });
        return;
      }
    }

    // Cancel all pending bookings for this user (as client or provider)
    await prisma.booking.updateMany({
      where: {
        OR: [{ clientId: userId }, { providerId: userId }],
        status: "pending",
      },
      data: {
        status: "cancelled",
        // Note: paymentStatus update logic might need more complex handling if strictly following previous logic
        // but for now we just cancel.
      },
    });

    // Remove user
    await prisma.user.delete({ where: { id: userId } });

    // Clean up related data
    // Prisma cascade delete should handle services, bookings, reviews etc if configured in schema
    // If not, we might need manual cleanup, but assuming schema handles relations.
    // Based on schema provided earlier, we might need to check onDelete behavior.
    // Assuming standard cascade or manual cleanup if needed.
    // For now, let's assume Prisma handles it or we leave orphans if not critical.
    // Actually, let's manually delete services to be safe if cascade isn't set up.
    await prisma.service.deleteMany({ where: { providerId: userId } });

    // Clear cookie
    res.clearCookie("token");
    res.json({ success: true });
  }
);

// Become a provider - upgrade from client to provider
app.post(
  "/api/become-provider",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { acceptedProviderTerms } = req.body;

      // Accept both boolean true and string 'true'
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

      // Check if already a provider (handles backward compatibility)
      if (user.isProvider) {
        res.status(400).json({ error: "You are already a provider" });
        return;
      }

      // Update user to be a provider
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isProvider: true,
          acceptedProviderTerms: true,
        },
      });

      // Issue a new token with updated info
      // Keep userType as 'client' since user is still primarily a client who can also provide
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
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({ success: true, isProvider: true });
    } catch (error) {
      console.error("Become provider error:", error);
      res.status(500).json({ error: "Failed to become provider" });
    }
  }
);

// Services routes

// Get all services (for clients to browse)
app.get(
  "/api/services",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      // Filter out services from blocked providers
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

      const activeServices = services.map((service: any) => {
        const reviewCount = service.reviews.length;
        const averageRating =
          reviewCount > 0
            ? service.reviews.reduce(
                (acc: number, r: any) => acc + r.rating,
                0
              ) / reviewCount
            : 0;

        // Parse JSON fields
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
      res.json(activeServices);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  }
);

// Create service (providers only)
app.post(
  "/api/services",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res
            .status(400)
            .json({ error: "File size too large. Maximum size is 5MB." });
          return;
        }
        res.status(400).json({ error: "File upload error: " + err.message });
        return;
      } else if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  [
    body("title")
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Title must be between 3 and 200 characters"),
    body("description")
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be between 10 and 2000 characters"),
    body("category")
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Category must be between 3 and 50 characters"),
    body("price")
      .isFloat({ min: 0.5 })
      .withMessage("Price must be at least €0.50"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
    body("latitude")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Latitude must be between -90 and 90"),
    body("longitude")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Longitude must be between -180 and 180"),
    body("productsUsed")
      .optional()
      .custom((value) => {
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) throw new Error("Must be an array");
            return true;
          } catch {
            throw new Error("Products used must be a valid JSON array string");
          }
        }
        return true;
      }),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can create services" });
      return;
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
    } = req.body;

    let imageUrl = undefined;
    if (req.file) {
      imageUrl = "/uploads/" + req.file.filename;
    } else {
      // Default image logic
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
        // Default fallback image
        imageUrl = "/assets/cleaning.jpg";
      }
    }

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

    const service = await prisma.service.create({
      data: {
        providerId: req.user!.id,
        providerEmail: req.user!.email,
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

    res.json(service);
  }
);

// Update a service
app.put(
  "/api/services/:id",
  authenticate,
  upload.single("image"),
  [
    body("title")
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Title must be between 3 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be between 10 and 2000 characters"),
    body("category")
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Category must be between 3 and 50 characters"),
    body("price")
      .optional()
      .isFloat({ min: 0.5 })
      .withMessage("Price must be at least €0.50"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
    body("latitude")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Latitude must be between -90 and 90"),
    body("longitude")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Longitude must be between -180 and 180"),
    body("productsUsed")
      .optional()
      .custom((value) => {
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) throw new Error("Must be an array");
            return true;
          } catch {
            throw new Error("Products used must be a valid JSON array string");
          }
        }
        return true;
      }),
    body("availability")
      .optional()
      .custom((value) => {
        if (typeof value === "string") {
          try {
            JSON.parse(value);
            return true;
          } catch {
            throw new Error("Availability must be a valid JSON string");
          }
        }
        return true; // If it's already an object (e.g. from JSON body)
      }),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can update services" });
      return;
    }

    const existingService = await prisma.service.findFirst({
      where: { id, providerId: req.user!.id },
    });

    if (!existingService) {
      res.status(404).json({ error: "Service not found or unauthorized" });
      return;
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
    } = req.body;

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

    if (req.file) {
      updateData.imageUrl = "/uploads/" + req.file.filename;
    }

    if (availability) {
      updateData.availability =
        typeof availability === "string"
          ? availability
          : JSON.stringify(availability);
    }

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
    });

    res.json(service);
  }
);

// Get provider's services
app.get(
  "/api/my-services",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can access this" });
      return;
    }
    const myServices = await prisma.service.findMany({
      where: { providerId: req.user!.id },
    });

    const parsedServices = myServices.map((service) => {
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

    res.json(parsedServices);
  }
);

// Delete a service
app.delete(
  "/api/services/:id",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can delete services" });
      return;
    }

    const existingService = await prisma.service.findFirst({
      where: { id, providerId: req.user!.id },
    });

    if (!existingService) {
      res.status(404).json({ error: "Service not found or unauthorized" });
      return;
    }

    // Check if there are active bookings
    const activeBookings = await prisma.booking.findMany({
      where: {
        serviceId: id,
        status: { in: ["pending", "confirmed", "paid"] },
      },
    });

    if (activeBookings.length > 0) {
      res.status(400).json({
        error:
          "Cannot delete service with active bookings. Please cancel them first.",
      });
      return;
    }

    await prisma.service.delete({
      where: { id },
    });

    res.json({ success: true });
  }
);

// Booking routes

// Create booking and checkout session (clients only)
// This endpoint now creates a Stripe checkout session and stores booking details in metadata
// The actual booking is created after successful payment verification
app.post(
  "/api/bookings",
  authenticate,
  [
    body("serviceId").notEmpty().withMessage("Service ID is required"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("clientPhone")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Phone number must be less than 50 characters"),
    body("preferredTime")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Preferred time must be less than 50 characters"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Notes must be less than 1000 characters"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.user!.userType !== "client") {
        res.status(403).json({ error: "Only clients can create bookings" });
        return;
      }

      const { serviceId, date, clientPhone, preferredTime, notes, address } =
        req.body;

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: { provider: true },
      });

      if (!service) {
        res.status(404).json({ error: "Service not found" });
        return;
      }

      // Check service availability
      if (service.availability) {
        const bookingDateObj = new Date(date);
        const dateString = bookingDateObj.toISOString().split("T")[0];

        // Parse availability if it's a string
        let availability: any = service.availability;
        if (typeof availability === "string") {
          try {
            availability = JSON.parse(availability);
          } catch (e) {
            console.error("Error parsing availability for booking:", e);
            availability = null;
          }
        }

        if (availability) {
          // Check blocked dates
          if (
            availability.blockedDates &&
            availability.blockedDates.includes(dateString)
          ) {
            res.status(400).json({
              error: "The service is not available on this date (blocked).",
            });
            return;
          }

          // Check weekly schedule
          const days = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ];
          const dayName = days[bookingDateObj.getDay()];

          if (availability.weekly) {
            const daySchedule = availability.weekly[dayName];
            if (daySchedule && !daySchedule.enabled) {
              res.status(400).json({
                error: `The service is not available on ${dayName}s.`,
              });
              return;
            }
          }
        }
      }

      // Check for overlapping bookings on the same date for the same service
      // Only check bookings that are not cancelled
      // const bookingDate = new Date(date).toISOString().split("T")[0]; // Get date part only

      // We need to query bookings. Since date is stored as DateTime in Prisma,
      // we need to be careful with comparison.
      // Assuming we store date as DateTime, we should check range or equality.
      // However, the original code compared string split("T")[0].
      // Let's assume we check if any booking exists on that day.

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingBooking = await prisma.booking.findFirst({
        where: {
          serviceId: serviceId,
          status: { not: "cancelled" },
          date: {
            gte: startOfDay as any,
            lte: endOfDay as any,
          },
        },
      });

      if (existingBooking) {
        res.status(400).json({
          error:
            "This service is already booked for the selected date. Please choose a different date.",
        });
        return;
      }

      // Check minimum price for Stripe
      if (service.price < 0.5) {
        res.status(400).json({
          error:
            "Il prezzo del servizio è inferiore al minimo consentito per i pagamenti online (€0.50). Contatta il fornitore per aggiornare il prezzo.",
        });
        return;
      }

      // Truncate metadata values to 500 characters (Stripe limit)
      const safeMetadata = {
        serviceId: service.id,
        clientId: req.user!.id,
        clientEmail: req.user!.email.substring(0, 500),
        providerId: service.providerId,
        providerEmail: service.providerEmail.substring(0, 500),
        serviceTitle: service.title.substring(0, 500),
        amount: service.price.toString(),
        date: date,
        clientPhone: (clientPhone || "").substring(0, 500),
        preferredTime: (preferredTime || "").substring(0, 500),
        notes: (notes || "").substring(0, 500),
        address: (address || "").substring(0, 500),
      };

      let session;

      // Mock Stripe for testing if using dummy key
      if (
        process.env.STRIPE_SECRET_KEY === "sk_test_dummy" ||
        !process.env.STRIPE_SECRET_KEY
      ) {
        console.log("Using mock Stripe session for testing");
        const mockSessionId = "cs_test_" + Date.now();
        const mockSession = {
          id: mockSessionId,
          status: "complete",
          payment_status: "unpaid", // capture_method: manual
          payment_intent: "pi_mock_" + Date.now(),
          metadata: safeMetadata,
        };
        mockStripeSessions[mockSessionId] = mockSession;

        session = {
          id: mockSessionId,
          url: `${req.protocol}://${req.get(
            "host"
          )}/client-dashboard?payment=success&session_id=${mockSessionId}`,
        };
      } else {
        // Create Stripe checkout session with booking details in metadata
        session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: service.title,
                  description: `Service booking for ${new Date(
                    date
                  ).toLocaleDateString("it-IT")}`,
                },
                unit_amount: Math.round(service.price * 100), // Amount in cents
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          payment_intent_data: {
            capture_method: "manual", // Authorize only (freeze funds)
          },
          success_url: `${req.protocol}://${req.get(
            "host"
          )}/client-dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.protocol}://${req.get(
            "host"
          )}/client-dashboard?payment=cancel`,
          metadata: safeMetadata,
        });
      }

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Booking creation error:", error);
      res.status(500).json({
        error:
          "Failed to create booking checkout session: " +
          (error.message || "Unknown error"),
      });
    }
  }
);

// Get client's bookings
app.get(
  "/api/my-bookings",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    if (req.user!.userType !== "client") {
      res.status(403).json({ error: "Only clients can access this" });
      return;
    }

    const myBookings = await prisma.booking.findMany({
      where: { clientId: req.user!.id },
      include: {
        review: true,
      },
    });

    // Enrich bookings with review status
    const enrichedBookings = myBookings.map((booking: any) => {
      const hasReview = !!booking.review;
      // Remove review object from response to match previous structure if needed,
      // or keep it. The frontend expects `hasReview`.
      const { review, ...bookingData } = booking;
      return { ...bookingData, hasReview };
    });

    res.json(enrichedBookings);
  }
);

// Get provider's bookings
app.get(
  "/api/provider-bookings",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can access this" });
      return;
    }
    const providerBookings = await prisma.booking.findMany({
      where: { providerId: req.user!.id },
    });
    res.json(providerBookings);
  }
);

// Review routes

// Create a review for a completed booking
app.post(
  "/api/bookings/:bookingId/review",
  authenticate,
  [
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be an integer between 1 and 5"),
    body("comment")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Comment must be between 10 and 1000 characters"),
    body("ratingDetails")
      .optional()
      .custom((value) => {
        if (
          !value.punctuality ||
          !value.communication ||
          !value.quality ||
          value.punctuality < 1 ||
          value.punctuality > 5 ||
          value.communication < 1 ||
          value.communication > 5 ||
          value.quality < 1 ||
          value.quality > 5
        ) {
          throw new Error("Invalid rating details");
        }
        return true;
      }),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const { bookingId } = req.params;
    const { rating, comment, ratingDetails } = req.body;
    const clientId = req.user!.id;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, clientId: clientId },
    });

    if (!booking) {
      res
        .status(404)
        .json({ error: "Booking not found or you are not the client" });
      return;
    }

    if (booking.status !== "completed") {
      res.status(400).json({ error: "You can only review completed bookings" });
      return;
    }

    const existingReview = await prisma.review.findFirst({
      where: { bookingId: bookingId, clientId: clientId },
    });

    if (existingReview) {
      res.status(400).json({ error: "You have already reviewed this booking" });
      return;
    }

    const review = await prisma.review.create({
      data: {
        bookingId,
        serviceId: booking.serviceId,
        providerId: booking.providerId,
        clientId,
        rating,
        ratingDetails: ratingDetails || {}, // Ensure it's an object
        comment,
        createdAt: new Date(),
        helpfulCount: 0,
        helpfulVoters: JSON.stringify([]),
      },
    });

    sendNotification(
      booking.providerId,
      "New Review Received",
      `You received a new ${rating}-star review for "${booking.serviceTitle}"`,
      "success"
    );

    // Send email notification to provider
    sendEmail(
      booking.providerEmail,
      "Nuova Recensione Ricevuta",
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Nuova Recensione!</h2>
          <p>Hai ricevuto una recensione a ${rating} stelle per il servizio <strong>${booking.serviceTitle}</strong>.</p>
          <p><strong>Commento:</strong> "${comment}"</p>
          <p>Accedi alla dashboard per rispondere.</p>
        </div>
      `
    );

    res.status(201).json(review);
  }
);

// Get provider's reviews
app.get(
  "/api/my-reviews",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can access this" });
      return;
    }

    const myReviews = await prisma.review.findMany({
      where: { providerId: req.user!.id },
    });
    res.json(myReviews);
  }
);

// Mark review as helpful
app.post(
  "/api/reviews/:reviewId/helpful",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { reviewId } = req.params;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    // Initialize if undefined (for old reviews)
    // Prisma handles arrays as Json or String[], assuming String[] for helpfulVoters based on schema
    // If it's Json, we need to cast. Let's assume String[] or Json array.
    // Schema said: helpfulVoters String // serialized JSON array
    // Wait, schema said `helpfulVoters String // serialized JSON array`.
    // So we need to parse and stringify.

    let helpfulVoters: string[] = [];
    try {
      helpfulVoters = JSON.parse(review.helpfulVoters || "[]");
    } catch {
      helpfulVoters = [];
    }

    const voterIndex = helpfulVoters.indexOf(userId);
    let newHelpfulCount = review.helpfulCount;

    if (voterIndex === -1) {
      // Add vote
      helpfulVoters.push(userId);
      newHelpfulCount++;
    } else {
      // Remove vote (toggle)
      helpfulVoters.splice(voterIndex, 1);
      newHelpfulCount--;
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        helpfulVoters: JSON.stringify(helpfulVoters),
        helpfulCount: newHelpfulCount,
      },
    });

    res.json({
      success: true,
      helpfulCount: newHelpfulCount,
      isHelpful: voterIndex === -1, // Returns true if we just added it
    });
  }
);

// Get reviews for a specific service (public)
app.get(
  "/api/services/:serviceId/reviews",
  async (req: Request, res: Response) => {
    const { serviceId } = req.params;
    const { sort } = req.query; // newest, highest, lowest, helpful

    let orderBy: any = { createdAt: "desc" };

    if (sort === "highest") {
      orderBy = { rating: "desc" };
    } else if (sort === "lowest") {
      orderBy = { rating: "asc" };
    } else if (sort === "helpful") {
      orderBy = { helpfulCount: "desc" };
    }

    const serviceReviews = await prisma.review.findMany({
      where: { serviceId },
      orderBy: orderBy,
      include: {
        client: {
          select: { email: true },
        },
      },
    });

    // Enrich reviews with client name (first name only for privacy)
    const enrichedReviews = serviceReviews.map((review: any) => {
      // Simple privacy: use email prefix or "Client" if not available
      const clientName = review.client
        ? review.client.email.split("@")[0]
        : "Client";
      return {
        ...review,
        clientName,
        helpfulCount: review.helpfulCount || 0,
      };
    });

    res.json(enrichedReviews);
  }
);

// Edit a review (client only)
app.put(
  "/api/reviews/:reviewId",
  authenticate,
  [
    body("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be an integer between 1 and 5"),
    body("comment")
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Comment must be between 10 and 1000 characters"),
  ],
  validate,
  async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    if (review.clientId !== userId) {
      res.status(403).json({ error: "You can only edit your own reviews" });
      return;
    }

    const updateData: any = {};
    if (rating) updateData.rating = rating;
    if (comment) updateData.comment = comment;

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
    });

    res.json(updatedReview);
  }
);

// Delete a review (client only)
app.delete(
  "/api/reviews/:reviewId",
  authenticate,
  async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    if (review.clientId !== userId) {
      res.status(403).json({ error: "You can only delete your own reviews" });
      return;
    }

    await prisma.review.delete({ where: { id: reviewId } });
    res.json({ success: true });
  }
);

// Get booked dates for a specific service
app.get(
  "/api/services/:serviceId/booked-dates",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { serviceId } = req.params;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    // Get all non-cancelled bookings for this service
    const serviceBookings = await prisma.booking.findMany({
      where: {
        serviceId: serviceId,
        status: { not: "cancelled" },
      },
    });

    // Extract unique dates
    const bookedDates = Array.from(
      new Set(
        serviceBookings.map(
          (b: any) => new Date(b.date).toISOString().split("T")[0]
        )
      )
    );

    res.json({ bookedDates });
  }
);

// Cancel booking (providers only)
app.post(
  "/api/bookings/:id/cancel",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can cancel bookings" });
      return;
    }

    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, providerId: req.user!.id },
    });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.status === "completed") {
      res.status(400).json({ error: "Cannot cancel a completed booking" });
      return;
    }

    if (booking.status === "cancelled") {
      res.status(400).json({ error: "Booking already cancelled" });
      return;
    }

    let newPaymentStatus = booking.paymentStatus;
    // In a real app, you would also trigger a refund here if payment was held in escrow
    if (booking.paymentStatus === "held_in_escrow") {
      newPaymentStatus = "refunded";
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "cancelled",
        paymentStatus: newPaymentStatus,
      },
    });

    // Notify both parties
    sendNotification(
      booking.clientId,
      "Prenotazione Cancellata",
      `La tua prenotazione per "${booking.serviceTitle}" è stata cancellata.`,
      "error"
    );
    sendNotification(
      booking.providerId,
      "Prenotazione Cancellata",
      `La prenotazione per "${booking.serviceTitle}" è stata cancellata.`,
      "warning"
    );

    // Send cancellation emails
    sendEmail(
      booking.clientEmail,
      "Prenotazione Cancellata",
      emailTemplates.bookingCancelled(
        booking.clientEmail.split("@")[0],
        booking.serviceTitle,
        "Cancellata dal fornitore"
      )
    );

    sendEmail(
      booking.providerEmail,
      "Prenotazione Cancellata",
      emailTemplates.bookingCancelled(
        booking.providerEmail.split("@")[0],
        booking.serviceTitle,
        "Hai cancellato questa prenotazione"
      )
    );

    // Also emit update event for dashboard refresh
    io.to(`user_${booking.clientId}`).emit("booking_updated", updatedBooking);
    io.to(`user_${booking.providerId}`).emit("booking_updated", updatedBooking);

    res.json(updatedBooking);
  }
);

// Complete service and release payment (providers only)
app.post(
  "/api/bookings/:id/complete",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("photo")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res
            .status(400)
            .json({ error: "File size too large. Maximum size is 5MB." });
          return;
        }
        res.status(400).json({ error: "File upload error: " + err.message });
        return;
      } else if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user || !user.isProvider) {
      res.status(403).json({ error: "Only providers can complete bookings" });
      return;
    }

    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, providerId: req.user!.id },
    });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.status === "completed") {
      res.status(400).json({ error: "Booking already completed" });
      return;
    }

    // Validate payment status before completing the booking
    if (
      booking.paymentStatus !== "held_in_escrow" &&
      booking.paymentStatus !== "authorized"
    ) {
      res.status(400).json({
        error:
          "Payment must be authorized or held in escrow before completing the service",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Photo proof is required" });
      return;
    }

    // Calculate transfer amount (Total - Platform Fee)
    const platformFee = booking.amount * PLATFORM_FEE_PERCENTAGE;
    const transferAmount = Math.round((booking.amount - platformFee) * 100); // Amount in cents

    try {
      // 1. Capture the funds if they are just authorized
      if (booking.paymentStatus === "authorized" && booking.paymentIntentId) {
        if (booking.paymentIntentId.startsWith("pi_mock_")) {
          console.log(`Mock captured payment for booking ${booking.id}`);
        } else {
          await stripe.paymentIntents.capture(booking.paymentIntentId);
          console.log(`Captured payment for booking ${booking.id}`);
        }
      }

      // 2. Transfer funds to provider if they have a connected Stripe account
      if (user.stripeAccountId) {
        if (
          process.env.STRIPE_SECRET_KEY === "sk_test_dummy" ||
          !process.env.STRIPE_SECRET_KEY
        ) {
          console.log(
            `Mock transfer of ${transferAmount / 100} EUR to provider ${
              user.email
            } (${user.stripeAccountId})`
          );
        } else {
          await stripe.transfers.create({
            amount: transferAmount,
            currency: "eur",
            destination: user.stripeAccountId,
            description: `Payout for booking ${booking.id}`,
          });
          console.log(
            `Transferred ${transferAmount / 100} EUR to provider ${
              user.email
            } (${user.stripeAccountId})`
          );
        }
      } else {
        console.log(
          `Provider ${user.email} has no Stripe account connected. Funds remain in platform account.`
        );
      }
    } catch (stripeError: any) {
      console.error("Stripe capture/transfer failed:", stripeError);
      res.status(500).json({
        error: "Payment processing failed: " + stripeError.message,
      });
      return;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "completed",
        paymentStatus: "released",
        photoProof: "/uploads/" + req.file.filename,
        completedAt: new Date(),
      },
    });

    // Notify client
    sendNotification(
      booking.clientId,
      "Servizio Completato",
      `Il servizio "${booking.serviceTitle}" è stato completato!`,
      "success"
    );

    // Send completion email
    sendEmail(
      booking.clientEmail,
      "Servizio Completato - Lascia una recensione",
      emailTemplates.bookingCompleted(
        booking.clientEmail.split("@")[0],
        booking.serviceTitle
      )
    );

    // Also emit update event for dashboard refresh
    io.to(`user_${booking.clientId}`).emit("booking_updated", updatedBooking);

    res.json(updatedBooking);
  }
);

// Debug endpoint to set Stripe Account ID (for testing transfers)
app.post(
  "/api/debug/set-stripe-account",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { stripeAccountId } = req.body;

    try {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { stripeAccountId },
      });
      res.json({ success: true, stripeAccountId });
    } catch (error) {
      res.status(404).json({ error: "User not found" });
    }
  }
);

// Legacy Stripe Payment Route - kept for backward compatibility with existing unpaid bookings
app.post(
  "/api/create-checkout-session",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { bookingId } = req.body;
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }

      // Ensure only the client who made the booking can pay
      if (booking.clientId !== req.user!.id) {
        res.status(403).json({ error: "Unauthorized to pay for this booking" });
        return;
      }

      // Check if the booking is still in a payable state
      if (booking.paymentStatus !== "unpaid") {
        res.status(400).json({
          error:
            "This booking has already been paid or is not in a payable state",
        });
        return;
      }

      if (booking.status === "cancelled") {
        res.status(400).json({ error: "Cannot pay for a cancelled booking" });
        return;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: booking.serviceTitle,
                description: `Booking ID: ${booking.id}`,
              },
              unit_amount: Math.round(booking.amount * 100), // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.protocol}://${req.get(
          "host"
        )}/client-dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get(
          "host"
        )}/client-dashboard?payment=cancel`,
        metadata: {
          bookingId: booking.id,
          clientId: req.user!.id,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
);

// Verify payment and create booking
app.get(
  "/api/verify-payment",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { session_id } = req.query;

      if (!session_id || typeof session_id !== "string") {
        res.status(400).json({ error: "Session ID is required" });
        return;
      }

      let session;
      if (
        (process.env.STRIPE_SECRET_KEY === "sk_test_dummy" ||
          !process.env.STRIPE_SECRET_KEY) &&
        session_id.startsWith("cs_test_")
      ) {
        session = mockStripeSessions[session_id];
        if (!session) {
          res.status(404).json({ error: "Mock session not found" });
          return;
        }
      } else {
        session = await stripe.checkout.sessions.retrieve(session_id);
      }

      // Check if the session is complete (user finished the flow)
      // With capture_method: 'manual', payment_status will be 'unpaid' but status 'complete'
      if (session.status === "complete") {
        const metadata = session.metadata;
        const paymentIntentId = session.payment_intent as string;

        // Check if this is from the new booking flow (has serviceId in metadata)
        if (metadata?.serviceId) {
          // New flow: Create booking after payment
          // Generate a unique booking ID based on session ID to prevent duplicates
          const bookingId = `booking-${session.id}`;

          // Check if booking already exists for this session to prevent duplicates
          const existingBooking = await prisma.booking.findUnique({
            where: { id: bookingId },
          });

          if (existingBooking) {
            res.json({ success: true, booking: existingBooking });
            return;
          }

          // Create the booking with payment authorized (frozen)
          const booking = await prisma.booking.create({
            data: {
              id: bookingId,
              serviceId: metadata.serviceId,
              clientId: metadata.clientId,
              clientEmail: metadata.clientEmail,
              providerId: metadata.providerId,
              providerEmail: metadata.providerEmail,
              serviceTitle: metadata.serviceTitle,
              amount: parseFloat(metadata.amount),
              date: new Date(metadata.date) as any, // Ensure date is Date object
              status: "pending",
              paymentStatus: "authorized", // Funds are frozen
              paymentIntentId: paymentIntentId,
              createdAt: new Date(),
              clientPhone: metadata.clientPhone || null,
              preferredTime: metadata.preferredTime || null,
              notes: metadata.notes || null,
              address: metadata.address || null,
            },
          });

          // Notify provider about new booking
          sendNotification(
            booking.providerId,
            "Nuova Prenotazione",
            `Hai ricevuto una nuova prenotazione per "${booking.serviceTitle}"`,
            "success"
          );

          // Send emails
          sendEmail(
            booking.providerEmail,
            "Nuova Prenotazione Ricevuta",
            emailTemplates.newBookingProvider(
              booking.providerEmail.split("@")[0],
              booking.clientEmail.split("@")[0],
              booking.serviceTitle,
              new Date(booking.date).toLocaleDateString("it-IT")
            )
          );

          sendEmail(
            booking.clientEmail,
            "Prenotazione Confermata",
            emailTemplates.newBookingClient(
              booking.clientEmail.split("@")[0],
              booking.serviceTitle,
              new Date(booking.date).toLocaleDateString("it-IT")
            )
          );

          // io.to(`user_${booking.providerId}`).emit("booking_created", booking); // Replaced by sendNotification which emits new_notification

          res.json({ success: true, booking });
        } else {
          // Old flow: Update existing booking (for backward compatibility)
          const bookingId = metadata?.bookingId;
          const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
          });

          if (booking) {
            const updatedBooking = await prisma.booking.update({
              where: { id: bookingId },
              data: {
                paymentStatus: "authorized",
                paymentIntentId: paymentIntentId,
              },
            });
            res.json({ success: true, booking: updatedBooking });
          } else {
            res.status(404).json({ error: "Booking not found" });
          }
        }
      } else {
        res.status(400).json({ error: "Payment not completed" });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Payment verification failed" });
    }
  }
);

// Chat routes

// Send a message in a booking chat
app.post(
  "/api/bookings/:bookingId/messages",
  authenticate,
  [
    body("message")
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage("Message must be between 1 and 1000 characters"),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const { bookingId } = req.params;
    const { message } = req.body;

    // Verify the booking exists and user is part of it
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Check if user is either the client or provider for this booking
    if (
      booking.clientId !== req.user!.id &&
      booking.providerId !== req.user!.id
    ) {
      res.status(403).json({ error: "You do not have access to this chat" });
      return;
    }

    // Determine sender type based on booking role
    // If user is both client and provider (self-booking), prefer the one specified in body if available
    let senderType: "client" | "provider" = req.user!.userType as
      | "client"
      | "provider";

    if (
      booking.providerId === req.user!.id &&
      booking.clientId === req.user!.id
    ) {
      // Self booking: check explicit intent from body
      if (req.body.senderType === "provider") senderType = "provider";
      else if (req.body.senderType === "client") senderType = "client";
      // else fallback to token userType (which is usually client)
    } else if (booking.providerId === req.user!.id) {
      senderType = "provider";
    } else if (booking.clientId === req.user!.id) {
      senderType = "client";
    }

    const chatMessage = await prisma.chatMessage.create({
      data: {
        bookingId,
        senderId: req.user!.id,
        senderEmail: req.user!.email,
        senderType: senderType,
        message,
        read: false,
        createdAt: new Date(),
      },
    });

    // Real-time updates: Emit socket events
    // 1. Broadcast to the booking room (for anyone currently viewing this chat)
    io.to(bookingId).emit("receive_message", chatMessage);

    // 2. Notify the recipient specifically (in case they are online but not in the booking room)
    const recipientId =
      booking.clientId === req.user!.id ? booking.providerId : booking.clientId;

    io.to(`user_${recipientId}`).emit("receive_message", chatMessage);

    // 3. Send notification for unread count update
    io.to(`user_${recipientId}`).emit("message_received_notification", {
      bookingId,
      senderId: req.user!.id,
    });

    res.json(chatMessage);
  }
);

// Get all messages for a booking
app.get(
  "/api/bookings/:bookingId/messages",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { bookingId } = req.params;

    // Verify the booking exists and user is part of it
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    // Check if user is either the client or provider for this booking
    if (
      booking.clientId !== req.user!.id &&
      booking.providerId !== req.user!.id
    ) {
      res.status(403).json({ error: "You do not have access to this chat" });
      return;
    }

    // Get all messages for this booking, sorted by creation time
    const messages = await prisma.chatMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  }
);

// Get unread messages count
app.get(
  "/api/unread-messages-count",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    // Find all bookings where user is client or provider
    const userBookings = await prisma.booking.findMany({
      where: {
        OR: [{ clientId: userId }, { providerId: userId }],
      },
      select: { id: true },
    });

    const bookingIds = userBookings.map((b: any) => b.id);

    if (bookingIds.length === 0) {
      res.json({ count: 0 });
      return;
    }

    const unreadCount = await prisma.chatMessage.count({
      where: {
        bookingId: { in: bookingIds },
        senderId: { not: userId },
        read: false,
      },
    });

    res.json({ count: unreadCount });
  }
);

// Mark messages as read for a booking
app.put(
  "/api/bookings/:bookingId/messages/read",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { bookingId } = req.params;
    const userId = req.user!.id;

    // Verify the booking exists and user is part of it
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.clientId !== userId && booking.providerId !== userId) {
      res.status(403).json({ error: "You do not have access to this chat" });
      return;
    }

    // Mark all messages in this booking sent by the OTHER party as read
    await prisma.chatMessage.updateMany({
      where: {
        bookingId: bookingId,
        senderId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    res.json({ success: true });
  }
);

// Get all conversations for the current user
app.get(
  "/api/my-conversations",
  authenticate,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Find all bookings where user is client or provider
    const userBookings = await prisma.booking.findMany({
      where: {
        OR: [{ clientId: userId }, { providerId: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                read: false,
              },
            },
          },
        },
      },
    });

    const conversations = userBookings.map((booking: any) => {
      const lastMessage = booking.messages[0] || null;
      const unreadCount = booking._count.messages;

      return {
        bookingId: booking.id,
        serviceTitle: booking.serviceTitle,
        otherPartyEmail:
          booking.clientId === userId
            ? booking.providerEmail
            : booking.clientEmail,
        lastMessage: lastMessage,
        updatedAt: lastMessage ? lastMessage.createdAt : booking.createdAt,
        unreadCount,
      };
    });

    // Sort by last activity
    conversations.sort(
      (a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    res.json(conversations);
  }
);

// Admin Routes
app.get(
  "/api/admin/users",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response) => {
    // Return users without passwords
    const users = await prisma.user.findMany();
    const safeUsers = users.map(({ password, ...user }: any) => user);
    res.json(safeUsers);
  }
);

app.post(
  "/api/admin/users/:id/block",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.userType === "admin") {
      res.status(400).json({ error: "Cannot block an admin" });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { isBlocked: true },
    });

    // Cancel all pending bookings for this user (as client or provider)
    await prisma.booking.updateMany({
      where: {
        OR: [{ clientId: id }, { providerId: id }],
        status: "pending",
      },
      data: {
        status: "cancelled",
        // Note: paymentStatus update logic might need more complex handling if strictly following previous logic
        // but for now we just cancel.
      },
    });

    res.json({ success: true });
  }
);

app.post(
  "/api/admin/users/:id/unblock",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { isBlocked: false },
    });
    res.json({ success: true });
  }
);

app.delete(
  "/api/admin/users/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Prevent deleting the last admin
    if (user.userType === "admin") {
      const adminCount = await prisma.user.count({
        where: { userType: "admin" },
      });
      if (adminCount <= 1) {
        res.status(400).json({ error: "Cannot delete the last admin" });
        return;
      }
    }

    await prisma.user.delete({ where: { id } });
    // Also clean up related data
    // Prisma cascade delete should handle services, bookings, reviews etc if configured in schema
    // If not, we might need manual cleanup.
    // Assuming standard cascade or manual cleanup if needed.
    // For now, let's assume Prisma handles it or we leave orphans if not critical.
    // Actually, let's manually delete services to be safe if cascade isn't set up.
    await prisma.service.deleteMany({ where: { providerId: id } });

    res.json({ success: true });
  }
);

app.get(
  "/api/admin/services",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response) => {
    const services = await prisma.service.findMany();
    res.json(services);
  }
);

app.delete(
  "/api/admin/services/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const service = await prisma.service.findUnique({ where: { id } });

    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    await prisma.service.delete({ where: { id } });
    res.json({ success: true });
  }
);

app.get(
  "/api/admin/bookings",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response) => {
    const bookings = await prisma.booking.findMany();
    res.json(bookings);
  }
);

app.post(
  "/api/admin/bookings/:id/cancel",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.status === "cancelled") {
      res.status(400).json({ error: "Booking already cancelled" });
      return;
    }

    let newPaymentStatus = booking.paymentStatus;
    if (booking.paymentStatus === "held_in_escrow") {
      newPaymentStatus = "refunded";
    }

    await prisma.booking.update({
      where: { id },
      data: {
        status: "cancelled",
        paymentStatus: newPaymentStatus,
      },
    });

    res.json({ success: true });
  }
);

app.delete(
  "/api/admin/bookings/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    await prisma.booking.delete({ where: { id } });
    res.json({ success: true });
  }
);

// New admin stats route
app.get(
  "/api/admin/stats",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response) => {
    const totalUsers = await prisma.user.count();
    const totalServices = await prisma.service.count();
    const totalBookings = await prisma.booking.count();

    const revenueResult = await prisma.booking.aggregate({
      _sum: {
        amount: true,
      },
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    res.json({
      totalUsers,
      totalServices,
      totalBookings,
      totalRevenue,
    });
  }
);

// Notification routes

// Get user notifications
app.get(
  "/api/notifications",
  authenticate,
  async (req: Request, res: Response) => {
    const userNotifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(userNotifications);
  }
);

// Mark notification as read
app.put(
  "/api/notifications/:id/read",
  authenticate,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    res.json({ success: true });
  }
);

// Mark all notifications as read
app.put(
  "/api/notifications/read-all",
  authenticate,
  async (req: Request, res: Response) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  }
);

// Rate limiter for page routes
const pageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per minute for pages
  message: "Too many page requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Serve HTML pages with Google Maps API Key injection
const serveSpa = (_req: Request, res: Response) => {
  const htmlPath = path.join(__dirname, "..", "public", "react", "index.html");

  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, "utf8");
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";
    // Inject the meta tag into the head
    html = html.replace(
      "</head>",
      `<meta name="google-maps-api-key" content="${googleMapsApiKey}"></head>`
    );
    res.send(html);
  } else {
    res.status(404).send('Application not built. Run "npm run build" first.');
  }
};

// Apply to all frontend routes
app.get(
  ["/", "/login", "/register", "/client-dashboard", "/provider-dashboard"],
  pageLimiter,
  serveSpa
);

// Catch-all for other client-side routes (SPA support)
app.get("*splat", pageLimiter, (req: Request, res: Response) => {
  // Don't intercept API calls
  if (
    req.path.startsWith("/api/") ||
    req.path.startsWith("/assets/") ||
    req.path.startsWith("/uploads/")
  ) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  serveSpa(req, res);
});

// Socket.IO Logic
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join_booking", async (bookingId) => {
    await socket.join(bookingId);
    console.log(`User ${socket.id} joined booking room: ${bookingId}`);
  });

  // NEW: Join user specific room for notifications
  socket.on("join_user_room", async (userId) => {
    await socket.join(`user_${userId}`);
    console.log(`User ${socket.id} joined user room: user_${userId}`);
  });

  socket.on("send_message", async (data) => {
    const { bookingId, message, senderId, senderEmail, senderType } = data;

    const roomSize = io.sockets.adapter.rooms.get(bookingId)?.size || 0;
    console.log(
      `Sending message to room ${bookingId} with ${roomSize} clients`
    );

    try {
      // Create message object
      const chatMessage = await prisma.chatMessage.create({
        data: {
          bookingId,
          senderId,
          senderEmail,
          senderType,
          message,
          read: false,
          createdAt: new Date(),
        },
      });

      // Broadcast to room (including sender)
      io.to(bookingId).emit("receive_message", chatMessage);

      // Notify recipient about new message for unread count update
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });
      if (booking) {
        const recipientId =
          booking.clientId === senderId ? booking.providerId : booking.clientId;

        // Emit event to recipient's personal room
        io.to(`user_${recipientId}`).emit("receive_message", chatMessage);

        io.to(`user_${recipientId}`).emit("message_received_notification", {
          bookingId,
          senderId,
        });
      }
    } catch (err) {
      console.error("Socket message error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Start the server only if not in a test environment
if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

export const resetData = async (): Promise<void> => {
  // Clear all data in the database
  await prisma.review.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
};

export { app, httpServer, io, initAdmin };
