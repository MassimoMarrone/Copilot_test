import winston from "winston";
import path from "path";

// Definisci i livelli di log personalizzati
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colori per la console
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

winston.addColors(colors);

// Determina il livello di log in base all'ambiente
const level = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "development" ? "debug" : "info";
};

// Formato per i log
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
  })
);

// Formato colorato per la console
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

// Configurazione dei transport
const transports: winston.transport[] = [
  // Console - sempre attiva
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// In produzione, aggiungi log su file
if (process.env.NODE_ENV === "production") {
  // Log di errori
  transports.push(
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
      format,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Log combinati
  transports.push(
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
      format,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Crea il logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Non terminare su eccezioni non gestite
  exitOnError: false,
});

// Helper per loggare richieste HTTP
export const httpLogger = {
  request: (req: any, message?: string) => {
    logger.http(message || "Incoming request", {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get?.("user-agent"),
      userId: req.user?.id,
    });
  },
  response: (req: any, res: any, responseTime: number) => {
    logger.http("Response sent", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id,
    });
  },
};

// Helper per loggare operazioni del database
export const dbLogger = {
  query: (operation: string, model: string, duration?: number) => {
    logger.debug(`DB ${operation}`, {
      model,
      duration: duration ? `${duration}ms` : undefined,
    });
  },
  error: (operation: string, model: string, error: any) => {
    logger.error(`DB ${operation} failed`, {
      model,
      error: error.message,
      code: error.code,
    });
  },
};

// Helper per loggare autenticazione
export const authLogger = {
  login: (userId: string, email: string, success: boolean, reason?: string) => {
    if (success) {
      logger.info("User logged in", { userId, email });
    } else {
      logger.warn("Login failed", { email, reason });
    }
  },
  logout: (userId: string) => {
    logger.info("User logged out", { userId });
  },
  register: (userId: string, email: string) => {
    logger.info("New user registered", { userId, email });
  },
  tokenRefresh: (userId: string) => {
    logger.debug("Token refreshed", { userId });
  },
};

// Helper per loggare pagamenti
export const paymentLogger = {
  initiated: (bookingId: string, amount: number, userId: string) => {
    logger.info("Payment initiated", { bookingId, amount, userId });
  },
  success: (bookingId: string, amount: number, stripeSessionId: string) => {
    logger.info("Payment successful", { bookingId, amount, stripeSessionId });
  },
  failed: (bookingId: string, error: string) => {
    logger.error("Payment failed", { bookingId, error });
  },
  refund: (bookingId: string, amount: number, reason: string) => {
    logger.info("Payment refunded", { bookingId, amount, reason });
  },
};

// Helper per loggare booking
export const bookingLogger = {
  created: (
    bookingId: string,
    serviceId: string,
    clientId: string,
    providerId: string
  ) => {
    logger.info("Booking created", {
      bookingId,
      serviceId,
      clientId,
      providerId,
    });
  },
  updated: (bookingId: string, status: string, updatedBy: string) => {
    logger.info("Booking updated", { bookingId, status, updatedBy });
  },
  cancelled: (bookingId: string, cancelledBy: string, reason?: string) => {
    logger.warn("Booking cancelled", { bookingId, cancelledBy, reason });
  },
  completed: (bookingId: string) => {
    logger.info("Booking completed", { bookingId });
  },
};

// Helper per loggare email
export const emailLogger = {
  sent: (to: string, subject: string, templateType: string) => {
    logger.info("Email sent", { to, subject, templateType });
  },
  failed: (to: string, subject: string, error: string) => {
    logger.error("Email failed", { to, subject, error });
  },
};

// Helper per loggare errori di sistema
export const systemLogger = {
  startup: (port: number) => {
    logger.info(`🚀 Server started on port ${port}`, {
      env: process.env.NODE_ENV,
      nodeVersion: process.version,
    });
  },
  shutdown: (reason: string) => {
    logger.warn("Server shutting down", { reason });
  },
  error: (error: Error, context?: string) => {
    logger.error(error.message, {
      context,
      stack: error.stack,
    });
  },
  memory: () => {
    const used = process.memoryUsage();
    logger.debug("Memory usage", {
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    });
  },
};

export default logger;
