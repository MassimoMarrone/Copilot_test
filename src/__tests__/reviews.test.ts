import request from "supertest";
import { httpServer, resetData } from "../server";
import { Service, Review } from "../types";

let mockFiles: { [key: string]: string } = {};

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: (path: string) => mockFiles[path] !== undefined,
  readFileSync: (path: string) => mockFiles[path] || "[]",
  writeFileSync: jest.fn((path: string, data: string) => {
    mockFiles[path] = data;
  }),
}));

describe("Review System", () => {
  let providerAgent: request.SuperAgentTest;
  let clientAgent: request.SuperAgentTest;
  let service: Service;
  let review: Review;

  beforeEach(async () => {
    resetData();
    mockFiles = {
      "data/users.json": "[]",
      "data/services.json": "[]",
      "data/bookings.json": "[]",
      "data/chatMessages.json": "[]",
      "data/reviews.json": "[]",
      "data/notifications.json": "[]",
    };
    (require("fs").writeFileSync as jest.Mock).mockClear();

    // Setup Provider
    providerAgent = request.agent(
      httpServer
    ) as unknown as request.SuperAgentTest;
    await providerAgent
      .post("/api/register")
      .send({
        email: "provider-rev@example.com",
        password: "password123",
        acceptedTerms: true,
      });
    await providerAgent
      .post("/api/become-provider")
      .send({ acceptedProviderTerms: true });
    const serviceRes = await providerAgent
      .post("/api/services")
      .send({
        title: "Reviewable Service",
        description: "Description must be long enough",
        price: 50,
      });
    service = serviceRes.body;

    // Setup Client
    clientAgent = request.agent(
      httpServer
    ) as unknown as request.SuperAgentTest;
    await clientAgent
      .post("/api/register")
      .send({
        email: "client-rev@example.com",
        password: "password123",
        acceptedTerms: true,
      });

    // Create Completed Booking (manually injecting for speed, or via flow)
    // We'll use the flow to be safe but mock payment
    // Actually, let's just inject the booking into the array via a helper or just use the API if possible.
    // Since we can't easily inject into memory from here without the exported arrays (which we have in server.ts but need to import),
    // let's use the exported arrays.
  });

  it("should allow full review lifecycle: create, read, reply, edit, delete", async () => {
    // 1. Create Booking & Complete it (Mocking state directly for speed)
    const { bookings } = require("../server");

    // We need to get the user IDs first
    const clientRes = await clientAgent.get("/api/me");
    const clientId = clientRes.body.id;
    const providerRes = await providerAgent.get("/api/me");
    const providerId = providerRes.body.id;

    const bookingId = "booking-123";
    bookings.push({
      id: bookingId,
      serviceId: service.id,
      clientId: clientId,
      clientEmail: "client-rev@example.com",
      providerId: providerId,
      providerEmail: "provider-rev@example.com",
      serviceTitle: service.title,
      amount: 50,
      date: new Date().toISOString(),
      status: "completed", // Must be completed to review
      paymentStatus: "released",
      createdAt: new Date().toISOString(),
      photoProof: "proof.jpg",
    });

    // 2. Create Review
    const reviewRes = await clientAgent
      .post(`/api/bookings/${bookingId}/review`)
      .send({
        rating: 5,
        comment: "Excellent service, highly recommended!",
      })
      .expect(201);
    review = reviewRes.body;

    // 3. Read Reviews (Public)
    const reviewsRes = await request(httpServer)
      .get(`/api/services/${service.id}/reviews`)
      .expect(200);
    expect(reviewsRes.body).toHaveLength(1);
    expect(reviewsRes.body[0].comment).toBe(
      "Excellent service, highly recommended!"
    );
    expect(reviewsRes.body[0].clientName).toBe("client-rev"); // email prefix

    // 4. Provider Reply
    await providerAgent
      .post(`/api/reviews/${review.id}/reply`)
      .send({
        reply: "Thank you so much!",
      })
      .expect(200);

    // Verify reply is visible
    const reviewsRes2 = await request(httpServer).get(
      `/api/services/${service.id}/reviews`
    );
    expect(reviewsRes2.body[0].providerReply).toBe("Thank you so much!");

    // 5. Edit Review (Client)
    await clientAgent
      .put(`/api/reviews/${review.id}`)
      .send({
        rating: 4,
        comment: "Good service, but expensive.",
      })
      .expect(200);

    // Verify edit
    const reviewsRes3 = await request(httpServer).get(
      `/api/services/${service.id}/reviews`
    );
    expect(reviewsRes3.body[0].rating).toBe(4);
    expect(reviewsRes3.body[0].comment).toBe("Good service, but expensive.");

    // 6. Delete Review (Client)
    await clientAgent.delete(`/api/reviews/${review.id}`).expect(200);

    // Verify deletion
    const reviewsRes4 = await request(httpServer).get(
      `/api/services/${service.id}/reviews`
    );
    expect(reviewsRes4.body).toHaveLength(0);
  });
});
