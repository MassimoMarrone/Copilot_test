import { User } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { sendEmail, emailTemplates } from "../emailService";
import { authLogger } from "../utils/logger";
import { prisma } from "../lib/prisma";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export class AuthService {
  // Helper function to normalize email (especially for Gmail)
  private normalizeEmail(email: string): string {
    let normalized = email.toLowerCase().trim();
    if (normalized.endsWith("@gmail.com")) {
      const [localPart, domain] = normalized.split("@");
      normalized = localPart.replace(/\./g, "") + "@" + domain;
    }
    return normalized;
  }

  async register(data: any) {
    let {
      email,
      username,
      password,
      acceptedTerms,
      firstName,
      lastName,
      phone,
      city,
    } = data;

    // Normalize email
    email = this.normalizeEmail(email);

    if (acceptedTerms !== true && acceptedTerms !== "true") {
      throw new Error("You must accept the Terms & Conditions");
    }

    // Validate username format
    if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      throw new Error(
        "Username must be 3-20 characters, using only letters, numbers, and underscores"
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new Error("Email already registered");
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new Error("Username already taken");
    }

    const hashedPassword = await bcrypt.hash(password, 10); // 10 rounds: good security/speed balance
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate display name from firstName and lastName
    const displayName =
      firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName || username;

    const user = await prisma.user.create({
      data: {
        email,
        username: username.toLowerCase(),
        password: hashedPassword,
        displayName,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        city: city || null,
        userType: "client",
        isClient: true,
        isProvider: false,
        acceptedTerms: true,
        createdAt: new Date(),
        isVerified: false,
        verificationToken,
        verificationTokenExpires,
      },
    });

    // Log registrazione
    authLogger.register(user.id, user.email);

    const baseUrl = (
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, ""); // Remove trailing slash if present
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Send verification email asynchronously (don't block response)
    sendEmail(
      user.email,
      "Verifica la tua email - Domy",
      emailTemplates.verification(user.email.split("@")[0], verificationLink)
    ).catch((emailError) => {
      console.error("Failed to send verification email:", emailError);
    });

    return {
      message:
        "Registration successful. Please check your email to verify your account.",
    };
  }

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error("Invalid or expired verification token");
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    sendEmail(
      updatedUser.email,
      "Benvenuto in Domy!",
      emailTemplates.welcome(updatedUser.email.split("@")[0])
    );

    const authToken = this.generateToken(updatedUser);
    return { user: updatedUser, token: authToken };
  }

  async resendVerificationEmail(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        message: "Se l'email esiste, riceverai un nuovo link di verifica.",
      };
    }

    if (user.isVerified) {
      throw new Error(
        "Questo account è già verificato. Puoi effettuare il login."
      );
    }

    if (user.isDeleted) {
      throw new Error("Questo account non esiste più.");
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires,
      },
    });

    const baseUrl = (
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Send email asynchronously
    sendEmail(
      user.email,
      "Verifica la tua email - Domy",
      emailTemplates.verification(user.email.split("@")[0], verificationLink)
    ).catch((err) =>
      console.error("Failed to resend verification email:", err)
    );

    return {
      message: "Se l'email esiste, riceverai un nuovo link di verifica.",
    };
  }

  async login(data: any) {
    const { identifier, password } = data;

    // Normalize identifier if it's an email
    const normalizedIdentifier = identifier.includes("@")
      ? this.normalizeEmail(identifier)
      : identifier.toLowerCase();

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier },
        ],
      },
    });

    if (!user) {
      authLogger.login("", normalizedIdentifier, false, "User not found");
      throw new Error("Invalid credentials");
    }

    if (!user.isVerified && !user.googleId) {
      authLogger.login(user.id, user.email, false, "Email not verified");
      throw new Error("Please verify your email before logging in");
    }

    if (!user.password) {
      authLogger.login(user.id, user.email, false, "Google-only account");
      throw new Error("Please sign in with Google");
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      authLogger.login(user.id, user.email, false, "Invalid password");
      throw new Error("Invalid credentials");
    }

    const token = this.generateToken(user);

    // Log login riuscito
    authLogger.login(user.id, user.email, true);

    return { user, token };
  }

  async googleLogin(token: string, acceptedTerms?: boolean | string) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error(
        "Server configuration error: GOOGLE_CLIENT_ID is not set"
      );
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new Error("Invalid Google token");
    }

    const { sub: googleId } = payload;

    // Normalize email using the helper function
    const email = this.normalizeEmail(payload.email);

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId, isVerified: true },
        });
      }
    } else {
      if (acceptedTerms !== true && acceptedTerms !== "true") {
        const error = new Error(
          "Devi accettare i Termini e Condizioni per registrarti"
        );
        (error as any).code = "TERMS_REQUIRED";
        throw error;
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
          isVerified: true,
        },
      });
    }

    const jwtToken = this.generateToken(user);

    return { user, token: jwtToken };
  }

  async getUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async becomeProvider(
    userId: string,
    acceptedProviderTerms: boolean | string
  ) {
    if (acceptedProviderTerms !== true && acceptedProviderTerms !== "true") {
      throw new Error("You must accept the Provider Terms & Conditions");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User not found");
    }

    if (user.isProvider) {
      throw new Error("You are already a provider");
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isProvider: true,
        acceptedProviderTerms: true,
      },
    });

    const token = this.generateToken(updatedUser);

    return { user: updatedUser, token };
  }

  private generateToken(user: User) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        userType: user.userType,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
  }
}

export const authService = new AuthService();
