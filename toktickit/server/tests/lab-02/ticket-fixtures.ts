import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { getPrisma } from "../../src/prisma.js";
export const db = getPrisma();
export async function ticketFixtures() {
  const suffix = randomUUID();
  const credentials = { passwordHash: await bcrypt.hash("Fixture123!", 10), mustChangePassword: false };
  const a = await db.user.create({ data: { name: "Ticket test A", email: suffix + "a@example.com", department: "Test", ...credentials } });
  const b = await db.user.create({ data: { name: "Ticket test B", email: suffix + "b@example.com", department: "Test", ...credentials } });
  const inactive = await db.user.create({ data: { name: "Inactive", email: suffix + "i@example.com", department: "Test", isActive: false, ...credentials } });
  const category = await db.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const otherCategory = await db.category.findUniqueOrThrow({ where: { name: "Software" } });
  const system = await db.relatedSystem.findUniqueOrThrow({ where: { name: "VPN" } });
  const inactiveSystem = await db.relatedSystem.create({ data: { name: suffix, isActive: false } });
  const body = { categoryId: category.id, relatedSystemId: system.id, requestedPriority: "MEDIUM", summary: "VPN connection failed", description: "The VPN connection fails after entering my credentials." };
  async function clear() {
    const tickets = await db.ticket.findMany({ where: { requesterId: { in: [a.id, b.id, inactive.id] } }, select: { id: true } });
    await db.comment.deleteMany({ where: { ticketId: { in: tickets.map(t => t.id) } } });
    await db.internalNote.deleteMany({ where: { ticketId: { in: tickets.map(t => t.id) } } });
    await db.attachment.deleteMany({ where: { ticketId: { in: tickets.map(t => t.id) } } });
    await db.ticket.deleteMany({ where: { requesterId: { in: [a.id, b.id, inactive.id] } } });
  }
  return { a, b, inactive, category, otherCategory, system, inactiveSystem, body, clear,
    async dispose() {
      await clear();
      await db.session.deleteMany({ where: { userId: { in: [a.id, b.id, inactive.id] } } });
      await db.user.deleteMany({ where: { id: { in: [a.id, b.id, inactive.id] } } });
      await db.relatedSystem.delete({ where: { id: inactiveSystem.id } });
      await db.$disconnect();
    },
    async ticket(overrides: Record<string, unknown> = {}) {
      return db.ticket.create({ data: { ...body, requestedPriority: "MEDIUM", itPriority: "MEDIUM", requesterId: a.id, ticketNumber: "FIX-" + randomUUID(), ...overrides } });
    },
    async loginAs(user: { email: string }) {
      const { app } = await import("../../src/app.js");
      const request = (await import("supertest")).default;
      const res = await request(app)
        .post("/api/auth/login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: user.email, password: "Fixture123!" });
      const cookie = res.headers["set-cookie"]?.[0] || "";
      return cookie;
    }
  };
}
export const createKeys = ["id", "ticketNumber", "summary", "description", "requestedPriority", "itPriority", "currentStatus", "requesterResolved", "requesterResolvedAt", "requesterId", "ownerId", "categoryId", "relatedSystemId", "createdAt", "updatedAt"].sort();
export const listKeys = ["id", "ticketNumber", "summary", "requestedPriority", "itPriority", "currentStatus", "requesterResolved", "requesterResolvedAt", "categoryId", "categoryName", "relatedSystemId", "relatedSystemName", "createdAt", "updatedAt"].sort();

