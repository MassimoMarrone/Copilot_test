import { Request, Response } from "express";

/**
 * Configurazione cookie standard per autenticazione
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 ore
};

/**
 * Determina se la connessione è sicura (HTTPS)
 */
export function isSecureConnection(req: Request): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    req.secure ||
    req.headers["x-forwarded-proto"] === "https"
  );
}

/**
 * Imposta il cookie di autenticazione con token JWT
 */
export function setAuthCookie(
  res: Response,
  req: Request,
  token: string
): void {
  res.cookie("token", token, {
    ...AUTH_COOKIE_OPTIONS,
    secure: isSecureConnection(req),
  });
}

/**
 * Rimuove il cookie di autenticazione
 */
export function clearAuthCookie(res: Response, req: Request): void {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isSecureConnection(req),
    sameSite: "lax",
  });
}
