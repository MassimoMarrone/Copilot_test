import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Config & Utils
import { initSocket } from "./socket";
import { limiter, pageLimiter } from "./middleware/rateLimit";

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

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

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
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
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
        createdAt: new Date(),
      },
    });
    console.log(`Created default super admin: ${adminEmail}`);
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
      console.log(`Upgraded first admin to super: ${firstAdmin.email}`);
    }
  }
};

if (process.env.NODE_ENV !== "test") {
  initAdmin();
  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

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
