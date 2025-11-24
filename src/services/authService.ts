import { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { sendEmail, emailTemplates } from "../emailService";

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

export class AuthService {
  async register(data: any) {
    const { email, password, acceptedTerms } = data;

    if (acceptedTerms !== true && acceptedTerms !== "true") {
      throw new Error("You must accept the Terms & Conditions");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
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

    const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/api/verify-email?token=${verificationToken}`;

    sendEmail(
      user.email,
      "Verifica la tua email - Domy",
      emailTemplates.verification(user.email.split("@")[0], verificationLink)
    );

    return { message: "Registration successful. Please check your email to verify your account." };
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

  async login(data: any) {
    const { email, password } = data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.isVerified && !user.googleId) {
      throw new Error("Please verify your email before logging in");
    }

    if (!user.password) {
      throw new Error("Please sign in with Google");
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new Error("Invalid credentials");
    }

    const token = this.generateToken(user);

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

    const { email, sub: googleId } = payload;

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
      { id: user.id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
  }
}

export const authService = new AuthService();
