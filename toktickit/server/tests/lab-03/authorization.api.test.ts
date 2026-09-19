import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import bcrypt from "bcrypt";
import { requireAuth, requireRole } from "../../src/auth.js";
import { tickets } from "../../src/tickets.js";
import { getPrisma } from "../../src/prisma.js";
import { app as mainApp } from "../../src/app.js"; // For ownership tests using real app

const db = getPrisma();

// ---------------------------------------------------------------------------
// Test-only router for role guards (No placeholder APIs, mounts real router)
// ---------------------------------------------------------------------------
const staffApp = express();
staffApp.use(express.json());
// Apply the reusable role guard, then mount the real tickets router to verify the guard works
staffApp.use(requireAuth, requireRole("IT_STAFF"), tickets);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function createUser(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR" = "REQUESTER") {
  const passwordRaw = "TestPass1!";
  const passwordHash = await bcrypt.hash(passwordRaw, 4);
  const email = `test-${randomUUID()}@example.com`;
  const user = await db.user.create({
    data: { name: "Test User", email, passwordHash, role, isActive: true, mustChangePassword: false },
  });
  const res = await request(mainApp).post("/api/auth/login").set("X-Requested-With", "XMLHttpRequest").send({ email, password: passwordRaw });
  return { id: user.id, cookie: res.headers["set-cookie"]?.[0] ?? "" };
}

describe("Authorization and Role Guards", () => {
  let requester: { id: number; cookie: string };
  let staff: { id: number; cookie: string };
  let admin: { id: number; cookie: string };

  beforeAll(async () => {
    requester = await createUser("REQUESTER");
    staff = await createUser("IT_STAFF");
    admin = await createUser("ADMINISTRATOR");
  });

  afterAll(async () => {
    await db.session.deleteMany({ where: { userId: { in: [requester.id, staff.id, admin.id] } } });
    await db.user.deleteMany({ where: { id: { in: [requester.id, staff.id, admin.id] } } });
    await db.$disconnect();
  });

  it("AUTHZ-01: requireRole(IT_STAFF) rejects REQUESTER with 403", async () => {
    const res = await request(staffApp).get("/").set("Cookie", requester.cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("AUTHZ-02: requireRole(IT_STAFF) allows IT_STAFF", async () => {
    // The GET / on tickets router returns 200 (list tickets)
    const res = await request(staffApp).get("/").set("Cookie", staff.cookie);
    expect(res.status).toBe(200);
  });

  it("AUTHZ-03: requireRole(IT_STAFF) allows ADMINISTRATOR", async () => {
    const res = await request(staffApp).get("/").set("Cookie", admin.cookie);
    expect(res.status).toBe(200);
  });
});

describe("Requester Ownership & Forged Identity", () => {
  let userA: { id: number; cookie: string };
  let userB: { id: number; cookie: string };
  let ticketAId: number;

  beforeAll(async () => {
    userA = await createUser("REQUESTER");
    userB = await createUser("REQUESTER");

    // Create a ticket for User A
    const category = await db.category.findFirstOrThrow();
    const system = await db.relatedSystem.findFirstOrThrow();

    const res = await request(mainApp)
      .post("/api/tickets")
      .set("Cookie", userA.cookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "LOW",
        summary: "User A Ticket",
        description: "Testing ownership"
      });
    ticketAId = res.body.id;
  });

  afterAll(async () => {
    await db.ticket.deleteMany({ where: { requesterId: { in: [userA.id, userB.id] } } });
    await db.session.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  });

  it("AUTHZ-OWN-01: User B cannot view User A's ticket (returns 404)", async () => {
    const res = await request(mainApp)
      .get(`/api/tickets/${ticketAId}`)
      .set("Cookie", userB.cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("AUTHZ-OWN-02: Forged identity - User B cannot submit a ticket as User A", async () => {
    const category = await db.category.findFirstOrThrow();
    const system = await db.relatedSystem.findFirstOrThrow();

    // Try to inject requesterId in header or query
    const res = await request(mainApp)
      .post(`/api/tickets?requesterId=${userA.id}`)
      .set("Cookie", userB.cookie)
      .set("X-Requested-With", "XMLHttpRequest")
      .set("x-requester-id", String(userA.id))
      .send({
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "LOW",
        summary: "Forged Ticket",
        description: "Testing forged identity"
      });

    expect(res.status).toBe(201); // Created successfully, BUT...

    // It MUST be owned by userB, not userA
    const ticket = await db.ticket.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(ticket.requesterId).toBe(userB.id);
    expect(ticket.requesterId).not.toBe(userA.id);
  });
});
