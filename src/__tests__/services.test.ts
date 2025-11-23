import request from "supertest";
import { httpServer, resetData } from "../server";

let mockFiles: { [key: string]: string } = {};

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: (path: string) => mockFiles[path] !== undefined,
  readFileSync: (path: string) => mockFiles[path] || "[]",
  writeFileSync: jest.fn((path: string, data: string) => {
    mockFiles[path] = data;
  }),
}));

describe("Service Endpoints", () => {
  let providerAgent: request.SuperAgentTest;
  let clientAgent: request.SuperAgentTest;

  beforeEach(async () => {
    resetData();
    mockFiles = {
      "data/users.json": "[]",
      "data/services.json": "[]",
      "data/bookings.json": "[]",
    };
    (require("fs").writeFileSync as jest.Mock).mockClear();

    clientAgent = request.agent(
      httpServer
    ) as unknown as request.SuperAgentTest;
    await clientAgent.post("/api/register").send({
      email: "client@example.com",
      password: "password123",
      acceptedTerms: true,
    });

    providerAgent = request.agent(
      httpServer
    ) as unknown as request.SuperAgentTest;
    await providerAgent.post("/api/register").send({
      email: "provider@example.com",
      password: "password123",
      acceptedTerms: true,
    });
    await providerAgent
      .post("/api/become-provider")
      .send({ acceptedProviderTerms: true });
  });

  describe("POST /api/services", () => {
    it("should allow a provider to create a new service", async () => {
      const response = await providerAgent.post("/api/services").send({
        title: "Professional House Cleaning",
        description: "A very detailed description of the cleaning service.",
        price: 99.99,
      });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Professional House Cleaning");
    });

    it("should not allow a client to create a service", async () => {
      await clientAgent
        .post("/api/services")
        .send({
          title: "I am a client",
          description: "This should not work.",
          price: 10,
        })
        .expect(403);
    });
  });

  describe("GET /api/services", () => {
    it("should return a list of available services", async () => {
      await providerAgent
        .post("/api/services")
        .send({
          title: "Test Service",
          description: "A service for testing.",
          price: 50,
        });

      const response = await request(httpServer).get("/api/services");
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });
});
