import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const db = getPrisma();
const password = "ActionsTest1!";
const userIds: number[] = [];
const ticketIds: number[] = [];

async function createUser(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR", name: string, isActive = true) {
  const user = await db.user.create({ data: { name, email: `${randomUUID()}@example.com`, passwordHash: await bcrypt.hash(password, 4), role, isActive, mustChangePassword: false } });
  userIds.push(user.id); return user;
}

async function login(user: { email: string }) {
  const response = await request(app).post("/api/auth/login").set("X-Requested-With", "XMLHttpRequest").send({ email: user.email, password });
  return response.headers["set-cookie"]?.[0] ?? "";
}

const headers = (cookie: string) => ({ Cookie: cookie, "X-Requested-With": "XMLHttpRequest" });

describe("Feature 16 Actions Taken API", () => {
  let requesterA: any, requesterB: any, staffA: any, staffB: any, admin: any, inactiveStaff: any;
  let requesterACookie: string, requesterBCookie: string, staffACookie: string, adminCookie: string;
  let ticket: any;

  beforeAll(async () => {
    requesterA = await createUser("REQUESTER", "Action Requester A");
    requesterB = await createUser("REQUESTER", "Action Requester B");
    staffA = await createUser("IT_STAFF", "Action Staff A");
    staffB = await createUser("IT_STAFF", "Action Staff B");
    admin = await createUser("ADMINISTRATOR", "Action Admin");
    inactiveStaff = await createUser("IT_STAFF", "Inactive Action Staff", false);
    [requesterACookie, requesterBCookie, staffACookie, adminCookie] = await Promise.all([login(requesterA), login(requesterB), login(staffA), login(admin)]);
    const category = await db.category.findFirstOrThrow();
    const system = await db.relatedSystem.findFirstOrThrow();
    ticket = await db.ticket.create({ data: {
      ticketNumber: `ACT-${randomUUID()}`, summary: "Action foundation ticket", description: "Ticket used to verify Actions Taken behavior.",
      requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "IN_PROGRESS", requesterId: requesterA.id,
      ownerId: staffB.id, categoryId: category.id, relatedSystemId: system.id,
    } });
    ticketIds.push(ticket.id);
  });

  afterAll(async () => {
    const actions = await db.ticketAction.findMany({ where: { ticketId: { in: ticketIds } }, select: { id: true } });
    await db.ticketActionRevision.deleteMany({ where: { actionId: { in: actions.map(value => value.id) } } });
    await db.ticketAction.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await db.internalNote.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await db.comment.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await db.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await db.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  });

  const payload = (overrides: Record<string, unknown> = {}) => ({
    idempotencyKey: randomUUID(), assignedToId: staffB.id,
    description: "Inspect the affected network path.", result: "",
    followUpRequired: false, followUpNote: null, attachmentNotes: null,
    status: "PLANNED", ...overrides,
  });

  async function create(overrides: Record<string, unknown> = {}, cookie = staffACookie) {
    return request(app).post(`/api/tickets/${ticket.id}/actions`).set(headers(cookie)).send(payload(overrides));
  }

  it("API-ACT-01/02/06: creates and lists complete ordered representations with separate owner, performer, and assignee", async () => {
    const first = await create({ description: "  Inspect the affected network path.  ", attachmentNotes: "  See trace.txt.  " });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ ticketId: ticket.id, performedById: staffA.id, assignedToId: staffB.id, description: "Inspect the affected network path.", attachmentNotes: "See trace.txt.", status: "PLANNED", version: 1 });
    expect(first.body.performedByName).toBe(staffA.name); expect(first.body.assignedToName).toBe(staffB.name);
    expect(first.body).not.toHaveProperty("revisions");
    const second = await create({ description: "Second ordered action.", assignedToId: admin.id }, adminCookie);
    expect(second.status).toBe(201);
    const listed = await request(app).get(`/api/tickets/${ticket.id}/actions`).set("Cookie", staffACookie);
    expect(listed.status).toBe(200);
    const positions = listed.body.items.filter((item: any) => [first.body.id, second.body.id].includes(item.id)).map((item: any) => item.id);
    expect(positions).toEqual([first.body.id, second.body.id]);
  });

  it("API-ACT-03/04 and SEC-05: enforces exact body, type, field, and text boundaries without partial writes", async () => {
    const before = await db.ticketAction.count({ where: { ticketId: ticket.id } });
    const cases = [
      { body: payload({ description: " " }), field: "description" },
      { body: payload({ description: "x".repeat(2001) }), field: "description" },
      { body: payload({ result: "x".repeat(2001) }), field: "result" },
      { body: payload({ result: null }), field: "result" },
      { body: payload({ followUpRequired: true, followUpNote: " " }), field: "followUpNote" },
      { body: payload({ followUpRequired: false, followUpNote: "not allowed" }), field: "followUpNote" },
      { body: payload({ attachmentNotes: " " }), field: "attachmentNotes" },
      { body: payload({ idempotencyKey: "not-a-uuid" }), field: "idempotencyKey" },
      { body: payload({ status: "COMPLETED", result: "done" }), field: "status" },
      { body: payload({ status: null }), field: "status" },
      { body: { ...payload(), performedById: staffB.id }, field: "performedById" },
    ];
    for (const value of cases) {
      const response = await request(app).post(`/api/tickets/${ticket.id}/actions`).set(headers(staffACookie)).send(value.body);
      expect(response.status, value.field).toBe(400); expect(response.body.error.code).toBe("VALIDATION_ERROR"); expect(response.body.error.fields[value.field]).toBeDefined();
    }
    expect((await db.ticketAction.count({ where: { ticketId: ticket.id } }))).toBe(before);
    expect((await create({ description: "x", result: "", attachmentNotes: "x" })).status).toBe(201);
    expect((await create({ description: "x".repeat(2000), result: "x".repeat(2000), followUpRequired: true, followUpNote: "x".repeat(2000), attachmentNotes: "x".repeat(2000) })).status).toBe(201);
  });

  it("API-ACT-05 and SEC-03: enforces assignee eligibility and returns only active staff/admin choices", async () => {
    for (const assignedToId of [requesterA.id, inactiveStaff.id, 2147483647]) {
      const response = await create({ assignedToId });
      expect(response.status).toBe(409); expect(response.body.error.code).toBe("INELIGIBLE_ASSIGNEE");
    }
    const choices = await request(app).get("/api/action-assignees").set("Cookie", adminCookie);
    expect(choices.status).toBe(200);
    const choiceIds = choices.body.items.map((item: any) => item.id);
    expect(choiceIds).toContain(staffA.id); expect(choiceIds).toContain(admin.id);
    expect(choiceIds).not.toContain(requesterA.id); expect(choiceIds).not.toContain(inactiveStaff.id);
  });

  it("API-ACT-12 and SEC-01/02/06: enforces session, CSRF, role, ownership, and safe responses", async () => {
    const action = await create({ description: "Requester-visible work." }); expect(action.status).toBe(201);
    const own = await request(app).get(`/api/tickets/${ticket.id}/actions`).set("Cookie", requesterACookie);
    expect(own.status).toBe(200); expect(own.body.items.some((item: any) => item.id === action.body.id)).toBe(true); expect(JSON.stringify(own.body)).not.toContain("beforeState");
    const other = await request(app).get(`/api/tickets/${ticket.id}/actions`).set("Cookie", requesterBCookie);
    expect(other.status).toBe(404); expect(other.body.error.code).toBe("TICKET_NOT_FOUND");
    expect((await request(app).get(`/api/tickets/${ticket.id}/actions`)).status).toBe(401);
    const requesterWrite = await request(app).post(`/api/tickets/${ticket.id}/actions`).set(headers(requesterACookie)).send(payload());
    expect(requesterWrite.status).toBe(403);
    const noCsrf = await request(app).post(`/api/tickets/${ticket.id}/actions`).set("Cookie", staffACookie).send(payload());
    expect(noCsrf.status).toBe(403); expect(noCsrf.body.error.code).toBe("CSRF_PROTECTION_FAILED"); expect(JSON.stringify(noCsrf.body)).not.toMatch(/stack|sql|passwordHash/i);
  });

  it("API-ACT-14/15 and REL-01: serializes duplicate creates and detects conflicting idempotency payloads", async () => {
    const key = randomUUID(); const body = payload({ idempotencyKey: key, description: "Idempotent action." });
    const attempts = await Promise.all([1, 2].map(() => request(app).post(`/api/tickets/${ticket.id}/actions`).set(headers(staffACookie)).send(body)));
    expect(attempts.map(value => value.status).sort()).toEqual([200, 201]);
    expect(await db.ticketAction.count({ where: { idempotencyKey: key } })).toBe(1);
    expect(attempts.find(value => value.status === 200)!.headers["idempotent-replay"]).toBe("true");
    const conflict = await request(app).post(`/api/tickets/${ticket.id}/actions`).set(headers(staffACookie)).send({ ...body, description: "Different data." });
    expect(conflict.status).toBe(409); expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("API-ACT-07/08/13/16: edits atomically, audits once, and rejects stale writers", async () => {
    const created = await create({ description: "Versioned action." }); expect(created.status).toBe(201);
    const edit = await request(app).patch(`/api/tickets/${ticket.id}/actions/${created.body.id}`).set(headers(adminCookie)).send({ version: 1, assignedToId: admin.id, description: "Versioned action updated.", status: "IN_PROGRESS" });
    expect(edit.status).toBe(200); expect(edit.body).toMatchObject({ version: 2, assignedToId: admin.id, status: "IN_PROGRESS" });
    const revisions = await db.ticketActionRevision.findMany({ where: { actionId: created.body.id } });
    expect(revisions).toHaveLength(1); expect(revisions[0].version).toBe(2); expect(revisions[0].editedById).toBe(admin.id);
    expect(revisions[0].beforeState).toMatchObject({ version: 1, description: "Versioned action." });
    expect(revisions[0].afterState).toMatchObject({ version: 2, description: "Versioned action updated." });
    const stale = await request(app).patch(`/api/tickets/${ticket.id}/actions/${created.body.id}`).set(headers(staffACookie)).send({ version: 1, result: "stale overwrite" });
    expect(stale.status).toBe(409); expect(stale.body.error).toMatchObject({ code: "STALE_ACTION", currentVersion: 2 });
    expect((await db.ticketActionRevision.count({ where: { actionId: created.body.id } }))).toBe(1);
  });

  it("API-ACT-07/09: enforces completion result, Action transitions, and terminal restrictions", async () => {
    const created = await create({ description: "Transition action." });
    const noResult = await request(app).patch(`/api/tickets/${ticket.id}/actions/${created.body.id}`).set(headers(staffACookie)).send({ version: 1, status: "COMPLETED" });
    expect(noResult.status).toBe(400); expect(noResult.body.error.fields.result).toBeDefined();
    const completed = await request(app).patch(`/api/tickets/${ticket.id}/actions/${created.body.id}`).set(headers(staffACookie)).send({ version: 1, status: "COMPLETED", result: "Service restored." });
    expect(completed.status).toBe(200); expect(completed.body.status).toBe("COMPLETED");
    const terminal = await request(app).patch(`/api/tickets/${ticket.id}/actions/${created.body.id}`).set(headers(staffACookie)).send({ version: 2, description: "Forbidden edit" });
    expect(terminal.status).toBe(409); expect(terminal.body.error.code).toBe("TERMINAL_ACTION");
    const other = await create({ description: "Invalid transition action.", status: "IN_PROGRESS" });
    const invalid = await request(app).patch(`/api/tickets/${ticket.id}/actions/${other.body.id}`).set(headers(staffACookie)).send({ version: 1, status: "PLANNED" });
    expect(invalid.status).toBe(409); expect(invalid.body.error.code).toBe("INVALID_ACTION_TRANSITION");
  });

  it("API-ACT-10/11 and API-ACT-05: unassigns transactionally and permits only audited reassignment recovery", async () => {
    await db.user.update({ where: { id: staffB.id }, data: { role: "IT_STAFF", isActive: true } });
    const created = await create({ description: "Recover unassigned action.", assignedToId: staffB.id }); expect(created.status).toBe(201);
    const demote = await request(app).patch(`/api/admin/users/${staffB.id}`).set(headers(adminCookie)).send({ name: staffB.name, email: staffB.email, department: staffB.department, role: "REQUESTER", isActive: true });
    expect(demote.status).toBe(200);
    const unassigned = await db.ticketAction.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(unassigned.assignedToId).toBeNull(); expect(unassigned.version).toBe(2);
    expect(await db.ticketActionRevision.count({ where: { actionId: created.body.id } })).toBe(1);
    const edit = await request(app).patch(`/api/tickets/${ticket.id}/actions/${created.body.id}`).set(headers(staffACookie)).send({ version: 2, description: "blocked" });
    expect(edit.status).toBe(409); expect(edit.body.error.code).toBe("ACTION_UNASSIGNED");
    const combined = await request(app).patch(`/api/tickets/${ticket.id}/actions/${created.body.id}`).set(headers(staffACookie)).send({ version: 2, assignedToId: staffA.id, result: "not allowed together" });
    expect(combined.status).toBe(400);
    const reassigned = await request(app).patch(`/api/tickets/${ticket.id}/actions/${created.body.id}`).set(headers(staffACookie)).send({ version: 2, assignedToId: staffA.id });
    expect(reassigned.status).toBe(200); expect(reassigned.body).toMatchObject({ assignedToId: staffA.id, version: 3 });
    expect(await db.ticketActionRevision.count({ where: { actionId: created.body.id } })).toBe(2);
  });
});
