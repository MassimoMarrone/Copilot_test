import request from "supertest";
import { httpServer, resetData, initAdmin, users } from "../server";
import { User } from "../types";

let mockUsers: User[] = [];

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readFileSync: (path: string) => {
    if (path === "data/users.json") {
      return JSON.stringify(mockUsers);
    }
    return "[]";
  },
  writeFileSync: (_path: string, data: string) => {
    mockUsers = JSON.parse(data);
  },
}));

describe("Admin Endpoints", () => {
  let adminAgent: request.SuperAgentTest;
  let clientUser: User;

  beforeEach(async () => {
    resetData();
    // Reset users and create admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin"; // Default in server.ts is 'admin'

    // We can use initAdmin to create the default admin
    initAdmin();

    // Sync mockUsers for fs mock consistency (though server uses memory)
    mockUsers = [...users];

    // Login as admin
    adminAgent = request.agent(httpServer) as unknown as request.SuperAgentTest;
    await adminAgent.post("/api/login").send({
      email: adminEmail,
      password: adminPassword,
    });

    // Create a client using a separate request (no session persistence needed for this test setup)
    await request(httpServer)
      .post("/api/register")
      .send({
        email: "client@test.com",
        password: "password123",
        acceptedTerms: true,
      })
      .expect(200);

    // Create a provider using a separate agent to maintain its own session
    const providerAgent = request.agent(
      httpServer
    ) as unknown as request.SuperAgentTest;
    await providerAgent.post("/api/register").send({
      email: "provider@test.com",
      password: "password123",
      acceptedTerms: true,
    });
    await providerAgent
      .post("/api/become-provider")
      .send({ acceptedProviderTerms: true });

    clientUser = users.find((u) => u.email === "client@test.com")!;
  });

  it("GET /api/admin/users should return all users", async () => {
    const response = await adminAgent.get("/api/admin/users").expect(200);
    expect(response.body).toHaveLength(3);
  });

  it("POST /api/admin/users/:id/block and /unblock should work", async () => {
    await adminAgent
      .post(`/api/admin/users/${clientUser.id}/block`)
      .expect(200);
    let user = users.find((u) => u.id === clientUser.id);
    expect(user!.isBlocked).toBe(true);

    await adminAgent
      .post(`/api/admin/users/${clientUser.id}/unblock`)
      .expect(200);
    user = users.find((u) => u.id === clientUser.id);
    expect(user!.isBlocked).toBe(false);
  });
});
