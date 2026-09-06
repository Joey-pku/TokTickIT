import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/prisma.js";
export const db = getPrisma();
export async function ticketFixtures() {
  const suffix = randomUUID();
  const a = await db.developmentRequester.create({ data: { name: "Ticket test A", email: suffix + "a@example.com", department: "Test" } });
  const b = await db.developmentRequester.create({ data: { name: "Ticket test B", email: suffix + "b@example.com", department: "Test" } });
  const inactive = await db.developmentRequester.create({ data: { name: "Inactive", email: suffix + "i@example.com", department: "Test", isActive: false } });
  const category = await db.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const otherCategory = await db.category.findUniqueOrThrow({ where: { name: "Software" } });
  const system = await db.relatedSystem.findUniqueOrThrow({ where: { name: "VPN" } });
  const inactiveSystem = await db.relatedSystem.create({ data: { name: suffix, isActive: false } });
  const body = { categoryId: category.id, relatedSystemId: system.id, requestedPriority: "MEDIUM", summary: "VPN connection failed", description: "The VPN connection fails after entering my credentials." };
  async function clear() {
    const tickets = await db.ticket.findMany({ where: { requesterId: { in: [a.id, b.id, inactive.id] } }, select: { id: true } });
    await db.attachment.deleteMany({ where: { ticketId: { in: tickets.map(t => t.id) } } });
    await db.ticket.deleteMany({ where: { requesterId: { in: [a.id, b.id, inactive.id] } } });
  }
  return { a, b, inactive, category, otherCategory, system, inactiveSystem, body, clear,
    async dispose() {
      await clear();
      await db.developmentRequester.deleteMany({ where: { id: { in: [a.id, b.id, inactive.id] } } });
      await db.relatedSystem.delete({ where: { id: inactiveSystem.id } });
      await db.$disconnect();
    },
    async ticket(overrides: Record<string, unknown> = {}) {
      return db.ticket.create({ data: { ...body, requestedPriority: "MEDIUM", requesterId: a.id, ticketNumber: "FIX-" + randomUUID(), ...overrides } });
    },
  };
}
export const createKeys = ["id", "ticketNumber", "summary", "description", "requestedPriority", "currentStatus", "requesterId", "categoryId", "relatedSystemId", "createdAt", "updatedAt"].sort();
export const listKeys = ["id", "ticketNumber", "summary", "requestedPriority", "currentStatus", "categoryId", "categoryName", "relatedSystemId", "relatedSystemName", "createdAt", "updatedAt"].sort();

