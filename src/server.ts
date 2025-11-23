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
import {
  User,
  Service,
  Booking,
  JWTPayload,
  ChatMessage,
  Notification,
  Review,
} from "./types";
import Stripe from "stripe";
import { OAuth2Client } from "google-auth-library";

// Load environment variables
dotenv.config();

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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover",
});

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
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs (increased for testing)
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

// In-memory database (replace with a real database in production)
let users: User[] = [];
let services: Service[] = [];
let bookings: Booking[] = [];
let chatMessages: ChatMessage[] = [];
let notifications: Notification[] = [];
let reviews: Review[] = [];

// Ensure data directory exists
const ensureDataDir = (): void => {
  if (!fs.existsSync("data")) {
    fs.mkdirSync("data", { recursive: true });
  }
};

// Load data from files if they exist
const loadData = (): void => {
  try {
    ensureDataDir();
    if (fs.existsSync("data/users.json")) {
      const data = fs.readFileSync("data/users.json", "utf8");
      users = JSON.parse(data);
    }
    if (fs.existsSync("data/services.json")) {
      const data = fs.readFileSync("data/services.json", "utf8");
      services = JSON.parse(data);
    }
    if (fs.existsSync("data/bookings.json")) {
      const data = fs.readFileSync("data/bookings.json", "utf8");
      bookings = JSON.parse(data);
    }
    if (fs.existsSync("data/chatMessages.json")) {
      const data = fs.readFileSync("data/chatMessages.json", "utf8");
      chatMessages = JSON.parse(data);
    }
    if (fs.existsSync("data/notifications.json")) {
      const data = fs.readFileSync("data/notifications.json", "utf8");
      notifications = JSON.parse(data);
    }
    if (fs.existsSync("data/reviews.json")) {
      const data = fs.readFileSync("data/reviews.json", "utf8");
      reviews = JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
};

// Save data to files
const saveData = (): void => {
  try {
    ensureDataDir();
    fs.writeFileSync("data/users.json", JSON.stringify(users, null, 2));
    fs.writeFileSync("data/services.json", JSON.stringify(services, null, 2));
    fs.writeFileSync("data/bookings.json", JSON.stringify(bookings, null, 2));
    fs.writeFileSync(
      "data/chatMessages.json",
      JSON.stringify(chatMessages, null, 2)
    );
    fs.writeFileSync(
      "data/notifications.json",
      JSON.stringify(notifications, null, 2)
    );
    fs.writeFileSync("data/reviews.json", JSON.stringify(reviews, null, 2));
  } catch (error) {
    console.error("Error saving data:", error);
  }
};

loadData();

// Helper to create and send notification
const sendNotification = (
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string
) => {
  const notification: Notification = {
    id:
      Date.now().toString() + "-" + Math.random().toString(36).substring(2, 11),
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    link,
  };

  notifications.push(notification);
  saveData();

  // Emit real-time event
  io.to(`user_${userId}`).emit("new_notification", notification);

  return notification;
};

// Authentication middleware
const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.cookies.token;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Validation middleware helper
const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// Helper function to check if user is a provider (handles backward compatibility)
const isUserProvider = (user: User): boolean => {
  return user.isProvider !== undefined
    ? user.isProvider
    : user.userType === "provider";
};

// Helper function to check if user is a client (handles backward compatibility)
const isUserClient = (user: User): boolean => {
  return user.isClient !== undefined
    ? user.isClient
    : user.userType === "client";
};

// Initialize default admin if not exists
const initAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const adminExists = users.find((u) => u.email === adminEmail);
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const adminUser: User = {
      id: "admin-user-id",
      email: adminEmail,
      password: hashedPassword,
      userType: "admin",
      isClient: false,
      isProvider: false,
      isAdmin: true,
      acceptedTerms: true,
      createdAt: new Date().toISOString(),
    };
    users.push(adminUser);
    saveData();
    console.log(`Admin user created: ${adminEmail}`);
  }
};
initAdmin();

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

      if (users.find((u) => u.email === email)) {
        res.status(400).json({ error: "User already exists" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user: User = {
        id:
          Date.now().toString() +
          "-" +
          Math.random().toString(36).substring(2, 11),
        email,
        password: hashedPassword,
        userType: "client", // All users start as clients
        isClient: true,
        isProvider: false,
        acceptedTerms: true,
        createdAt: new Date().toISOString(),
      };

      users.push(user);
      saveData();

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
      const user = users.find((u) => u.email === email);

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

      let user = users.find((u) => u.email === email);

      if (user) {
        // User exists, update googleId if not present
        if (!user.googleId) {
          user.googleId = googleId;
          saveData();
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
        user = {
          id:
            Date.now().toString() +
            "-" +
            Math.random().toString(36).substring(2, 11),
          email,
          password: "", // No password for Google users
          userType: "client",
          isClient: true,
          isProvider: false,
          acceptedTerms: true,
          createdAt: new Date().toISOString(),
          googleId,
        };
        users.push(user);
        saveData();
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
app.get("/api/me", authenticate, (req: Request, res: Response): void => {
  const user = users.find((u) => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    userType: user.userType,
    isClient: isUserClient(user),
    isProvider: isUserProvider(user),
  });
});

// Delete own account
app.delete("/api/me", authenticate, (req: Request, res: Response): void => {
  const userId = req.user!.id;
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Prevent deleting the last admin if the user is an admin
  if (
    users[userIndex].userType === "admin" &&
    users.filter((u) => u.userType === "admin").length <= 1
  ) {
    res.status(400).json({ error: "Cannot delete the last admin" });
    return;
  }

  // Cancel all pending bookings for this user (as client or provider)
  bookings.forEach((booking) => {
    if (
      (booking.clientId === userId || booking.providerId === userId) &&
      booking.status === "pending"
    ) {
      booking.status = "cancelled";
      if (booking.paymentStatus === "held_in_escrow") {
        booking.paymentStatus = "refunded";
      }
    }
  });

  // Remove user
  users.splice(userIndex, 1);

  // Clean up related data
  // Remove services created by this user
  services = services.filter((s) => s.providerId !== userId);

  // Note: We keep completed/cancelled bookings for historical records,
  // but in a real app you might want to anonymize them or handle them differently.

  saveData();

  // Clear cookie
  res.clearCookie("token");
  res.json({ success: true });
});

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

      const userIndex = users.findIndex((u) => u.id === req.user!.id);
      if (userIndex === -1) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const user = users[userIndex];

      // Check if already a provider (handles backward compatibility)
      if (isUserProvider(user)) {
        res.status(400).json({ error: "You are already a provider" });
        return;
      }

      // Update user to be a provider
      users[userIndex] = {
        ...user,
        isProvider: true,
        acceptedProviderTerms: true,
      };

      saveData();

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
app.get("/api/services", (_req: Request, res: Response): void => {
  // Filter out services from blocked providers
  const activeServices = services
    .filter((service) => {
      const provider = users.find((u) => u.id === service.providerId);
      return provider && !provider.isBlocked;
    })
    .map((service) => {
      const serviceReviews = reviews.filter(
        (r) => r.serviceId === service.id
      );
      const reviewCount = serviceReviews.length;
      const averageRating =
        reviewCount > 0
          ? serviceReviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount
          : 0;
      return {
        ...service,
        reviewCount,
        averageRating: parseFloat(averageRating.toFixed(1)),
      };
    });
  res.json(activeServices);
});

// Create service (providers only)
app.post(
  "/api/services",
  authenticate,
  [
    body("title")
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage("Title must be between 3 and 200 characters"),
    body("description")
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be between 10 and 2000 characters"),
    body("price")
      .isFloat({ min: 0.01 })
      .withMessage("Price must be a positive number"),
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
  ],
  validate,
  (req: Request, res: Response): void => {
    const user = users.find((u) => u.id === req.user!.id);

    if (!user || !isUserProvider(user)) {
      res.status(403).json({ error: "Only providers can create services" });
      return;
    }

    const { title, description, price, address, latitude, longitude } =
      req.body;
    const service: Service = {
      id:
        Date.now().toString() +
        "-" +
        Math.random().toString(36).substring(2, 11),
      providerId: req.user!.id,
      providerEmail: req.user!.email,
      title,
      description,
      price: parseFloat(price),
      address: address || undefined,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      createdAt: new Date().toISOString(),
    };

    services.push(service);
    saveData();
    res.json(service);
  }
);

// Get provider's services
app.get(
  "/api/my-services",
  authenticate,
  (req: Request, res: Response): void => {
    const user = users.find((u) => u.id === req.user!.id);

    if (!user || !isUserProvider(user)) {
      res.status(403).json({ error: "Only providers can access this" });
      return;
    }
    const myServices = services.filter((s) => s.providerId === req.user!.id);
    res.json(myServices);
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
      const service = services.find((s) => s.id === serviceId);

      if (!service) {
        res.status(404).json({ error: "Service not found" });
        return;
      }

      // Check for overlapping bookings on the same date for the same service
      // Only check bookings that are not cancelled
      const bookingDate = new Date(date).toISOString().split("T")[0]; // Get date part only
      const existingBooking = bookings.find(
        (b) =>
          b.serviceId === serviceId &&
          b.status !== "cancelled" &&
          new Date(b.date).toISOString().split("T")[0] === bookingDate
      );

      if (existingBooking) {
        res.status(400).json({
          error:
            "This service is already booked for the selected date. Please choose a different date.",
        });
        return;
      }

      // Create Stripe checkout session with booking details in metadata
      const session = await stripe.checkout.sessions.create({
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
        metadata: {
          serviceId: service.id,
          clientId: req.user!.id,
          clientEmail: req.user!.email,
          providerId: service.providerId,
          providerEmail: service.providerEmail,
          serviceTitle: service.title,
          amount: service.price.toString(),
          date: date,
          clientPhone: clientPhone || "",
          preferredTime: preferredTime || "",
          notes: notes || "",
          address: address || "",
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error) {
      console.error("Booking creation error:", error);
      res
        .status(500)
        .json({ error: "Failed to create booking checkout session" });
    }
  }
);

// Get client's bookings
app.get(
  "/api/my-bookings",
  authenticate,
  (req: Request, res: Response): void => {
    if (req.user!.userType !== "client") {
      res.status(403).json({ error: "Only clients can access this" });
      return;
    }
    const myBookings = bookings.filter((b) => b.clientId === req.user!.id);
    res.json(myBookings);
  }
);

// Get provider's bookings
app.get(
  "/api/provider-bookings",
  authenticate,
  (req: Request, res: Response): void => {
    const user = users.find((u) => u.id === req.user!.id);

    if (!user || !isUserProvider(user)) {
      res.status(403).json({ error: "Only providers can access this" });
      return;
    }
    const providerBookings = bookings.filter(
      (b) => b.providerId === req.user!.id
    );
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
  ],
  validate,
  (req: Request, res: Response): void => {
    const { bookingId } = req.params;
    const { rating, comment } = req.body;
    const clientId = req.user!.id;

    const booking = bookings.find(
      (b) => b.id === bookingId && b.clientId === clientId
    );

    if (!booking) {
      res
        .status(404)
        .json({ error: "Booking not found or you are not the client" });
      return;
    }

    if (booking.status !== "completed") {
      res
        .status(400)
        .json({ error: "You can only review completed bookings" });
      return;
    }

    const existingReview = reviews.find(
      (r) => r.bookingId === bookingId && r.clientId === clientId
    );

    if (existingReview) {
      res.status(400).json({ error: "You have already reviewed this booking" });
      return;
    }

    const review: Review = {
      id:
        Date.now().toString() +
        "-" +
        Math.random().toString(36).substring(2, 11),
      bookingId,
      serviceId: booking.serviceId,
      providerId: booking.providerId,
      clientId,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };

    reviews.push(review);
    saveData();

    sendNotification(
      booking.providerId,
      "New Review Received",
      `You received a new ${rating}-star review for "${booking.serviceTitle}"`,
      "success"
    );

    res.status(201).json(review);
  }
);

// Get provider's reviews
app.get(
  "/api/my-reviews",
  authenticate,
  (req: Request, res: Response): void => {
    const user = users.find((u) => u.id === req.user!.id);

    if (!user || !isUserProvider(user)) {
      res.status(403).json({ error: "Only providers can access this" });
      return;
    }

    const myReviews = reviews.filter((r) => r.providerId === req.user!.id);
    res.json(myReviews);
  }
);


// Get booked dates for a specific service
app.get(
  "/api/services/:serviceId/booked-dates",
  authenticate,
  (req: Request, res: Response): void => {
    const { serviceId } = req.params;

    const service = services.find((s) => s.id === serviceId);

    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    // Get all non-cancelled bookings for this service
    const serviceBookings = bookings.filter(
      (b) => b.serviceId === serviceId && b.status !== "cancelled"
    );

    // Extract unique dates
    const bookedDates = Array.from(
      new Set(
        serviceBookings.map((b) => new Date(b.date).toISOString().split("T")[0])
      )
    );

    res.json({ bookedDates });
  }
);

// Cancel booking (providers only)
app.post(
  "/api/bookings/:id/cancel",
  authenticate,
  (req: Request, res: Response): void => {
    const user = users.find((u) => u.id === req.user!.id);

    if (!user || !isUserProvider(user)) {
      res.status(403).json({ error: "Only providers can cancel bookings" });
      return;
    }

    const booking = bookings.find(
      (b) => b.id === req.params.id && b.providerId === req.user!.id
    );

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

    booking.status = "cancelled";
    // In a real app, you would also trigger a refund here if payment was held in escrow
    if (booking.paymentStatus === "held_in_escrow") {
      booking.paymentStatus = "refunded";
    }

    saveData();

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

    // Also emit update event for dashboard refresh
    io.to(`user_${booking.clientId}`).emit("booking_updated", booking);
    io.to(`user_${booking.providerId}`).emit("booking_updated", booking);

    res.json(booking);
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
    const user = users.find((u) => u.id === req.user!.id);

    if (!user || !isUserProvider(user)) {
      res.status(403).json({ error: "Only providers can complete bookings" });
      return;
    }

    const booking = bookings.find(
      (b) => b.id === req.params.id && b.providerId === req.user!.id
    );

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
        await stripe.paymentIntents.capture(booking.paymentIntentId);
        console.log(`Captured payment for booking ${booking.id}`);
      }

      // 2. Transfer funds to provider if they have a connected Stripe account
      if (user.stripeAccountId) {
        await stripe.transfers.create({
          amount: transferAmount,
          currency: "eur",
          destination: user.stripeAccountId,
          description: `Payout for booking ${booking.id}`,
        });
        console.log(
          `Transferred ${transferAmount / 100} EUR to provider ${user.email} (${
            user.stripeAccountId
          })`
        );
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

    booking.status = "completed";
    booking.paymentStatus = "released";
    booking.photoProof = "/uploads/" + req.file.filename;
    booking.completedAt = new Date().toISOString();

    saveData();

    // Notify client
    sendNotification(
      booking.clientId,
      "Servizio Completato",
      `Il servizio "${booking.serviceTitle}" è stato completato!`,
      "success"
    );

    // Also emit update event for dashboard refresh
    io.to(`user_${booking.clientId}`).emit("booking_updated", booking);

    res.json(booking);
  }
);

// Debug endpoint to set Stripe Account ID (for testing transfers)
app.post(
  "/api/debug/set-stripe-account",
  authenticate,
  (req: Request, res: Response): void => {
    const { stripeAccountId } = req.body;
    const userIndex = users.findIndex((u) => u.id === req.user!.id);

    if (userIndex === -1) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    users[userIndex].stripeAccountId = stripeAccountId;
    saveData();
    res.json({ success: true, stripeAccountId });
  }
);

// Legacy Stripe Payment Route - kept for backward compatibility with existing unpaid bookings
// For new bookings, payment is handled directly in the /api/bookings endpoint
app.post(
  "/api/create-checkout-session",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { bookingId } = req.body;
      const booking = bookings.find((b) => b.id === bookingId);

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

      const session = await stripe.checkout.sessions.retrieve(session_id);

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
          const existingBooking = bookings.find((b) => b.id === bookingId);

          if (existingBooking) {
            res.json({ success: true, booking: existingBooking });
            return;
          }

          // Create the booking with payment authorized (frozen)
          const booking: Booking = {
            id: bookingId,
            serviceId: metadata.serviceId,
            clientId: metadata.clientId,
            clientEmail: metadata.clientEmail,
            providerId: metadata.providerId,
            providerEmail: metadata.providerEmail,
            serviceTitle: metadata.serviceTitle,
            amount: parseFloat(metadata.amount),
            date: metadata.date,
            status: "pending",
            paymentStatus: "authorized", // Funds are frozen
            paymentIntentId: paymentIntentId,
            photoProof: null,
            createdAt: new Date().toISOString(),
            clientPhone: metadata.clientPhone
              ? metadata.clientPhone
              : undefined,
            preferredTime: metadata.preferredTime
              ? metadata.preferredTime
              : undefined,
            notes: metadata.notes ? metadata.notes : undefined,
            address: metadata.address ? metadata.address : undefined,
          };

          bookings.push(booking);
          saveData();

          // Notify provider about new booking
          sendNotification(
            booking.providerId,
            "Nuova Prenotazione",
            `Hai ricevuto una nuova prenotazione per "${booking.serviceTitle}"`,
            "success"
          );
          // io.to(`user_${booking.providerId}`).emit("booking_created", booking); // Replaced by sendNotification which emits new_notification

          res.json({ success: true, booking });
        } else {
          // Old flow: Update existing booking (for backward compatibility)
          const bookingId = metadata?.bookingId;
          const booking = bookings.find((b) => b.id === bookingId);

          if (booking) {
            booking.paymentStatus = "authorized";
            booking.paymentIntentId = paymentIntentId;
            saveData();
            res.json({ success: true, booking });
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
  (req: Request, res: Response): void => {
    const { bookingId } = req.params;
    const { message } = req.body;

    // Verify the booking exists and user is part of it
    const booking = bookings.find((b) => b.id === bookingId);

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

    const chatMessage: ChatMessage = {
      id:
        Date.now().toString() +
        "-" +
        Math.random().toString(36).substring(2, 11),
      bookingId,
      senderId: req.user!.id,
      senderEmail: req.user!.email,
      senderType: senderType,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };

    chatMessages.push(chatMessage);
    saveData();
    res.json(chatMessage);
  }
);

// Get all messages for a booking
app.get(
  "/api/bookings/:bookingId/messages",
  authenticate,
  (req: Request, res: Response): void => {
    const { bookingId } = req.params;

    // Verify the booking exists and user is part of it
    const booking = bookings.find((b) => b.id === bookingId);

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
    const messages = chatMessages
      .filter((m) => m.bookingId === bookingId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    res.json(messages);
  }
);

// Get unread messages count
app.get(
  "/api/unread-messages-count",
  authenticate,
  (req: Request, res: Response): void => {
    const userId = req.user!.id;

    // Find all bookings where user is client or provider
    const userBookings = bookings.filter(
      (b) => b.clientId === userId || b.providerId === userId
    );

    let unreadCount = 0;

    userBookings.forEach((booking) => {
      // Count unread messages in this booking where the sender is NOT the current user
      const unreadInBooking = chatMessages.filter(
        (m) =>
          m.bookingId === booking.id &&
          m.senderId !== userId &&
          m.read === false
      ).length;
      unreadCount += unreadInBooking;
    });

    res.json({ count: unreadCount });
  }
);

// Mark messages as read for a booking
app.put(
  "/api/bookings/:bookingId/messages/read",
  authenticate,
  (req: Request, res: Response): void => {
    const { bookingId } = req.params;
    const userId = req.user!.id;

    // Verify the booking exists and user is part of it
    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.clientId !== userId && booking.providerId !== userId) {
      res.status(403).json({ error: "You do not have access to this chat" });
      return;
    }

    let updated = false;

    // Mark all messages in this booking sent by the OTHER party as read
    chatMessages.forEach((m) => {
      if (
        m.bookingId === bookingId &&
        m.senderId !== userId &&
        m.read === false
      ) {
        m.read = true;
        updated = true;
      }
    });

    if (updated) {
      saveData();
    }

    res.json({ success: true });
  }
);

// Get all conversations for the current user
app.get(
  "/api/my-conversations",
  authenticate,
  (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Find all bookings where user is client or provider
    const userBookings = bookings.filter(
      (b) => b.clientId === userId || b.providerId === userId
    );

    const conversations = userBookings.map((booking) => {
      // Get messages for this booking
      const bookingMessages = chatMessages
        .filter((m) => m.bookingId === booking.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ); // Newest first

      const lastMessage =
        bookingMessages.length > 0 ? bookingMessages[0] : null;

      const unreadCount = bookingMessages.filter(
        (m) => m.senderId !== userId && m.read === false
      ).length;

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
      (a, b) =>
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
  (_req: Request, res: Response) => {
    // Return users without passwords
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
  }
);

app.post(
  "/api/admin/users/:id/block",
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const user = users.find((u) => u.id === id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.userType === "admin") {
      res.status(400).json({ error: "Cannot block an admin" });
      return;
    }

    user.isBlocked = true;

    // Cancel all pending bookings for this user (as client or provider)
    bookings.forEach((booking) => {
      if (
        (booking.clientId === id || booking.providerId === id) &&
        booking.status === "pending"
      ) {
        booking.status = "cancelled";
        if (booking.paymentStatus === "held_in_escrow") {
          booking.paymentStatus = "refunded";
        }
      }
    });

    saveData();
    res.json({ success: true });
  }
);

app.post(
  "/api/admin/users/:id/unblock",
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const user = users.find((u) => u.id === id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    user.isBlocked = false;
    saveData();
    res.json({ success: true });
  }
);

app.delete(
  "/api/admin/users/:id",
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const userIndex = users.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Prevent deleting the last admin
    if (
      users[userIndex].userType === "admin" &&
      users.filter((u) => u.userType === "admin").length <= 1
    ) {
      res.status(400).json({ error: "Cannot delete the last admin" });
      return;
    }

    users.splice(userIndex, 1);
    // Also clean up related data
    services = services.filter((s) => s.providerId !== id);
    bookings = bookings.filter((b) => b.clientId !== id && b.providerId !== id);

    saveData();
    res.json({ success: true });
  }
);

app.get(
  "/api/admin/services",
  authenticate,
  requireAdmin,
  (_req: Request, res: Response) => {
    res.json(services);
  }
);

app.delete(
  "/api/admin/services/:id",
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const serviceIndex = services.findIndex((s) => s.id === id);

    if (serviceIndex === -1) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    services.splice(serviceIndex, 1);
    saveData();
    res.json({ success: true });
  }
);

app.get(
  "/api/admin/bookings",
  authenticate,
  requireAdmin,
  (_req: Request, res: Response) => {
    res.json(bookings);
  }
);

app.post(
  "/api/admin/bookings/:id/cancel",
  authenticate,
  requireAdmin,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const booking = bookings.find((b) => b.id === id);

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    if (booking.status === "cancelled") {
      res.status(400).json({ error: "Booking already cancelled" });
      return;
    }

    booking.status = "cancelled";
    if (booking.paymentStatus === "held_in_escrow") {
      booking.paymentStatus = "refunded";
    }

    saveData();
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

// Notification routes

// Get user notifications
app.get("/api/notifications", authenticate, (req: Request, res: Response) => {
  const userNotifications = notifications
    .filter((n) => n.userId === req.user!.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  res.json(userNotifications);
});

// Mark notification as read
app.put(
  "/api/notifications/:id/read",
  authenticate,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const notification = notifications.find(
      (n) => n.id === id && n.userId === req.user!.id
    );

    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    notification.read = true;
    saveData();
    res.json({ success: true });
  }
);

// Mark all notifications as read
app.put(
  "/api/notifications/read-all",
  authenticate,
  (req: Request, res: Response) => {
    let updated = false;
    notifications.forEach((n) => {
      if (n.userId === req.user!.id && !n.read) {
        n.read = true;
        updated = true;
      }
    });

    if (updated) {
      saveData();
    }
    res.json({ success: true });
  }
);

// Socket.IO Logic
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join_booking", (bookingId) => {
    socket.join(bookingId);
    console.log(`User ${socket.id} joined booking room: ${bookingId}`);
  });

  // NEW: Join user specific room for notifications
  socket.on("join_user_room", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${socket.id} joined user room: user_${userId}`);
  });

  socket.on("send_message", (data) => {
    const { bookingId, message, senderId, senderEmail, senderType } = data;

    // Create message object
    const chatMessage: ChatMessage = {
      id:
        Date.now().toString() +
        "-" +
        Math.random().toString(36).substring(2, 11),
      bookingId,
      senderId,
      senderEmail,
      senderType,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Save to database
    chatMessages.push(chatMessage);
    saveData();

    // Broadcast to room (including sender)
    io.to(bookingId).emit("receive_message", chatMessage);

    // Notify recipient about new message for unread count update
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      const recipientId =
        booking.clientId === senderId ? booking.providerId : booking.clientId;

      // Emit event to recipient's personal room
      io.to(`user_${recipientId}`).emit("message_received_notification", {
        bookingId,
        senderId,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start the server only if not in a test environment
if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

export { app, httpServer, io };
