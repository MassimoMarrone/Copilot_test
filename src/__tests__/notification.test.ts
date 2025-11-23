import request from "supertest";
import { httpServer, resetData, notifications } from "../server";
import { User, Notification } from "../types";

let mockFiles: { [key: string]: string } = {};

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: (path: string) => mockFiles[path] !== undefined,
  readFileSync: (path: string) => mockFiles[path] || "[]",
  writeFileSync: jest.fn((path: string, data: string) => {
    mockFiles[path] = data;
  }),
}));

describe("Notification Endpoints", () => {
  let agent: request.SuperAgentTest;
  let user: User;
  let notification: Notification;

  beforeEach(async () => {
    resetData();
    mockFiles = {
      "data/users.json": "[]",
      "data/notifications.json": "[]",
    };
    (require("fs").writeFileSync as jest.Mock).mockClear();

    agent = request.agent(httpServer) as unknown as request.SuperAgentTest;
    await agent
      .post("/api/register")
      .send({
        email: "notify@example.com",
        password: "password123",
        acceptedTerms: true,
      });

    const users: User[] = JSON.parse(mockFiles["data/users.json"]);
    user = users.find((u) => u.email === "notify@example.com")!;
    if (!user) {
      throw new Error("Test user not created");
    }

    notification = {
      id: "notif1",
      userId: user.id,
      title: "Test Notification",
      message: "This is a test.",
      read: false,
      createdAt: new Date().toISOString(),
      type: "info",
    };

    notifications.push(notification);
    mockFiles["data/notifications.json"] = JSON.stringify([notification]);
  });

  it("GET /api/notifications should return user notifications", async () => {
    const response = await agent.get("/api/notifications");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(notification.id);
  });

  it("PUT /api/notifications/:id/read should mark a notification as read", async () => {
    const response = await agent.put(
      `/api/notifications/${notification.id}/read`
    );
    expect(response.status).toBe(200);

    expect(notifications[0].read).toBe(true);
  });

  it("PUT /api/notifications/read-all should mark all notifications as read", async () => {
    const anotherNotification: Notification = {
      ...notification,
      id: "notif2",
      read: false,
    };
    notifications.push(anotherNotification);

    const response = await agent.put("/api/notifications/read-all");
    expect(response.status).toBe(200);

    expect(notifications.every((n) => n.read)).toBe(true);
  });
});
