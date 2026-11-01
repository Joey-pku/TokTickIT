import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { activeTicketStatuses } from "../../src/dashboard-rules.js";
import { db, ticketFixtures } from "../lab-02/ticket-fixtures.js";

describe("Feature 20 staff dashboard", () => {
  let f: Awaited<ReturnType<typeof ticketFixtures>>;
  let staff: any, other: any, admin: any;
  let staffCookie = "", adminCookie = "", requesterCookie = "";
  beforeAll(async () => {
    f = await ticketFixtures(); const passwordHash = await bcrypt.hash("Fixture123!", 4), suffix = randomUUID();
    [staff, other, admin] = await Promise.all([
      db.user.create({ data: { name: "Dashboard Staff", email: `${suffix}-staff@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } }),
      db.user.create({ data: { name: "Other Staff", email: `${suffix}-other@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } }),
      db.user.create({ data: { name: "Dashboard Admin", email: `${suffix}-admin@example.com`, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false } }),
    ]);
    [staffCookie, adminCookie, requesterCookie] = await Promise.all([f.loginAs(staff), f.loginAs(admin), f.loginAs(f.a)]);
  });
  beforeEach(async () => { await f.clear(); });
  afterAll(async () => { await f.clear(); const ids = [staff.id, other.id, admin.id]; await db.session.deleteMany({ where: { userId: { in: ids } } }); await db.user.deleteMany({ where: { id: { in: ids } } }); await f.dispose(); });

  async function populate() {
    const future = new Date("2035-10-31T04:00:00.000Z"), tickets: any[] = [];
    const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
    for (const [index, currentStatus] of statuses.entries()) tickets.push(await f.ticket({ currentStatus, ownerId: index === 1 ? staff.id : index === 2 ? other.id : null, itPriority: index % 3 === 0 ? "HIGH" : index % 3 === 1 ? "MEDIUM" : "LOW", updatedAt: new Date(future.getTime() + index) }));
    for (let index = 0; index < 6; index++) tickets.push(await f.ticket({ currentStatus: index % 2 ? "OPEN" : "REOPENED", ownerId: index === 0 ? staff.id : null, itPriority: "HIGH", updatedAt: future }));
    for (let index = 0; index < 6; index++) await db.ticketAction.create({ data: { idempotencyKey: randomUUID(), ticketId: tickets[0].id, performedById: other.id, assignedToId: staff.id, description: `Current work ${index}`, status: index % 2 ? "PLANNED" : "IN_PROGRESS", updatedAt: future } });
    await db.ticketAction.create({ data: { idempotencyKey: randomUUID(), ticketId: tickets[0].id, performedById: other.id, assignedToId: staff.id, description: "Completed excluded", status: "COMPLETED", result: "Done" } });
    await db.ticketAction.create({ data: { idempotencyKey: randomUUID(), ticketId: tickets[0].id, performedById: staff.id, assignedToId: other.id, description: "Other assignee excluded" } });
  }

  it("API-SD-01/02/03/06: returns exact snapshot metrics, stable top-five Tickets/Actions, and matching drill-downs", async () => {
    await populate();
    const response = await request(app).get("/api/dashboard/staff").set("Cookie", staffCookie);
    expect(response.status).toBe(200);
    const statusGroups = await db.ticket.groupBy({ by: ["currentStatus"], _count: { _all: true } });
    for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"]) expect(response.body.byStatus[status]).toBe(statusGroups.find(group => group.currentStatus === status)?._count._all ?? 0);
    const activeWhere = { currentStatus: { in: [...activeTicketStatuses] } };
    expect(response.body.metrics).toEqual({ unassignedActive: await db.ticket.count({ where: { ...activeWhere, ownerId: null } }), ownedByMeActive: await db.ticket.count({ where: { ...activeWhere, ownerId: staff.id } }) });
    for (const priority of ["LOW", "MEDIUM", "HIGH"] as const) expect(response.body.activeByPriority[priority]).toBe(await db.ticket.count({ where: { ...activeWhere, itPriority: priority } }));
    const urgent = await db.ticket.findMany({ where: { ...activeWhere, itPriority: "HIGH" }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: { id: true } });
    expect(response.body.recentUrgent.map((item: any) => item.id)).toEqual(urgent.map(item => item.id));
    const actions = await db.ticketAction.findMany({ where: { assignedToId: staff.id, status: { in: ["PLANNED", "IN_PROGRESS"] } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: { id: true } });
    expect(response.body.myCurrentActions.map((item: any) => item.id)).toEqual(actions.map(item => item.id));
    expect(response.body.myCurrentActions[0].href).toMatch(/^\/staff\/tickets\/\d+#action-\d+$/);
    const actionPath = response.body.myCurrentActions[0].href.split("#")[0].replace("/staff/tickets/", "/api/staff/tickets/");
    expect((await request(app).get(actionPath).set("Cookie", staffCookie)).status).toBe(200);
    for (const [href, expected] of [[response.body.drillDown.unassignedActive, response.body.metrics.unassignedActive], [response.body.drillDown.ownedByMeActive, response.body.metrics.ownedByMeActive], [response.body.drillDown.recentUrgent, response.body.activeByPriority.HIGH]] as const) {
      const query = href.slice(href.indexOf("?"));
      const list = await request(app).get(`/api/staff/tickets${query}`).set("Cookie", staffCookie); expect(list.status).toBe(200); expect(list.body.pagination.totalItems).toBe(expected);
    }
    const expectedUrgent = await db.ticket.findMany({ where: { ...activeWhere, itPriority: "HIGH" }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true } });
    const exhausted: number[] = [];
    for (let page = 1; page <= Math.ceil(expectedUrgent.length / 10); page++) {
      const list = await request(app).get(`/api/staff/tickets?view=active&itPriority=HIGH&page=${page}`).set("Cookie", staffCookie);
      exhausted.push(...list.body.items.map((item: any) => item.id));
    }
    expect(exhausted).toEqual(expectedUrgent.map(item => item.id));
    expect(response.body.recentUrgent.map((item: any) => item.id)).toEqual(exhausted.slice(0, 5));
  });

  it("API-SD-04/05 and SEC-04: exposes all zero-capable keys equally to staff/admin and rejects requester/anonymous access", async () => {
    const staffResponse = await request(app).get("/api/dashboard/staff").set("Cookie", staffCookie);
    const adminResponse = await request(app).get("/api/dashboard/staff").set("Cookie", adminCookie);
    expect(staffResponse.status).toBe(200); expect(adminResponse.status).toBe(200);
    expect(Object.keys(staffResponse.body.byStatus)).toEqual(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"]);
    expect(Object.keys(staffResponse.body.activeByPriority)).toEqual(["LOW", "MEDIUM", "HIGH"]);
    expect(staffResponse.body.myCurrentActions).toEqual([]); expect(adminResponse.body.myCurrentActions).toEqual([]);
    expect(adminResponse.body.byStatus).toEqual(staffResponse.body.byStatus); expect(adminResponse.body.activeByPriority).toEqual(staffResponse.body.activeByPriority);
    expect((await request(app).get("/api/dashboard/staff").set("Cookie", requesterCookie)).status).toBe(403);
    expect((await request(app).get("/api/dashboard/staff")).status).toBe(401);
  });
});
