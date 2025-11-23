import request from "supertest";
import { httpServer, resetData } from "../server";
import { OAuth2Client } from "google-auth-library";

let mockFiles: { [key: string]: string } = {
  "data/users.json": "[]",
  "data/services.json": "[]",
  "data/bookings.json": "[]",
  "data/chatMessages.json": "[]",
  "data/notifications.json": "[]",
  "data/reviews.json": "[]",
};

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: (path: string) => mockFiles[path] !== undefined,
  readFileSync: (path: string) => mockFiles[path] || "[]",
  writeFileSync: jest.fn((path: string, data: string) => {
    mockFiles[path] = data;
  }),
}));

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe("Authentication Endpoints", () => {
  beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
  });

  beforeEach(() => {
    resetData();
    mockFiles = {
      "data/users.json": "[]",
      "data/services.json": "[]",
      "data/bookings.json": "[]",
      "data/chatMessages.json": "[]",
      "data/notifications.json": "[]",
      "data/reviews.json": "[]",
    };
    (require("fs").writeFileSync as jest.Mock).mockClear();
  });

  describe("POST /api/register", () => {
    it("should register a new user successfully", async () => {
      const response = await request(httpServer).post("/api/register").send({
        email: "test@example.com",
        password: "password123",
        acceptedTerms: true,
      });

      expect(response.status).toBe(200);
      const users = JSON.parse(mockFiles["data/users.json"]);
      expect(users[0].email).toBe("test@example.com");
    });
  });

  describe("POST /api/login", () => {
    beforeEach(async () => {
      // We need to register the user via API to populate server memory,
      // because direct FS manipulation won't affect the running server memory in this test setup
      // unless we restart the server or use resetData + API.
      // But here we want to test login, so we can just register via API.
      await request(httpServer).post("/api/register").send({
        email: "test@example.com",
        password: "password123",
        acceptedTerms: true,
      });
    });

    it("should login an existing user successfully", async () => {
      const response = await request(httpServer).post("/api/login").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
    });
  });

  describe("Authenticated Routes", () => {
    let agent: request.SuperAgentTest;

    beforeEach(async () => {
      agent = request.agent(httpServer) as unknown as request.SuperAgentTest;
      await agent.post("/api/register").send({
        email: "authtest@example.com",
        password: "password123",
        acceptedTerms: true,
      });
    });

    it("GET /api/me should return user data", async () => {
      const response = await agent.get("/api/me");
      expect(response.status).toBe(200);
      expect(response.body.email).toBe("authtest@example.com");
    });

    it("POST /api/logout should clear the auth token", async () => {
      await agent.post("/api/logout").expect(200);
      const res = await agent.get("/api/me");
      expect(res.status).toBe(401);
    });
  });

  describe("Google Auth", () => {
    it("should handle Google Auth", async () => {
      const clientMock = OAuth2Client as unknown as jest.Mock;
      const clientInstance = clientMock.mock.results[0].value;
      const mockVerifyIdToken = clientInstance.verifyIdToken;

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: "google@example.com",
          sub: "google-id-123",
        }),
      });

      const res = await request(httpServer).post("/api/auth/google").send({
        token: "fake-google-token",
        acceptedTerms: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
