import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { canTransition, ticketStatuses, type TicketStatus } from "../../src/status-workflow.js";
import { ticketFixtures } from "../lab-02/ticket-fixtures.js";

const db = getPrisma();
const mutate = (cookie: string) => ({ Cookie: cookie, "X-Requested-With": "XMLHttpRequest" });

describe("Feature 18 Ticket workflow", () => {
  let f: Awaited<ReturnType<typeof ticketFixtures>>;
  let staff: any, admin: any;
  let staffCookie = "", adminCookie = "", requesterCookie = "";

  beforeAll(async () => {
    f = await ticketFixtures();
    const passwordHash = await bcrypt.hash("Fixture123!", 4), suffix = randomUUID();
    staff = await db.user.create({ data: { name: "Workflow Staff", email: `${suffix}-staff@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } });
    admin = await db.user.create({ data: { name: "Workflow Admin", email: `${suffix}-admin@example.com`, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false } });
    [staffCookie, adminCookie, requesterCookie] = await Promise.all([f.loginAs(staff), f.loginAs(admin), f.loginAs(f.a)]);
  });
  beforeEach(async () => { await f.clear(); });
  afterAll(async () => {
    await f.clear();
    await db.session.deleteMany({ where: { userId: { in: [staff.id, admin.id] } } });
    await db.user.deleteMany({ where: { id: { in: [staff.id, admin.id] } } });
    await f.dispose();
  });

  const patchStatus = (ticketId: number, cookie: string, status: TicketStatus, workflowVersion = 1) =>
    request(app).patch(`/api/staff/tickets/${ticketId}/status`).set(mutate(cookie)).send({ status, workflowVersion });

  async function qualifyingAction(ticketId: number) {
    return db.ticketAction.create({ data: {
      idempotencyKey: randomUUID(), ticketId, performedById: staff.id, assignedToId: staff.id,
      description: "Completed work supporting resolution.", result: "Service restored.", status: "COMPLETED",
    } });
  }

  it("API-WF-01/02/04: accepts every permitted pair for staff/admin, preserves same-state versions, and rejects every other pair", async () => {
    for (const role of [{ cookie: staffCookie, name: "staff" }, { cookie: adminCookie, name: "admin" }]) {
      for (const from of ticketStatuses) for (const to of ticketStatuses) {
        const ticket = await f.ticket({ currentStatus: from, resolvedAt: ["RESOLVED", "CLOSED"].includes(from) ? new Date() : null });
        if (to === "RESOLVED" && canTransition(from, to) && from !== to) await qualifyingAction(ticket.id);
        const response = await patchStatus(ticket.id, role.cookie, to);
        if (canTransition(from, to)) {
          expect(response.status, `${role.name}: ${from} -> ${to}`).toBe(200);
          expect(response.body.currentStatus).toBe(to);
          expect(response.body.workflowVersion).toBe(from === to ? 1 : 2);
        } else {
          expect(response.status, `${role.name}: ${from} -> ${to}`).toBe(409);
          expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
          expect(await db.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true, workflowVersion: true } })).toEqual({ currentStatus: from, workflowVersion: 1 });
        }
        await db.ticketAction.deleteMany({ where: { ticketId: ticket.id } });
        await db.ticket.delete({ where: { id: ticket.id } });
      }
    }
  }, 30000);

  it("API-WF-03/04 and SEC-01/02: requires exact versioned body, staff role, session, and CSRF", async () => {
    const ticket = await f.ticket({ currentStatus: "OPEN" });
    const invalidBodies = [{ status: "IN_PROGRESS" }, { status: "IN_PROGRESS", workflowVersion: 0 }, { status: "NOPE", workflowVersion: 1 }, { status: "IN_PROGRESS", workflowVersion: 1, extra: true }];
    for (const body of invalidBodies) expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set(mutate(staffCookie)).send(body)).body.error.code).toBe("VALIDATION_ERROR");
    expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", requesterCookie).set("X-Requested-With", "XMLHttpRequest").send({ status: "IN_PROGRESS", workflowVersion: 1 })).status).toBe(403);
    expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set("X-Requested-With", "XMLHttpRequest").send({ status: "IN_PROGRESS", workflowVersion: 1 })).status).toBe(401);
    expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/status`).set("Cookie", staffCookie).send({ status: "IN_PROGRESS", workflowVersion: 1 })).body.error.code).toBe("CSRF_PROTECTION_FAILED");
    expect(await db.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true, workflowVersion: true } })).toEqual({ currentStatus: "OPEN", workflowVersion: 1 });
  });

  it("API-WF-05/06/07: enforces the completed-result gate atomically and sets resolvedAt", async () => {
    const ticket = await f.ticket({ currentStatus: "OPEN" });
    const none = await patchStatus(ticket.id, staffCookie, "RESOLVED");
    expect(none.status).toBe(409); expect(none.body.error.code).toBe("ACTION_REQUIRED");
    const planned = await db.ticketAction.create({ data: { idempotencyKey: randomUUID(), ticketId: ticket.id, performedById: staff.id, assignedToId: staff.id, description: "Still planned." } });
    expect((await patchStatus(ticket.id, staffCookie, "RESOLVED")).body.error.code).toBe("ACTION_REQUIRED");
    await db.ticketAction.update({ where: { id: planned.id }, data: { status: "CANCELLED" } });
    expect((await patchStatus(ticket.id, staffCookie, "RESOLVED")).body.error.code).toBe("ACTION_REQUIRED");
    await expect(db.ticketAction.create({ data: { idempotencyKey: randomUUID(), ticketId: ticket.id, performedById: staff.id, assignedToId: staff.id, description: "Invalid completed work.", result: "   ", status: "COMPLETED" } })).rejects.toBeDefined();
    await qualifyingAction(ticket.id);
    const resolved = await patchStatus(ticket.id, adminCookie, "RESOLVED");
    expect(resolved.status).toBe(200); expect(resolved.body).toMatchObject({ currentStatus: "RESOLVED", workflowVersion: 2 }); expect(resolved.body.resolvedAt).toBeTruthy();
  });

  it("API-WF-05/06 and REL-03: concurrent Action completion and resolution never commits an unsupported RESOLVED state", async () => {
    const ticket = await f.ticket({ currentStatus: "OPEN" });
    const action = await db.ticketAction.create({ data: {
      idempotencyKey: randomUUID(), ticketId: ticket.id, performedById: staff.id, assignedToId: staff.id,
      description: "Work completing concurrently with resolution.", result: "", status: "IN_PROGRESS",
    } });

    const [completion, resolution] = await Promise.all([
      request(app).patch(`/api/tickets/${ticket.id}/actions/${action.id}`).set(mutate(staffCookie)).send({ version: 1, status: "COMPLETED", result: "Service restored concurrently." }),
      patchStatus(ticket.id, adminCookie, "RESOLVED"),
    ]);

    expect(completion.status).toBe(200);
    expect([200, 409]).toContain(resolution.status);
    if (resolution.status === 409) expect(resolution.body.error.code).toBe("ACTION_REQUIRED");
    const [storedTicket, storedAction] = await Promise.all([
      db.ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
      db.ticketAction.findUniqueOrThrow({ where: { id: action.id } }),
    ]);
    expect(storedAction).toMatchObject({ status: "COMPLETED", result: "Service restored concurrently." });
    if (storedTicket.currentStatus === "RESOLVED") {
      expect(storedTicket.resolvedAt).not.toBeNull();
      expect(storedTicket.workflowVersion).toBe(2);
    } else {
      expect(storedTicket).toMatchObject({ currentStatus: "OPEN", resolvedAt: null, workflowVersion: 1 });
      const retry = await patchStatus(ticket.id, adminCookie, "RESOLVED");
      expect(retry.status).toBe(200);
      expect(retry.body).toMatchObject({ currentStatus: "RESOLVED", workflowVersion: 2 });
    }
  });

  it("API-WF-02/04/05: rejected transitions preserve every workflow-controlled field", async () => {
    const advisoryAt = new Date("2026-10-30T05:00:00.000Z");
    const ticket = await f.ticket({
      currentStatus: "OPEN", ownerId: staff.id, requesterResolved: true, requesterResolvedAt: advisoryAt,
    });
    const select = { currentStatus: true, resolvedAt: true, workflowVersion: true, ownerId: true, requesterResolved: true, requesterResolvedAt: true } as const;
    const before = await db.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select });

    const missingAction = await patchStatus(ticket.id, staffCookie, "RESOLVED");
    expect(missingAction.body.error.code).toBe("ACTION_REQUIRED");
    expect(await db.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select })).toEqual(before);

    const invalid = await patchStatus(ticket.id, staffCookie, "CLOSED");
    expect(invalid.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    expect(await db.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select })).toEqual(before);

    const stale = await patchStatus(ticket.id, staffCookie, "IN_PROGRESS", 2);
    expect(stale.body.error.code).toBe("STALE_TICKET");
    expect(await db.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select })).toEqual(before);
  });

  it("API-WF-09/10: close preserves resolvedAt, reopen clears resolution/advisory fields, cancellation is terminal, and Actions survive", async () => {
    const when = new Date("2026-10-30T04:00:00.000Z");
    const ticket = await f.ticket({ currentStatus: "RESOLVED", resolvedAt: when, requesterResolved: true, requesterResolvedAt: when });
    const action = await qualifyingAction(ticket.id);
    const closed = await patchStatus(ticket.id, staffCookie, "CLOSED");
    expect(closed.body.resolvedAt).toBe(when.toISOString());
    const reopened = await patchStatus(ticket.id, adminCookie, "REOPENED", 2);
    expect(reopened.body).toMatchObject({ currentStatus: "REOPENED", workflowVersion: 3, requesterResolved: false, requesterResolvedAt: null, resolvedAt: null });
    expect(await db.ticketAction.findUnique({ where: { id: action.id } })).not.toBeNull();
    const cancelled = await f.ticket({ currentStatus: "CANCELLED" });
    const before = await db.ticket.findUniqueOrThrow({ where: { id: cancelled.id } });
    const rejected = await patchStatus(cancelled.id, staffCookie, "OPEN");
    expect(rejected.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    const after = await db.ticket.findUniqueOrThrow({ where: { id: cancelled.id } });
    expect(after).toMatchObject({ currentStatus: before.currentStatus, workflowVersion: before.workflowVersion, summary: before.summary });
  });

  it("API-WF-04 and REL-03: one concurrent transition wins and stale/same-state old versions cannot overwrite", async () => {
    const ticket = await f.ticket({ currentStatus: "OPEN" });
    const [one, two] = await Promise.all([patchStatus(ticket.id, staffCookie, "IN_PROGRESS"), patchStatus(ticket.id, adminCookie, "WAITING_FOR_REQUESTER")]);
    expect([one.status, two.status].sort()).toEqual([200, 409]);
    const loser = [one, two].find(value => value.status === 409)!;
    expect(loser.body.error.code).toBe("STALE_TICKET"); expect(loser.body.error.currentVersion).toBe(2);
    const staleSame = await patchStatus(ticket.id, staffCookie, (await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).currentStatus as TicketStatus, 1);
    expect(staleSame.body.error.code).toBe("STALE_TICKET");
  });

  it("REG-04: claiming a NEW Ticket preserves Lab 3 auto-open behavior and advances workflowVersion", async () => {
    const ticket = await f.ticket({ currentStatus: "NEW", ownerId: null });
    const response = await request(app).patch(`/api/staff/tickets/${ticket.id}/assign`).set(mutate(staffCookie)).send({ ownerId: staff.id });
    expect(response.status).toBe(200);
    expect(await db.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true, workflowVersion: true } })).toEqual({ currentStatus: "OPEN", workflowVersion: 2 });
  });
});
