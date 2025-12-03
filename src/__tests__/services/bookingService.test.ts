import {
  prismaMock,
  resetAllMocks,
  createMockUser,
  createMockService,
  createMockBooking,
} from "../setup";

// Mock dei moduli esterni
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => prismaMock),
}));

jest.mock("../../config/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/test",
        }),
      },
    },
    paymentIntents: {
      cancel: jest.fn().mockResolvedValue({}),
      capture: jest.fn().mockResolvedValue({}),
    },
  },
  mockStripeSessions: {},
}));

jest.mock("../../utils/notification", () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../emailService", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  emailTemplates: {
    newBookingProvider: jest.fn().mockReturnValue("<html>New Booking</html>"),
    newBookingClient: jest
      .fn()
      .mockReturnValue("<html>Booking Confirmed</html>"),
    bookingCancelled: jest.fn().mockReturnValue("<html>Cancelled</html>"),
    bookingCompleted: jest.fn().mockReturnValue("<html>Completed</html>"),
  },
}));

jest.mock("../../services/schedulingService", () => ({
  schedulingService: {
    calculateEstimatedDuration: jest.fn().mockReturnValue({ minutes: 120 }),
    validateSlotAvailability: jest.fn().mockResolvedValue(true),
    calculatePrice: jest.fn().mockReturnValue(50),
  },
}));

jest.mock("../../utils/logger", () => ({
  bookingLogger: {
    created: jest.fn(),
    updated: jest.fn(),
    cancelled: jest.fn(),
    completed: jest.fn(),
  },
  paymentLogger: {
    initiated: jest.fn(),
    success: jest.fn(),
    failed: jest.fn(),
    refund: jest.fn(),
  },
}));

// Import dopo i mock
import { bookingService } from "../../services/bookingService";
import { sendNotification } from "../../utils/notification";
import { sendEmail } from "../../emailService";
import { bookingLogger, paymentLogger } from "../../utils/logger";

