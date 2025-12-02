import bcrypt from "bcryptjs";
import {
  prismaMock,
  authLoggerMock,
  resetAllMocks,
  createMockUser,
} from "../setup";

// Mock dei moduli esterni
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => prismaMock),
}));

jest.mock("../../emailService", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailTemplates: {
    welcome: jest.fn().mockReturnValue("<html>Welcome</html>"),
    verification: jest.fn().mockReturnValue("<html>Verify</html>"),
  },
}));

jest.mock("../../utils/logger", () => ({
  authLogger: authLoggerMock,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

// Import dopo i mock
import { AuthService } from "../../services/authService";

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    resetAllMocks();
    authService = new AuthService();
  });

  describe("normalizeEmail", () => {
    it("should lowercase email", () => {
      const result = (authService as any).normalizeEmail("TEST@EXAMPLE.COM");
      expect(result).toBe("test@example.com");
    });

    it("should trim whitespace", () => {
      const result = (authService as any).normalizeEmail(
        "  test@example.com  "
      );
      expect(result).toBe("test@example.com");
    });

    it("should remove dots from Gmail local part", () => {
      const result = (authService as any).normalizeEmail("test.user@gmail.com");
      expect(result).toBe("testuser@gmail.com");
    });

    it("should not modify non-Gmail emails", () => {
      const result = (authService as any).normalizeEmail(
        "test.user@example.com"
      );
      expect(result).toBe("test.user@example.com");
    });
  });

  describe("register", () => {
    const validRegistrationData = {
      email: "newuser@example.com",
      username: "newuser",
      password: "password123",
      acceptedTerms: true,
      firstName: "New",
      lastName: "User",
    };

    it("should throw error if terms not accepted", async () => {
      await expect(
        authService.register({ ...validRegistrationData, acceptedTerms: false })
      ).rejects.toThrow("You must accept the Terms & Conditions");
    });

    it("should throw error for invalid username format", async () => {
      await expect(
        authService.register({ ...validRegistrationData, username: "ab" })
      ).rejects.toThrow(
        "Username must be 3-20 characters, using only letters, numbers, and underscores"
      );

      await expect(
        authService.register({
          ...validRegistrationData,
          username: "user@name",
        })
      ).rejects.toThrow(
        "Username must be 3-20 characters, using only letters, numbers, and underscores"
      );
    });

    it("should throw error if email already exists", async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(createMockUser());

      await expect(authService.register(validRegistrationData)).rejects.toThrow(
        "Email already registered"
      );
    });

    it("should throw error if username already exists", async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(createMockUser()); // username check

      await expect(authService.register(validRegistrationData)).rejects.toThrow(
        "Username already taken"
      );
    });

    it("should create user successfully with valid data", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(
        createMockUser({
          email: validRegistrationData.email,
          username: validRegistrationData.username,
        })
      );

      const result = await authService.register(validRegistrationData);

      expect(result.message).toContain("Registration successful");
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(authLoggerMock.register).toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should throw error for non-existent user", async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        authService.login({
          identifier: "nonexistent@example.com",
          password: "password",
        })
      ).rejects.toThrow("Invalid credentials");

      expect(authLoggerMock.login).toHaveBeenCalledWith(
        "",
        "nonexistent@example.com",
        false,
        "User not found"
      );
    });

    it("should throw error for unverified user", async () => {
      prismaMock.user.findFirst.mockResolvedValue(
        createMockUser({ isVerified: false, googleId: null })
      );

      await expect(
        authService.login({
          identifier: "test@example.com",
          password: "password",
        })
      ).rejects.toThrow("Please verify your email before logging in");
    });

    it("should throw error for Google-only account without password", async () => {
      prismaMock.user.findFirst.mockResolvedValue(
        createMockUser({ password: null, googleId: "google123" })
      );

      await expect(
        authService.login({
          identifier: "test@example.com",
          password: "password",
        })
      ).rejects.toThrow("Please sign in with Google");
    });

    it("should throw error for invalid password", async () => {
      const hashedPassword = await bcrypt.hash("correctpassword", 10);
      prismaMock.user.findFirst.mockResolvedValue(
        createMockUser({ password: hashedPassword })
      );

      await expect(
        authService.login({
          identifier: "test@example.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid credentials");
    });

    it("should login successfully with valid credentials", async () => {
      const password = "correctpassword";
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockUser = createMockUser({ password: hashedPassword });
      prismaMock.user.findFirst.mockResolvedValue(mockUser);

      const result = await authService.login({
        identifier: "test@example.com",
        password,
      });

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(authLoggerMock.login).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        true
      );
    });

    it("should login with username instead of email", async () => {
      const password = "correctpassword";
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockUser = createMockUser({ password: hashedPassword });
      prismaMock.user.findFirst.mockResolvedValue(mockUser);

      const result = await authService.login({
        identifier: "testuser",
        password,
      });

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });
  });

  describe("verifyEmail", () => {
    it("should throw error for invalid token", async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(authService.verifyEmail("invalidtoken")).rejects.toThrow(
        "Invalid or expired verification token"
      );
    });

    it("should verify email successfully", async () => {
      const mockUser = createMockUser({
        isVerified: false,
        verificationToken: "validtoken",
      });
      prismaMock.user.findFirst.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        isVerified: true,
        verificationToken: null,
      });

      const result = await authService.verifyEmail("validtoken");

      expect(result.user.isVerified).toBe(true);
      expect(result.token).toBeDefined();
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpires: null,
        },
      });
    });
  });

  describe("becomeProvider", () => {
    it("should throw error if terms not accepted", async () => {
      await expect(
        authService.becomeProvider("user-123", false)
      ).rejects.toThrow("You must accept the Provider Terms & Conditions");
    });

    it("should throw error if user not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.becomeProvider("user-123", true)
      ).rejects.toThrow("User not found");
    });

    it("should throw error if already a provider", async () => {
      prismaMock.user.findUnique.mockResolvedValue(
        createMockUser({ isProvider: true })
      );

      await expect(
        authService.becomeProvider("user-123", true)
      ).rejects.toThrow("You are already a provider");
    });

    it("should upgrade user to provider", async () => {
      const mockUser = createMockUser({ isProvider: false });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        isProvider: true,
        acceptedProviderTerms: true,
      });

      const result = await authService.becomeProvider("user-123", true);

      expect(result.user.isProvider).toBe(true);
      expect(result.token).toBeDefined();
    });
  });
});
