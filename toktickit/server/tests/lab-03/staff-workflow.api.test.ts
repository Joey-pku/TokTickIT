import request from "supertest";
import bcrypt from "bcrypt";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { ticketFixtures } from "../lab-02/ticket-fixtures.js";

describe("Feature 12 staff workflow", () => {
  let f: Awaited<ReturnType<typeof ticketFixtures>>;
  let staff: any, staff2: any, admin: any, inactive: any;
  let staffCookie = "", staff2Cookie = "", adminCookie = "", requesterCookie = "";
  const mutate = (cookie: string) => ({ Cookie: cookie, "X-Requested-With": "XMLHttpRequest" });
  beforeAll(async () => {
    f = await ticketFixtures(); const passwordHash = await bcrypt.hash("Fixture123!", 10);
    staff = await (await import("../../src/prisma.js")).getPrisma().user.create({ data: { name: "Staff One", email: `staff-${Date.now()}@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } });
    staff2 = await (await import("../../src/prisma.js")).getPrisma().user.create({ data: { name: "Staff Two", email: `staff2-${Date.now()}@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } });
    admin = await (await import("../../src/prisma.js")).getPrisma().user.create({ data: { name: "Admin Ops", email: `admin-${Date.now()}@example.com`, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false } });
    inactive = await (await import("../../src/prisma.js")).getPrisma().user.create({ data: { name: "Inactive Staff", email: `inactive-staff-${Date.now()}@example.com`, role: "IT_STAFF", isActive: false, passwordHash, mustChangePassword: false } });
    [staffCookie, staff2Cookie, adminCookie, requesterCookie] = await Promise.all([f.loginAs(staff), f.loginAs(staff2), f.loginAs(admin), f.loginAs(f.a)]);
  });
  beforeEach(async () => { await f.clear(); });
  afterAll(async () => {
    await f.clear(); const db = (await import("../../src/prisma.js")).getPrisma();
    await db.session.deleteMany({ where: { userId: { in: [staff.id, staff2.id, admin.id, inactive.id] } } });
    await db.user.deleteMany({ where: { id: { in: [staff.id, staff2.id, admin.id, inactive.id] } } });
    await f.dispose();
  });

  it("API-QUEUE-01–04: staff/admin queue searches, filters, paginates, and rejects invalid input", async () => {
    await f.ticket({ summary: "Unique battery issue", ownerId: staff.id, currentStatus: "OPEN", itPriority: "HIGH" });
    await f.ticket({ summary: "Other issue", requesterId: f.b.id, currentStatus: "IN_PROGRESS" });
    const result = await request(app).get("/api/staff/tickets?search=battery&status=OPEN&itPriority=HIGH&ownerId=me&pageSize=10").set("Cookie", staffCookie);
    expect(result.status).toBe(200); expect(result.body.items).toHaveLength(1); expect(result.body.items[0].requesterName).toBe(f.a.name);
    expect((await request(app).get("/api/staff/tickets").set("Cookie", adminCookie)).status).toBe(200);
    expect((await request(app).get("/api/staff/tickets?pageSize=11").set("Cookie", staffCookie)).body.error.code).toBe("VALIDATION_ERROR");
    expect((await request(app).get("/api/staff/tickets").set("Cookie", requesterCookie)).status).toBe(403);
  });

  it("API-STAFF-01,02,14: claims atomically, reassigns, unassigns, and rejects ineligible owners", async () => {
    const ticket = await f.ticket();
    const [one, two] = await Promise.all([
      request(app).patch(`/api/staff/tickets/${ticket.id}/assign`).set(mutate(staffCookie)).send({ ownerId: staff.id }),
      request(app).patch(`/api/staff/tickets/${ticket.id}/assign`).set(mutate(staff2Cookie)).send({ ownerId: staff2.id }),
    ]);
    expect([one.status, two.status].sort()).toEqual([200, 409]);
    const claimed = [one, two].find(r => r.status === 200)!; expect(claimed.body.currentStatus).toBe("OPEN");
    expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/assign`).set(mutate(staffCookie)).send({ ownerId: f.a.id })).body.error.code).toBe("INELIGIBLE_OWNER");
    expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/assign`).set(mutate(staffCookie)).send({ ownerId: inactive.id })).body.error.code).toBe("INELIGIBLE_OWNER");
    expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/assign`).set(mutate(staffCookie)).send({ ownerId: null })).body.ownerId).toBeNull();
  });

  it("API-STAFF-03–05,10: keeps requested priority, enforces transitions, and clears ineligible owner on reopen", async () => {
    const ticket = await f.ticket({ ownerId: staff.id, currentStatus: "OPEN", requestedPriority: "LOW", itPriority: "LOW" });
    const priority = await request(app).patch(`/api/staff/tickets/${ticket.id}/priority`).set(mutate(staffCookie)).send({ itPriority: "HIGH" });
    expect(priority.body).toMatchObject({ requestedPriority: "LOW", itPriority: "HIGH" });
    expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set(mutate(staffCookie)).send({ status: "CLOSED" })).body.error.code).toBe("INVALID_STATUS_TRANSITION");
    expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set(mutate(staffCookie)).send({ status: "OPEN" })).status).toBe(200);
    await (await import("../../src/prisma.js")).getPrisma().ticket.update({ where: { id: ticket.id }, data: { currentStatus: "RESOLVED", ownerId: inactive.id, requesterResolved: true, requesterResolvedAt: new Date() } });
    const reopened = await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set(mutate(adminCookie)).send({ status: "REOPENED" });
    expect(reopened.body).toMatchObject({ currentStatus: "REOPENED", ownerId: null, requesterResolved: false, requesterResolvedAt: null });
  });

  it("API-COM-01–04 and API-NOTE-01–05: enforces visibility, validation, attribution, and reset", async () => {
    const ticket = await f.ticket({ currentStatus: "OPEN", requesterResolved: true, requesterResolvedAt: new Date() });
    const requesterComment = await request(app).post(`/api/tickets/${ticket.id}/comments`).set(mutate(requesterCookie)).send({ content: "<b>literal</b>" });
    expect(requesterComment.status).toBe(201); expect(requesterComment.body.content).toBe("<b>literal</b>");
    expect((await (await import("../../src/prisma.js")).getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).requesterResolved).toBe(false);
    expect((await request(app).post(`/api/tickets/${ticket.id}/comments`).set(mutate(staffCookie)).send({ content: "Staff update" })).status).toBe(201);
    expect((await request(app).post(`/api/tickets/${ticket.id}/comments`).set(mutate(staffCookie)).send({ content: "   " })).body.error.code).toBe("VALIDATION_ERROR");
    expect((await request(app).get(`/api/tickets/${ticket.id}/internal-notes`).set("Cookie", requesterCookie)).status).toBe(404);
    expect((await request(app).post(`/api/tickets/${ticket.id}/internal-notes`).set(mutate(requesterCookie)).send({ content: "secret" })).status).toBe(404);
    const note = await request(app).post(`/api/tickets/${ticket.id}/internal-notes`).set(mutate(staffCookie)).send({ content: "<script>literal</script>" });
    expect(note.status).toBe(201); expect(note.body).toMatchObject({ authorName: staff.name, content: "<script>literal</script>" });
    const detail = await request(app).get(`/api/staff/tickets/${ticket.id}`).set("Cookie", adminCookie); expect(detail.body.internalNotes).toHaveLength(1);
    const requesterDetail = await request(app).get(`/api/tickets/${ticket.id}`).set("Cookie", requesterCookie); expect(requesterDetail.body.internalNotes).toBeUndefined();
  });

  it("API-STAT-06,07,09,11–13: resolution intent is role/owner/status constrained and concurrent-idempotent", async () => {
    const ticket = await f.ticket({ currentStatus: "IN_PROGRESS" });
    const calls = await Promise.all(Array.from({ length: 4 }, () => request(app).post(`/api/tickets/${ticket.id}/appear-resolved`).set(mutate(requesterCookie)).send({})));
    expect(calls.every(r => r.status === 200)).toBe(true);
    const db = (await import("../../src/prisma.js")).getPrisma(); const updated = await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(updated.requesterResolvedAt).not.toBeNull();
    expect(await db.comment.count({ where: { ticketId: ticket.id, content: "Requester indicated that the problem appears resolved." } })).toBe(1);
    expect((await request(app).post(`/api/tickets/${ticket.id}/appear-resolved`).set(mutate(staffCookie)).send({})).status).toBe(403);
    expect((await request(app).post(`/api/tickets/${ticket.id}/appear-resolved`).set(mutate(await f.loginAs(f.b))).send({})).status).toBe(404);
    const invalid = await f.ticket({ currentStatus: "NEW" }); expect((await request(app).post(`/api/tickets/${invalid.id}/appear-resolved`).set(mutate(requesterCookie)).send({})).body.error.code).toBe("INVALID_STATUS_FOR_RESOLUTION");
  });
});
