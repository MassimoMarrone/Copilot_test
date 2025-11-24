import rateLimit from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
  max: 100000, // Increased for testing
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Increased for testing
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true,
});

export const pageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per minute for pages
  message: "Too many page requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
