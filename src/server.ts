import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import * as Sentry from "@sentry/node";

// Load environment variables FIRST
dotenv.config();

// Initialize Sentry (before other imports that might throw)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
    integrations: [
      // Automatically instrument Node.js libraries
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
  console.log("✅ Sentry initialized");
} else {
  console.log("⚠️ Sentry DSN not configured - error tracking disabled");
}

// Config & Utils
import { initSocket } from "./socket";
import { limiter, pageLimiter } from "./middleware/rateLimit";
import logger, { systemLogger } from "./utils/logger";
import { requestLogger, slowRequestLogger } from "./middleware/logging";

// Routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import serviceRoutes from "./routes/services";
import bookingRoutes from "./routes/bookings";
import reviewRoutes from "./routes/reviews";
import chatRoutes from "./routes/chat";
import adminRoutes from "./routes/admin";
import notificationRoutes from "./routes/notifications";
import paymentRoutes from "./routes/payment";
import schedulingRoutes from "./routes/scheduling";
import cleanupRoutes from "./routes/cleanup";
import onboardingRoutes from "./routes/onboarding";
import stripeConnectRoutes from "./routes/stripeConnect";
import { startEscrowCronJobs } from "./cron/escrowCron";
import { prisma } from "./lib/prisma";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Sentry request handler (must be first middleware)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Security & Middleware
app.set("trust proxy", 1);
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
          "https://*.basemaps.cartocdn.com",
          "https://*.tile.openstreetmap.org",
          "https://unpkg.com",
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

// CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    "http://localhost:5173", // Vite dev server
    "http://localhost:3000", // Local backend (if serving static)
    process.env.FRONTEND_URL, // Production frontend
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
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

// Raw body parser for Stripe webhooks (must be before express.json)
app.use(
  "/api/stripe-connect/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Logging middleware
app.use(requestLogger);
app.use(slowRequestLogger(2000)); // Log richieste > 2 secondi

// Static files
app.use(
  "/assets",
  express.static(path.join(__dirname, "..", "public", "react", "assets"))
);
app.use(
  "/admin/assets",
  express.static(path.join(__dirname, "..", "public", "admin", "assets"))
);
app.use(express.static("public"));

// Rate Limiting
app.use("/api/", limiter);

// Health Check Endpoint (no rate limiting)
app.get("/api/health", async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.2.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      checks: {
        database: {
          status: "healthy",
          latency: `${dbLatency}ms`,
        },
        memory: {
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(
            process.memoryUsage().heapTotal / 1024 / 1024
          )}MB`,
        },
      },
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Database connection failed",
    });
  }
});

// Routes
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", serviceRoutes);
app.use("/api", bookingRoutes);
app.use("/api", reviewRoutes);
app.use("/api", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", paymentRoutes);
app.use("/api/scheduling", schedulingRoutes);
app.use("/api", cleanupRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/stripe-connect", stripeConnectRoutes);

// SPA Fallback (Only used in development or if FRONTEND_URL is not set)
const serveSpa = (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production" && process.env.FRONTEND_URL) {
    res.redirect(process.env.FRONTEND_URL);
    return;
  }

  const htmlPath = path.join(__dirname, "..", "public", "react", "index.html");

  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, "utf8");
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";
    html = html.replace(
      "</head>",
      `<meta name="google-maps-api-key" content="${googleMapsApiKey}"></head>`
    );
    res.send(html);
  } else {
    res.status(404).send('Application not built. Run "npm run build" first.');
  }
};

// Admin SPA Fallback
const serveAdminSpa = (_req: Request, res: Response) => {
  const htmlPath = path.join(__dirname, "..", "public", "admin", "index.html");

  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(404).send('Admin not built. Run "npm run build:admin" first.');
  }
};

// Admin routes (must be before main SPA routes)
app.get("/admin", pageLimiter, serveAdminSpa);
app.get("/admin/*splat", pageLimiter, serveAdminSpa);

app.get(
  [
    "/",
    "/login",
    "/register",
    "/client-dashboard",
    "/provider-dashboard",
    "/verify-email",
    "/profile",
    "/services",
    "/bookings",
    "/messages",
  ],
  pageLimiter,
  serveSpa
);

app.get("*splat", pageLimiter, (req: Request, res: Response) => {
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

// Error Handling
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Log error
  console.error("Unhandled Error:", err);

  // Send to Sentry if configured
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      extra: {
        url: req.url,
        method: req.method,
        body: req.body,
        query: req.query,
      },
    });
  }

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Server & Socket Setup
const httpServer = createServer(app);
const io = initSocket(httpServer);

// Admin Init
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
        adminLevel: "super", // First admin is always super admin
        acceptedTerms: true,
        isVerified: true, // Admin doesn't need email verification
        createdAt: new Date(),
      },
    });
    logger.info(`Created default super admin: ${adminEmail}`);
  } else {
    // Ensure existing admins without adminLevel get upgraded to super if they're the first
    const firstAdmin = await prisma.user.findFirst({
      where: { isAdmin: true },
      orderBy: { createdAt: "asc" },
    });

    if (firstAdmin && !firstAdmin.adminLevel) {
      await prisma.user.update({
        where: { id: firstAdmin.id },
        data: { adminLevel: "super" },
      });
      logger.info(`Upgraded first admin to super: ${firstAdmin.email}`);
    }
  }
};

if (process.env.NODE_ENV !== "test") {
  initAdmin();

  // Start cron jobs
  startEscrowCronJobs();

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    systemLogger.startup(Number(PORT));
  });
}

// Gestione shutdown graceful
process.on("SIGTERM", () => {
  systemLogger.shutdown("SIGTERM received");
  httpServer.close(() => {
    logger.info("HTTP server closed");
    prisma.$disconnect();
    process.exit(0);
  });
});

process.on("uncaughtException", (error) => {
  systemLogger.error(error, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason: any) => {
  systemLogger.error(
    reason instanceof Error ? reason : new Error(String(reason)),
    "Unhandled Rejection"
  );
});

// Test Helper
export const resetData = async (): Promise<void> => {
  await prisma.review.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
};

export { app, httpServer, io, initAdmin };
