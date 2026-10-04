import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const db = getPrisma();
const password = "AdminTest1!";
const cookies = new Map<number, string>();
const ids: number[] = [];
async function user(role: "REQUESTER"|"IT_STAFF"|"ADMINISTRATOR", name: string) { const value = await db.user.create({ data: { name, email: `${randomUUID()}@example.com`, passwordHash: await bcrypt.hash(password, 4), role, mustChangePassword: false } }); ids.push(value.id); return value; }
async function login(target: { id: number; email: string }) { const response = await request(app).post("/api/auth/login").set("X-Requested-With", "XMLHttpRequest").send({ email: target.email, password }); const cookie = response.headers["set-cookie"]?.[0] ?? ""; cookies.set(target.id, cookie); return cookie; }
const auth = (cookie: string) => ({ Cookie: cookie, "X-Requested-With": "XMLHttpRequest" });

describe("Feature 13 administrator user management", () => {
  let adminA: any, adminB: any, staff: any, requester: any, categoryId: number, systemId: number;
  beforeAll(async () => { adminA = await user("ADMINISTRATOR", "Admin Alpha"); adminB = await user("ADMINISTRATOR", "Admin Beta"); staff = await user("IT_STAFF", "Staff Target"); requester = await user("REQUESTER", "Requester Target"); await Promise.all([login(adminA), login(adminB), login(staff), login(requester)]); categoryId = (await db.category.findFirstOrThrow()).id; systemId = (await db.relatedSystem.findFirstOrThrow()).id; });
  afterAll(async () => { await db.internalNote.deleteMany({ where: { authorId: { in: ids } } }); await db.comment.deleteMany({ where: { authorId: { in: ids } } }); await db.attachment.deleteMany({ where: { uploadedById: { in: ids } } }); await db.ticket.deleteMany({ where: { OR: [{ requesterId: { in: ids } }, { ownerId: { in: ids } }] } }); await db.session.deleteMany({ where: { userId: { in: ids } } }); await db.user.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect(); });

  it("API-ADM-01/09: enforces access and validates list queries", async () => {
    expect((await request(app).get("/api/admin/users")).status).toBe(401);
    expect((await request(app).get("/api/admin/users").set("Cookie", cookies.get(staff.id)!)).status).toBe(403);
    const result = await request(app).get("/api/admin/users").query({ search: "Admin Alpha", role: "ADMINISTRATOR" }).set("Cookie", cookies.get(adminA.id)!);
    expect(result.status).toBe(200); expect(result.body.items.some((item: any) => item.id === adminA.id)).toBe(true); expect(result.body.items[0]).not.toHaveProperty("passwordHash");
    expect((await request(app).get("/api/admin/users?role=ROOT").set("Cookie", cookies.get(adminA.id)!)).body.error.code).toBe("VALIDATION_ERROR");
  });

  it("API-ADM-02/03: creates forced-change users and rejects case-insensitive concurrent duplicates", async () => {
    const email = `${randomUUID()}@Example.com`; const body = { name: "Created User", email, department: "Support", role: "IT_STAFF", isActive: true, initialPassword: "Temporary1!" };
    const created = await request(app).post("/api/admin/users").set(auth(cookies.get(adminA.id)!)).send(body);
    expect(created.status).toBe(201); ids.push(created.body.user.id); expect(created.body.user.mustChangePassword).toBe(true); expect(created.body.user.department).toBe("Support"); expect(created.body.user).not.toHaveProperty("passwordHash");
    const duplicateAttempt = await request(app).post("/api/admin/users").set(auth(cookies.get(adminA.id)!)).send({ ...body, email: email.toUpperCase() }); expect(duplicateAttempt.body.error.code).toBe("DUPLICATE_EMAIL");
    const concurrentEmail = `${randomUUID()}@example.com`; const attempts = await Promise.all([concurrentEmail.toUpperCase(), concurrentEmail.toLowerCase()].map(value => request(app).post("/api/admin/users").set(auth(cookies.get(adminA.id)!)).send({ ...body, email: value })));
    expect(attempts.map(value => value.status).sort()).toEqual([201, 409]); ids.push(attempts.find(value => value.status === 201)!.body.user.id);
    expect((await request(app).post("/api/admin/users").set("Cookie", cookies.get(adminA.id)!).send(body)).body.error.code).toBe("CSRF_PROTECTION_FAILED");
  });

  it("API-ADM-04/08: edit preserves seed identity, clears active ownership, preserves historical ownership, and revokes deactivated sessions", async () => {
    const seedKey = `test:${randomUUID()}`; await db.user.update({ where: { id: staff.id }, data: { seedKey } });
    const active = await db.ticket.create({ data: { ticketNumber: `ADM-${randomUUID()}`, summary: "Active owner cleanup", description: "Active owner cleanup fixture.", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "OPEN", requesterId: requester.id, ownerId: staff.id, categoryId, relatedSystemId: systemId } });
    const closed = await db.ticket.create({ data: { ticketNumber: `ADM-${randomUUID()}`, summary: "Historical owner kept", description: "Historical owner preservation fixture.", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "CLOSED", requesterId: requester.id, ownerId: staff.id, categoryId, relatedSystemId: systemId } });
    const changed = await request(app).patch(`/api/admin/users/${staff.id}`).set(auth(cookies.get(adminA.id)!)).send({ name: "Staff Demoted", email: staff.email, department: null, role: "REQUESTER", isActive: true });
    expect(changed.status).toBe(200); expect((await db.user.findUniqueOrThrow({ where: { id: staff.id } })).seedKey).toBe(seedKey); expect((await db.ticket.findUniqueOrThrow({ where: { id: active.id } })).ownerId).toBeNull(); expect((await db.ticket.findUniqueOrThrow({ where: { id: closed.id } })).ownerId).toBe(staff.id); expect((await request(app).get("/api/staff/tickets").set("Cookie", cookies.get(staff.id)!)).status).toBe(403);
    const collision = await request(app).patch(`/api/admin/users/${staff.id}`).set(auth(cookies.get(adminA.id)!)).send({ name: "Collision", email: requester.email.toUpperCase(), department: null, role: "REQUESTER", isActive: true }); expect(collision.body.error.code).toBe("DUPLICATE_EMAIL");
    await db.user.update({ where: { id: staff.id }, data: { role: "IT_STAFF" } });
    const deactivated = await request(app).patch(`/api/admin/users/${staff.id}`).set(auth(cookies.get(adminA.id)!)).send({ name: "Staff Target", email: staff.email, department: null, role: "IT_STAFF", isActive: false }); expect(deactivated.status).toBe(200);
    expect((await request(app).get("/api/auth/me").set("Cookie", cookies.get(staff.id)!)).status).toBe(401);
    const reactivated = await request(app).patch(`/api/admin/users/${staff.id}`).set(auth(cookies.get(adminA.id)!)).send({ name: "Staff Target", email: staff.email, department: null, role: "IT_STAFF", isActive: true }); expect(reactivated.status).toBe(200); expect((await request(app).get("/api/auth/me").set("Cookie", cookies.get(staff.id)!)).status).toBe(401);
  });

  it("API-ADM-05/06: blocks self-deactivation and atomically retains an active administrator", async () => {
    const self = await request(app).patch(`/api/admin/users/${adminA.id}`).set(auth(cookies.get(adminA.id)!)).send({ name: adminA.name, email: adminA.email, department: null, role: "ADMINISTRATOR", isActive: false }); expect(self.body.error.code).toBe("CANNOT_DEACTIVATE_SELF");
    const others = await db.user.findMany({ where: { role: "ADMINISTRATOR", isActive: true, id: { notIn: [adminA.id, adminB.id] } }, select: { id: true } });
    await db.user.updateMany({ where: { id: { in: others.map(value => value.id) } }, data: { isActive: false } });
    let responses: any[] = [];
    try {
      responses = await Promise.all([
        request(app).patch(`/api/admin/users/${adminB.id}`).set(auth(cookies.get(adminA.id)!)).send({ name: adminB.name, email: adminB.email, department: null, role: "REQUESTER", isActive: true }),
        request(app).patch(`/api/admin/users/${adminA.id}`).set(auth(cookies.get(adminB.id)!)).send({ name: adminA.name, email: adminA.email, department: null, role: "REQUESTER", isActive: true }),
      ]);
    } finally {
      await db.user.updateMany({ where: { id: { in: [adminA.id, adminB.id] } }, data: { role: "ADMINISTRATOR", isActive: true } });
      await db.user.updateMany({ where: { id: { in: others.map(value => value.id) } }, data: { isActive: true } });
    }
    expect(responses.map(value => value.status).sort()).toEqual([200, 400]); expect(responses.find(value => value.status === 400)!.body.error.code).toBe("CANNOT_DEACTIVATE_LAST_ADMIN");
  });

  it("API-ADM-07: reset requires a different valid password and atomically revokes sessions", async () => {
    await db.user.update({ where: { id: requester.id }, data: { passwordHash: await bcrypt.hash(password, 4), mustChangePassword: false, isActive: true } }); const oldCookie = await login(requester);
    const same = await request(app).post(`/api/admin/users/${requester.id}/reset-password`).set(auth(cookies.get(adminA.id)!)).send({ initialPassword: password }); expect(same.body.error.code).toBe("PASSWORD_SAME_AS_CURRENT");
    const reset = await request(app).post(`/api/admin/users/${requester.id}/reset-password`).set(auth(cookies.get(adminA.id)!)).send({ initialPassword: "Replacement2!" }); expect(reset.status).toBe(200); expect((await db.user.findUniqueOrThrow({ where: { id: requester.id } })).mustChangePassword).toBe(true); expect((await request(app).get("/api/auth/me").set("Cookie", oldCookie)).status).toBe(401);
  });

  it("serializes assignment against deactivation so an ineligible owner cannot remain", async () => {
    await db.user.update({ where: { id: staff.id }, data: { role: "IT_STAFF", isActive: true } }); const staffCookie = await login(staff);
    const ticket = await db.ticket.create({ data: { ticketNumber: `ADM-${randomUUID()}`, summary: "Concurrent owner cleanup", description: "Concurrent eligibility cleanup fixture.", requestedPriority: "LOW", itPriority: "LOW", requesterId: requester.id, categoryId, relatedSystemId: systemId } });
    await Promise.all([
      request(app).patch(`/api/staff/tickets/${ticket.id}/assign`).set(auth(staffCookie)).send({ ownerId: staff.id }),
      request(app).patch(`/api/admin/users/${staff.id}`).set(auth(cookies.get(adminA.id)!)).send({ name: staff.name, email: staff.email, department: null, role: "IT_STAFF", isActive: false }),
    ]);
    expect((await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).ownerId).toBeNull();
  });
});