describe("BookingService", () => {
  beforeEach(() => {
    resetAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  });

  describe("createBooking", () => {
    const validBookingData = {
      serviceId: "service-123",
      date: "2025-12-15",
      clientPhone: "1234567890",
      preferredTime: "10:00",
      notes: "Please bring supplies",
      address: "Via Test 123",
      protocol: "http",
      host: "localhost:3000",
      startTime: "10:00",
      endTime: "12:00",
    };

    it("should throw error if service not found", async () => {
      prismaMock.service.findUnique.mockResolvedValue(null);

      await expect(
        bookingService.createBooking(
          "user-123",
          "user@example.com",
          validBookingData
        )
      ).rejects.toThrow("Service not found");
    });

    it("should throw error if date is blocked", async () => {
      const mockService = createMockService({
        availability: JSON.stringify({
          blockedDates: ["2025-12-15"],
          weekly: {},
        }),
      });
      prismaMock.service.findUnique.mockResolvedValue({
        ...mockService,
        provider: createMockUser(),
      });

      await expect(
        bookingService.createBooking(
          "user-123",
          "user@example.com",
          validBookingData
        )
      ).rejects.toThrow("The service is not available on this date (blocked).");
    });

    it("should create booking successfully with mock Stripe", async () => {
      const mockService = createMockService();
      prismaMock.service.findUnique.mockResolvedValue({
        ...mockService,
        provider: createMockUser(),
      });
      prismaMock.booking.findFirst.mockResolvedValue(null);

      const result = await bookingService.createBooking(
        "user-123",
        "user@example.com",
        validBookingData
      );

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("url");
      expect(paymentLogger.initiated).toHaveBeenCalled();
    });
  });

  describe("getMyBookings", () => {
    it("should return user bookings", async () => {
      const mockBookings = [
        createMockBooking({ id: "booking-1" }),
        createMockBooking({ id: "booking-2" }),
      ];
      prismaMock.booking.findMany.mockResolvedValue(
        mockBookings.map((b) => ({ ...b, review: null }))
      );

      const result = await bookingService.getMyBookings("user-123");

      expect(result).toHaveLength(2);
      expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: "user-123" },
          include: { review: true },
        })
      );
    });

    it("should include hasReview flag", async () => {
      const mockBookings = [
        {
          ...createMockBooking({ id: "booking-1" }),
          review: { id: "review-1" },
        },
        { ...createMockBooking({ id: "booking-2" }), review: null },
      ];
      prismaMock.booking.findMany.mockResolvedValue(mockBookings);

      const result = await bookingService.getMyBookings("user-123");

      expect(result[0].hasReview).toBe(true);
      expect(result[1].hasReview).toBe(false);
    });
  });

  describe("getProviderBookings", () => {
    it("should return provider bookings", async () => {
      const mockBookings = [createMockBooking()];
      prismaMock.booking.findMany.mockResolvedValue(mockBookings);

      const result = await bookingService.getProviderBookings("provider-123");

      expect(result).toHaveLength(1);
      expect(prismaMock.booking.findMany).toHaveBeenCalledWith({
        where: { providerId: "provider-123" },
      });
    });
  });

  describe("cancelBooking", () => {
    it("should throw error if booking not found", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      await expect(
        bookingService.cancelBooking("booking-123", "user-123")
      ).rejects.toThrow("Booking not found");
    });

    it("should throw error if user is not authorized", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(
        createMockBooking({
          clientId: "other-user",
          providerId: "other-provider",
          service: createMockService(),
        })
      );

      await expect(
        bookingService.cancelBooking("booking-123", "user-123")
      ).rejects.toThrow("Unauthorized");
    });

    it("should throw error if already cancelled", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        ...createMockBooking({ clientId: "user-123", status: "cancelled" }),
        service: createMockService(),
      });

      await expect(
        bookingService.cancelBooking("booking-123", "user-123")
      ).rejects.toThrow("Booking already cancelled");
    });

    it("should throw error if already completed", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        ...createMockBooking({ clientId: "user-123", status: "completed" }),
        service: createMockService(),
      });

      await expect(
        bookingService.cancelBooking("booking-123", "user-123")
      ).rejects.toThrow("Cannot cancel completed booking");
    });

    it("should cancel booking successfully", async () => {
      const mockBooking = {
        ...createMockBooking({
          clientId: "user-123",
          status: "pending",
          paymentStatus: "pending",
        }),
        service: createMockService(),
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.booking.update.mockResolvedValue({
        ...mockBooking,
        status: "cancelled",
      });

      const result = await bookingService.cancelBooking(
        "booking-123",
        "user-123"
      );

      expect(result.status).toBe("cancelled");
      expect(bookingLogger.cancelled).toHaveBeenCalledWith(
        "booking-123",
        "user-123",
        "User cancelled"
      );
      expect(sendNotification).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe("completeBooking", () => {
    it("should throw error if booking not found", async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      await expect(
        bookingService.completeBooking("booking-123", "provider-123")
      ).rejects.toThrow("Booking not found");
    });

    it("should throw error if not the provider", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        ...createMockBooking({ providerId: "other-provider" }),
        service: createMockService(),
      });

      await expect(
        bookingService.completeBooking("booking-123", "provider-123")
      ).rejects.toThrow("Only provider can complete booking");
    });

    it("should throw error if payment not authorized", async () => {
      prismaMock.booking.findUnique.mockResolvedValue({
        ...createMockBooking({
          providerId: "provider-123",
          paymentStatus: "pending",
        }),
        service: createMockService(),
      });

      await expect(
        bookingService.completeBooking("booking-123", "provider-123")
      ).rejects.toThrow(
        "Payment must be authorized or held in escrow before completing the service"
      );
    });

    it("should complete booking successfully", async () => {
      const mockBooking = {
        ...createMockBooking({
          providerId: "provider-123",
          paymentStatus: "held_in_escrow",
        }),
        service: createMockService(),
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.booking.update.mockResolvedValue({
        ...mockBooking,
        status: "completed",
        paymentStatus: "released",
        completedAt: new Date(),
      });

      const result = await bookingService.completeBooking(
        "booking-123",
        "provider-123"
      );

      expect(result.status).toBe("completed");
      expect(result.paymentStatus).toBe("released");
      expect(bookingLogger.completed).toHaveBeenCalledWith("booking-123");
      expect(sendNotification).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });
  });
});
