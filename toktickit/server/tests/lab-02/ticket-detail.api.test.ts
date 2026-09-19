import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { createKeys, db, ticketFixtures } from "./ticket-fixtures.js";
let f: Awaited<ReturnType<typeof ticketFixtures>>;
beforeAll(async () => { f = await ticketFixtures(); });
afterEach(async () => { vi.restoreAllMocks(); await f.clear(); });
afterAll(async () => { await f.dispose(); });
const detail = async (id: number | string, cookieOrUser?: string | { email: string }) => {
  let cookie = typeof cookieOrUser === "string" ? cookieOrUser : undefined;
  if (!cookieOrUser) cookie = await f.loginAs(f.a);
  else if (typeof cookieOrUser === "object") cookie = await f.loginAs(cookieOrUser);
  return request(app).get("/api/tickets/" + id).set("Cookie", cookie || "");
};

it("API-DTL-001,002,006: exact owned detail projects active/removed metadata only", async () => {
  const ticket = await f.ticket();
  for (const removed of [false, true]) await db.attachment.create({ data: {
    ticketId: ticket.id, originalFileName: "evidence.pdf", storedFileName: randomUUID(), filePath: "/PRIVATE/path",
    mimeType: "application/pdf", fileSizeBytes: 32, uploadedById: f.a.id,
    isRemoved: removed, removedAt: removed ? new Date() : null, removedById: removed ? f.a.id : null, removalReason: removed ? "Wrong document" : null,
  } });
  const res = await detail(ticket.id); expect(res.status).toBe(200);
  expect(Object.keys(res.body).sort()).toEqual([...createKeys, "requesterName", "categoryName", "relatedSystemName", "attachments", "comments"].sort());
  expect(res.body).toMatchObject({ id: ticket.id, requesterName: f.a.name, categoryName: "Hardware", relatedSystemName: "VPN", description: f.body.description });
  expect(res.body.attachments).toHaveLength(2);
  for (const attachment of res.body.attachments) {
    expect(Object.keys(attachment).sort()).toEqual(["id", "originalFileName", "mimeType", "fileSizeBytes", "isRemoved", "removedAt", "removalReason", "createdAt"].sort());
    if (attachment.isRemoved) expect(attachment.removalReason).toBe("Wrong document");
    else { expect(attachment.removalReason).toBeNull(); expect(attachment.removedAt).toBeNull(); }
  }
  expect(JSON.stringify(res.body)).not.toMatch(/PRIVATE|storedFileName|filePath|uploadedById|removedById/);
});
it("API-DTL-003,004: unowned and nonexistent return identical 404, never 403", async () => {
  const ticket = await f.ticket();
  const unowned = await detail(ticket.id, f.b); const absent = await detail(2147483647);
  expect(unowned.status).toBe(404); expect(absent.status).toBe(404); expect(unowned.body).toEqual(absent.body);
  expect(unowned.body).toEqual({ error: { code: "TICKET_NOT_FOUND", message: expect.any(String) } });
});
it("returns attachments: [] when none exist; GET does not mutate updatedAt", async () => {
  const ticket = await f.ticket(); const res = await detail(ticket.id);
  expect(res.status).toBe(200); expect(res.body.attachments).toEqual([]);
  expect((await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).updatedAt).toEqual(ticket.updatedAt);
});
it("API-DTL-005: requires session auth validation precedes resource lookup", async () => {
  const req = request(app).get("/api/tickets/2147483647");
  const res = await req; expect(res.status).toBe(401); expect(res.body.error.code).toBe("UNAUTHENTICATED");
});
it("rejects malformed path IDs", async () => {
  const res = await detail("1x"); expect(res.status).toBe(400); expect(res.body.error.code).toBe("VALIDATION_ERROR");
});
it("sanitizes unexpected database errors", async () => {
  vi.spyOn(db.ticket, "findFirst").mockRejectedValueOnce(new Error("PRIVATE SQL details"));
  const res = await detail(1); expect(res.status).toBe(500);
  expect(res.body).toEqual({ error: { code: "INTERNAL_ERROR", message: expect.any(String) } });
});

