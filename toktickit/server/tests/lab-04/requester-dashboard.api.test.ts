import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { db, ticketFixtures } from "../lab-02/ticket-fixtures.js";
import type { Ticket } from "@prisma/client";

describe("Feature 19 requester dashboard", () => {
  let f: Awaited<ReturnType<typeof ticketFixtures>>;
  let requesterCookie = "", emptyCookie = "", staffCookie = "";
  let staff: { id: number; email: string };
  beforeAll(async () => {
    f = await ticketFixtures();
    staff = await db.user.create({ data: { name: "Dashboard Staff", email: `${randomUUID()}@example.com`, role: "IT_STAFF", passwordHash: await bcrypt.hash("Fixture123!", 4), mustChangePassword: false } });
    [requesterCookie, emptyCookie, staffCookie] = await Promise.all([f.loginAs(f.a), f.loginAs(f.b), f.loginAs(staff)]);
  });
  beforeEach(async () => { await f.clear(); });
  afterAll(async () => {
    await f.clear(); await db.session.deleteMany({ where: { userId: staff.id } }); await db.user.delete({ where: { id: staff.id } }); await f.dispose();
  });

  it("API-RD-01/02/03: returns exact owned counts and stable top-five lists without Action duplication", async () => {
    const tied = new Date("2026-10-31T02:00:00.000Z");
    const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "CANCELLED"] as const;
    const owned: Ticket[] = [];
    for (const [index, currentStatus] of statuses.entries()) owned.push(await f.ticket({ currentStatus, updatedAt: index < 2 ? tied : new Date(tied.getTime() - index * 1000) }));
    const resolved = await f.ticket({ currentStatus: "RESOLVED", resolvedAt: tied, updatedAt: tied });
    const closed = await f.ticket({ currentStatus: "CLOSED", resolvedAt: tied, updatedAt: tied });
    await db.ticketAction.createMany({ data: [1, 2].map(() => ({ idempotencyKey: randomUUID(), ticketId: owned[0].id, performedById: staff.id, assignedToId: staff.id, description: "Dashboard duplicate guard" })) });
    await db.ticket.create({ data: { categoryId: f.category.id, relatedSystemId: f.system.id, requestedPriority: "MEDIUM", itPriority: "MEDIUM", summary: f.body.summary, description: f.body.description, ticketNumber: `FOREIGN-${randomUUID()}`, requesterId: f.b.id, currentStatus: "WAITING_FOR_REQUESTER" } });

    const response = await request(app).get("/api/dashboard/requester").set("Cookie", requesterCookie);
    expect(response.status).toBe(200);
    expect(response.body.metrics).toEqual({ active: 5, waitingForRequester: 1 });
    expect(response.body.recentlyUpdated).toHaveLength(5);
    expect(response.body.recentlyUpdated.map((item: any) => item.id)).toEqual([closed.id, resolved.id, owned[1].id, owned[0].id, owned[2].id]);
    expect(response.body.recentlyResolved.map((item: any) => item.id)).toEqual([closed.id, resolved.id]);
    expect(JSON.stringify(response.body)).not.toContain("FOREIGN-");
    expect(response.body.recentlyUpdated[0]).toEqual(expect.objectContaining({ href: `/tickets/${closed.id}` }));
  });

  it("API-RD-04: returns exact zero schema and unchanged UTC timestamps", async () => {
    const response = await request(app).get("/api/dashboard/requester").set("Cookie", emptyCookie);
    expect(response.body).toEqual({ metrics: { active: 0, waitingForRequester: 0 }, recentlyUpdated: [], recentlyResolved: [], drillDown: { active: "/tickets?view=active", waitingForRequester: "/tickets?status=WAITING_FOR_REQUESTER", recentlyUpdated: "/tickets?sortBy=updatedAt&sortOrder=desc", recentlyResolved: "/tickets?view=resolved" } });
  });

  it("SEC-04: rejects unauthenticated and non-requester roles", async () => {
    expect((await request(app).get("/api/dashboard/requester")).status).toBe(401);
    const forbidden = await request(app).get("/api/dashboard/requester").set("Cookie", staffCookie);
    expect(forbidden.status).toBe(403); expect(forbidden.body.error.code).toBe("FORBIDDEN");
  });

  it("API-RD-05: drill-down list filters match the dashboard populations", async () => {
    await f.ticket({ currentStatus: "WAITING_FOR_REQUESTER" });
    await f.ticket({ currentStatus: "OPEN" });
    for (let index = 0; index < 6; index++) await f.ticket({ currentStatus: index % 2 ? "CLOSED" : "RESOLVED", resolvedAt: new Date(Date.UTC(2026, 9, 31, 1, index)), updatedAt: new Date(Date.UTC(2026, 9, 31, 2, index)) });
    const dashboard = await request(app).get("/api/dashboard/requester").set("Cookie", requesterCookie);
    const active = await request(app).get("/api/tickets?view=active").set("Cookie", requesterCookie);
    const waiting = await request(app).get("/api/tickets?status=WAITING_FOR_REQUESTER").set("Cookie", requesterCookie);
    const updated = await request(app).get("/api/tickets?sortBy=updatedAt&sortOrder=desc").set("Cookie", requesterCookie);
    const resolved = await request(app).get("/api/tickets?view=resolved").set("Cookie", requesterCookie);
    expect(active.body.pagination.totalItems).toBe(dashboard.body.metrics.active);
    expect(waiting.body.pagination.totalItems).toBe(dashboard.body.metrics.waitingForRequester);
    expect(dashboard.body.recentlyUpdated.map((item: any) => item.id)).toEqual(updated.body.items.slice(0, 5).map((item: any) => item.id));
    expect(dashboard.body.recentlyResolved.map((item: any) => item.id)).toEqual(resolved.body.items.slice(0, 5).map((item: any) => item.id));
    expect(resolved.body.pagination.totalItems).toBe(6);
  });
});
