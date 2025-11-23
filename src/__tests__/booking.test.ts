import request from "supertest";
import { httpServer, resetData } from "../server";
import { Service, Booking } from "../types";
import Stripe from "stripe";

let mockFiles: { [key: string]: string } = {};

// Mock Stripe directly with inline implementation to avoid hoisting issues
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    paymentIntents: {
      capture: jest.fn(),
    },
    transfers: {
      create: jest.fn(),
    },
  }));
});

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: (path: string) => mockFiles[path] !== undefined,
  readFileSync: (path: string) => mockFiles[path] || "[]",
  writeFileSync: jest.fn((path: string, data: string) => {
    mockFiles[path] = data;
  }),
  createReadStream: jest.fn(),
}));

describe("Booking and Payment Flow", () => {
  let providerAgent: request.SuperAgentTest;
  let clientAgent: request.SuperAgentTest;
  let service: Service;
  let stripeInstance: any;

  beforeEach(async () => {
    resetData();
    mockFiles = {
      "data/users.json": "[]",
      "data/services.json": "[]",
      "data/bookings.json": "[]",
      "data/chatMessages.json": "[]",
      "data/reviews.json": "[]",
    };
    (require("fs").writeFileSync as jest.Mock).mockClear();

    // Get the mock instance from the module results
    // We use mock.results because we returned an explicit object from mockImplementation
    const stripeMock = Stripe as unknown as jest.Mock;
    if (stripeMock.mock.results.length > 0) {
      stripeInstance = stripeMock.mock.results[0].value;

      // Clear mocks
      stripeInstance.checkout.sessions.create.mockClear();
      stripeInstance.checkout.sessions.retrieve.mockClear();
      stripeInstance.paymentIntents.capture.mockClear();
      stripeInstance.transfers.create.mockClear();
    }

    clientAgent = request.agent(
      httpServer
    ) as unknown as request.SuperAgentTest;
    await clientAgent
      .post("/api/register")
      .send({
        email: "client-book@example.com",
        password: "password123",
        acceptedTerms: true,
      });

    providerAgent = request.agent(
      httpServer
    ) as unknown as request.SuperAgentTest;
    await providerAgent
      .post("/api/register")
      .send({
        email: "provider-book@example.com",
        password: "password123",
        acceptedTerms: true,
      });
    await providerAgent
      .post("/api/become-provider")
      .send({ acceptedProviderTerms: true });

    const serviceRes = await providerAgent
      .post("/api/services")
      .send({
        title: "Testable Service",
        description: "Description for test service",
        price: 100,
      });
    service = serviceRes.body;
  });

  it("should handle the full booking, payment, and completion flow", async () => {
    const fakeStripeSessionId = "cs_test_123";
    // Setup mock return values
    stripeInstance.checkout.sessions.create.mockResolvedValue({
      id: fakeStripeSessionId,
      url: "https://checkout.stripe.com/pay/fake_session",
    });

    await clientAgent
      .post("/api/bookings")
      .send({
        serviceId: service.id,
        date: new Date().toISOString(),
      })
      .expect(200);

    const fakePaymentIntentId = "pi_test_123";
    stripeInstance.checkout.sessions.retrieve.mockResolvedValue({
      id: fakeStripeSessionId,
      status: "complete",
      payment_intent: fakePaymentIntentId,
      metadata:
        stripeInstance.checkout.sessions.create.mock.calls[0][0].metadata,
    });

    await clientAgent
      .get(`/api/verify-payment?session_id=${fakeStripeSessionId}`)
      .expect(200);

    const bookings: Booking[] = JSON.parse(mockFiles["data/bookings.json"]);
    const theBooking = bookings[0];

    stripeInstance.paymentIntents.capture.mockResolvedValue({
      id: fakePaymentIntentId,
      status: "succeeded",
    });
    stripeInstance.transfers.create.mockResolvedValue({ id: "tr_test_123" });

    await providerAgent
      .post(`/api/bookings/${theBooking.id}/complete`)
      .attach("photo", Buffer.from("fake image data"), "test.jpg")
      .expect(200);
  });
});
