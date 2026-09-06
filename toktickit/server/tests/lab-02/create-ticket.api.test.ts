import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createKeys, db, ticketFixtures } from "./ticket-fixtures.js";
let f: Awaited<ReturnType<typeof ticketFixtures>>;
beforeAll(async () => { f = await ticketFixtures(); });
afterEach(async () => { await f.clear(); });
afterAll(async () => { await f.dispose(); });
const post = (body: unknown, id?: number) => request(app).post("/api/tickets").set("x-requester-id", String(id ?? f.a.id)).set("Content-Type", "application/json").send(JSON.stringify(body));
it("API-TCK-001–006: creates the exact DTO, assigns ownership, NEW and equal backend timestamps", async () => {
  const before = Date.now();
  const res = await post(f.body);
  expect(res.status).toBe(201);
  expect(Object.keys(res.body).sort()).toEqual(createKeys);
  expect(res.body).toMatchObject({ ...f.body, requesterId: f.a.id, currentStatus: "NEW" });
  expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
  expect(Number(res.body.ticketNumber.slice(4, 8))).toBe(new Date(res.body.createdAt).getUTCFullYear());
  expect(res.body.updatedAt).toBe(res.body.createdAt);
  expect(Date.parse(res.body.createdAt)).toBeGreaterThanOrEqual(before - 1000);
  expect(Date.parse(res.body.createdAt)).toBeLessThanOrEqual(Date.now());
  const stored = await db.ticket.findUniqueOrThrow({ where: { id: res.body.id } });
  expect(stored.requesterId).toBe(f.a.id);
  expect(stored.createdAt.toISOString()).toBe(res.body.createdAt);
});
it("BR-01: concurrent HTTP creates produce distinct six-digit numbers", async () => {
  const responses = await Promise.all(Array.from({ length: 12 }, () => post(f.body)));
  for (const res of responses) { expect(res.status).toBe(201); expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/); }
  expect(new Set(responses.map(r => r.body.ticketNumber)).size).toBe(12);
});
it.each([
  ["summary", undefined], ["summary", "abcd"], ["summary", "x".repeat(101)], ["summary", "     "],
  ["description", undefined], ["description", "x".repeat(9)], ["description", "x".repeat(2001)], ["description", "   "],
  ["categoryId", undefined], ["categoryId", 2147483647], ["relatedSystemId", undefined], ["relatedSystemId", 2147483647],
  ["requestedPriority", "CRITICAL"], ["requestedPriority", undefined], ["requestedPriority", "medium"],
  ["categoryId", "1"], ["categoryId", 1.5], ["relatedSystemId", null], ["summary", 123], ["description", {}],
])("API-TCK-007–021: validates %s=%j", async (field, value) => {
  const res = await post({ ...f.body, [field]: value });
  expect(res.status).toBe(400);
  expect(res.body).toMatchObject({ error: { code: "VALIDATION_ERROR", message: expect.any(String), fields: { [field]: expect.any(String) } } });
  expect(await db.ticket.count({ where: { requesterId: f.a.id } })).toBe(0);
});
it("API-TCK-019: rejects an inactive Related System", async () => {
  const res = await post({ ...f.body, relatedSystemId: f.inactiveSystem.id });
  expect(res.status).toBe(400); expect(res.body.error.fields.relatedSystemId).toEqual(expect.any(String));
});
it.each(["id", "ticketNumber", "createdAt", "updatedAt", "currentStatus", "requesterId", "attachments", "futureField", "__proto__"])("API-TCK-026–027: rejects %s", async field => {
  const res = await post({ ...f.body, [field]: "forged" });
  expect(res.status).toBe(400); expect(res.body.error.code).toBe("VALIDATION_ERROR");
  expect(res.body.error.fields[field]).toEqual(expect.any(String));
});
it.each([[5, 10], [100, 2000]])("accepts trimmed boundaries %i/%i", async (summary, description) => {
  const res = await post({ ...f.body, summary: "  " + "s".repeat(summary) + "  ", description: "  " + "d".repeat(description) + "  " });
  expect(res.status).toBe(201); expect(res.body.summary).toHaveLength(summary); expect(res.body.description).toHaveLength(description);
});
it.each(["LOW", "MEDIUM", "HIGH"])("accepts explicit priority %s", async requestedPriority => {
  expect((await post({ ...f.body, requestedPriority })).status).toBe(201);
});
it("API-TCK-022–025: preserves exact requester-context errors", async () => {
  const cases = [
    [undefined, 400, "MISSING_REQUESTER_CONTEXT"], ["bad", 400, "INVALID_REQUESTER_ID"],
    [String(f.inactive.id), 404, "REQUESTER_NOT_FOUND"], ["2147483647", 404, "REQUESTER_NOT_FOUND"],
  ] as const;
  for (const [id, status, code] of cases) {
    const req = request(app).post("/api/tickets"); if (id !== undefined) req.set("x-requester-id", id);
    const res = await req.send(f.body); expect(res.status).toBe(status);
    expect(res.body).toEqual({ error: { code, message: expect.any(String) } });
  }
});
it.each([null, [], "text"])("rejects invalid JSON body shape %j", async body => {
  const res = await request(app).post("/api/tickets").set("x-requester-id", String(f.a.id)).set("Content-Type", "application/json").send(JSON.stringify(body));
  expect(res.status).toBe(400); expect(res.body.error.code).toBe("VALIDATION_ERROR");
});
it("returns a safe JSON validation envelope for malformed JSON", async () => {
  const res = await request(app).post("/api/tickets").set("x-requester-id", String(f.a.id)).set("Content-Type", "application/json").send("{broken");
  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: { code: "VALIDATION_ERROR", message: expect.any(String), fields: expect.any(Object) } });
  expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|stack|Prisma/);
});
