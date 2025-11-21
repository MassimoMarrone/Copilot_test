import express, { Request, Response, NextFunction } from "express";
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
import { User, Service, Booking, JWTPayload, ChatMessage } from "./types";
import Stripe from "stripe";

// Load environment variables
dotenv.config();

const app = express();
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

// Security: Helmet middleware for setting security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
        ],
        connectSrc: ["'self'", "https://maps.googleapis.com"],
        frameSrc: ["https://maps.googleapis.com"],
      },
    },
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
  } catch (error) {
    console.error("Error saving data:", error);
  }
};

loadData();

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
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
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
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, userType: user.userType });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
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
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
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
app.get("/api/services", authenticate, (_req: Request, res: Response): void => {
  res.json(services);
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

// Create booking (clients only)
app.post(
  "/api/bookings",
  authenticate,
  [
    body("serviceId").notEmpty().withMessage("Service ID is required"),
    body("date").isISO8601().withMessage("Valid date is required"),
  ],
  validate,
  (req: Request, res: Response): void => {
    if (req.user!.userType !== "client") {
      res.status(403).json({ error: "Only clients can create bookings" });
      return;
    }

    const { serviceId, date } = req.body;
    const service = services.find((s) => s.id === serviceId);

    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    const booking: Booking = {
      id:
        Date.now().toString() +
        "-" +
        Math.random().toString(36).substring(2, 11),
      serviceId,
      clientId: req.user!.id,
      clientEmail: req.user!.email,
      providerId: service.providerId,
      providerEmail: service.providerEmail,
      serviceTitle: service.title,
      amount: service.price,
      date,
      status: "pending",
      paymentStatus: "unpaid",
      photoProof: null,
      createdAt: new Date().toISOString(),
    };

    bookings.push(booking);
    saveData();
    res.json(booking);
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
  (req: Request, res: Response): void => {
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

    if (!req.file) {
      res.status(400).json({ error: "Photo proof is required" });
      return;
    }

    booking.status = "completed";
    booking.paymentStatus = "released";
    booking.photoProof = "/uploads/" + req.file.filename;
    booking.completedAt = new Date().toISOString();

    saveData();
    res.json(booking);
  }
);

// Stripe Payment Route
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
        )}/client-dashboard?payment=success&bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
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

// Verify payment and update booking status
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

      if (session.payment_status === "paid") {
        const bookingId = session.metadata?.bookingId;
        const booking = bookings.find((b) => b.id === bookingId);

        if (booking) {
          booking.paymentStatus = "held_in_escrow";
          saveData();
          res.json({ success: true, booking });
        } else {
          res.status(404).json({ error: "Booking not found" });
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

    const chatMessage: ChatMessage = {
      id:
        Date.now().toString() +
        "-" +
        Math.random().toString(36).substring(2, 11),
      bookingId,
      senderId: req.user!.id,
      senderEmail: req.user!.email,
      senderType: req.user!.userType,
      message,
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

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
