import { Request, Response, NextFunction } from "express";
import logger, { httpLogger } from "../utils/logger";

/**
 * Middleware per loggare tutte le richieste HTTP
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Log della richiesta in arrivo
  httpLogger.request(req);

  // Intercetta la risposta per loggare il tempo di risposta
  res.on("finish", () => {
    const responseTime = Date.now() - startTime;
    httpLogger.response(req, res, responseTime);
  });

  next();
};

/**
 * Middleware per gestire errori e loggarli
 */
export const errorLogger = (
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    userId: (req as any).user?.id,
    body: req.body,
  });

  next(err);
};

/**
 * Middleware per loggare richieste lente (> 1 secondo)
 */
export const slowRequestLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on("finish", () => {
      const responseTime = Date.now() - startTime;
      if (responseTime > threshold) {
        logger.warn("Slow request detected", {
          method: req.method,
          url: req.url,
          responseTime: `${responseTime}ms`,
          threshold: `${threshold}ms`,
        });
      }
    });

    next();
  };
};
