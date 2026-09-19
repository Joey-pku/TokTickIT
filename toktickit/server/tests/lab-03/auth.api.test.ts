import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const db = getPrisma();
const XRW = "XMLHttpRequest";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
interface TestUser { id: number; email: string; passwordRaw: string }

async function createUser(overrides: { email?: string; name?: string; role?: string; isActive?: boolean; mustChangePassword?: boolean; password?: string } = {}): Promise<TestUser & { sessionCookie: string }> {
  const passwordRaw = overrides.password ?? "TestPass1!";
  const passwordHash = await bcrypt.hash(passwordRaw, 4);
  const email = overrides.email ?? `test-${randomUUID()}@example.com`;
  const user = await db.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email,
      passwordHash,
      role: (overrides.role ?? "REQUESTER") as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR",
      isActive: overrides.isActive ?? true,
      mustChangePassword: overrides.mustChangePassword ?? false,
    },
  });
  // Log in to obtain a session cookie
  const loginRes = await request(app).post("/api/auth/login").set("X-Requested-With", XRW).send({ email, password: passwordRaw });
  const cookie = loginRes.headers["set-cookie"]?.[0] ?? "";
  return { id: user.id, email, passwordRaw, sessionCookie: cookie };
}

async function cleanupUser(id: number) {
  await db.session.deleteMany({ where: { userId: id } });
  await db.user.deleteMany({ where: { id } });
}

// ---------------------------------------------------------------------------
// Auth: Login
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  let user: TestUser;
  beforeAll(async () => { user = await createUser({ password: "MyPass99@" }); });
  afterAll(async () => { await cleanupUser(user.id); });

  it("AUTH-LOGIN-01: returns 403 CSRF_PROTECTION_FAILED without X-Requested-With", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: "MyPass99@" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_PROTECTION_FAILED");
  });

  it("AUTH-LOGIN-02: returns 401 INVALID_CREDENTIALS for wrong password", async () => {
    const res = await request(app).post("/api/auth/login").set("X-Requested-With", XRW).send({ email: user.email, password: "WrongPass!" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("AUTH-LOGIN-03: returns 401 INVALID_CREDENTIALS for unknown email", async () => {
    const res = await request(app).post("/api/auth/login").set("X-Requested-With", XRW).send({ email: "nope@example.com", password: "SomePass1!" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("AUTH-LOGIN-04: returns 200 and sets cookie on valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").set("X-Requested-With", XRW).send({ email: user.email, password: "MyPass99@" });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: user.email, isActive: true });
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("AUTH-LOGIN-05: rejects inactive user with 401", async () => {
    const inactive = await createUser({ isActive: false, password: "Pass123!!" });
    const res = await request(app).post("/api/auth/login").set("X-Requested-With", XRW).send({ email: inactive.email, password: "Pass123!!" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    await cleanupUser(inactive.id);
  });

  it("AUTH-LOGIN-06: rate-limits after 5 consecutive failures", async () => {
    const victim = await createUser({ password: "Correct1!" });
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/auth/login").set("X-Requested-With", XRW).send({ email: victim.email, password: "Wrong!" });
    }
    const res = await request(app).post("/api/auth/login").set("X-Requested-With", XRW).send({ email: victim.email, password: "Correct1!" });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("TOO_MANY_REQUESTS");
    await cleanupUser(victim.id);
  });
});

// ---------------------------------------------------------------------------
// Auth: GET /api/auth/me
// ---------------------------------------------------------------------------
describe("GET /api/auth/me", () => {
  let cookie: string;
  let userId: number;
  beforeAll(async () => { const u = await createUser(); cookie = u.sessionCookie; userId = u.id; });
  afterAll(async () => { await cleanupUser(userId); });

  it("AUTH-ME-01: returns 401 with no cookie", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("AUTH-ME-02: returns user profile with valid session", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("AUTH-ME-03: returns 401 for expired session", async () => {
    const expiredUser = await createUser();
    // Manually expire the session in the database
    await db.session.updateMany({
      where: { userId: expiredUser.id },
      data: { expiresAt: new Date(Date.now() - 10000) } // 10 seconds ago
    });
    const res = await request(app).get("/api/auth/me").set("Cookie", expiredUser.sessionCookie);
    expect(res.status).toBe(401);
    await cleanupUser(expiredUser.id);
  });
});

// ---------------------------------------------------------------------------
// Auth: Logout
// ---------------------------------------------------------------------------
describe("POST /api/auth/logout", () => {
  let cookie: string;
  let userId: number;
  beforeAll(async () => { const u = await createUser(); cookie = u.sessionCookie; userId = u.id; });
  afterAll(async () => { await cleanupUser(userId); });

  it("AUTH-LOGOUT-01: returns 200 and clears cookie", async () => {
    const res = await request(app).post("/api/auth/logout").set("X-Requested-With", XRW).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });

  it("AUTH-LOGOUT-02: session no longer works after logout", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Auth: Change password
// ---------------------------------------------------------------------------
describe("POST /api/auth/change-password", () => {
  let userId: number;
  let cookie: string;
  const originalPassword = "OldPass1@";

  beforeEach(async () => {
    const u = await createUser({ password: originalPassword });
    userId = u.id; cookie = u.sessionCookie;
  });
  afterEach(async () => { await cleanupUser(userId); });

  it("AUTH-CHPW-01: returns 400 PASSWORD_COMPLEXITY_FAILED for weak new password", async () => {
    const res = await request(app).post("/api/auth/change-password").set("X-Requested-With", XRW).set("Cookie", cookie)
      .send({ currentPassword: originalPassword, newPassword: "weak", confirmPassword: "weak" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PASSWORD_COMPLEXITY_FAILED");
  });

  it("AUTH-CHPW-02: returns 400 INVALID_CURRENT_PASSWORD for wrong current", async () => {
    const res = await request(app).post("/api/auth/change-password").set("X-Requested-With", XRW).set("Cookie", cookie)
      .send({ currentPassword: "WrongOld1!", newPassword: "NewPass2@", confirmPassword: "NewPass2@" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
  });

  it("AUTH-CHPW-03: returns 400 PASSWORD_SAME_AS_CURRENT when new == current", async () => {
    const res = await request(app).post("/api/auth/change-password").set("X-Requested-With", XRW).set("Cookie", cookie)
      .send({ currentPassword: originalPassword, newPassword: originalPassword, confirmPassword: originalPassword });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PASSWORD_SAME_AS_CURRENT");
  });

  it("AUTH-CHPW-04: returns 400 VALIDATION_ERROR when passwords do not match", async () => {
    const res = await request(app).post("/api/auth/change-password").set("X-Requested-With", XRW).set("Cookie", cookie)
      .send({ currentPassword: originalPassword, newPassword: "NewPass2@", confirmPassword: "DifferentPass3!" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("AUTH-CHPW-05: succeeds and returns new session cookie", async () => {
    const res = await request(app).post("/api/auth/change-password").set("X-Requested-With", XRW).set("Cookie", cookie)
      .send({ currentPassword: originalPassword, newPassword: "NewPass2@", confirmPassword: "NewPass2@" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/changed/i);
    expect(res.body.user.mustChangePassword).toBe(false);
    expect(res.headers["set-cookie"]).toBeDefined();
    const changed = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
    expect(bcrypt.getRounds(changed.passwordHash)).toBe(10);
  });

  it("AUTH-CHPW-06: old session is invalidated after password change", async () => {
    await request(app).post("/api/auth/change-password").set("X-Requested-With", XRW).set("Cookie", cookie)
      .send({ currentPassword: originalPassword, newPassword: "NewPass2@", confirmPassword: "NewPass2@" });
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// CSRF protection on mutating routes
// ---------------------------------------------------------------------------
describe("CSRF protection", () => {
  it("CSRF-01: rejects POST /api/auth/login without X-Requested-With", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "x" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_PROTECTION_FAILED");
  });

  it("CSRF-02: rejects POST /api/tickets without X-Requested-With (returns 403 not 401)", async () => {
    // Even without a session, CSRF fires first
    const res = await request(app).post("/api/tickets").send({ summary: "test" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_PROTECTION_FAILED");
  });

  it("CSRF-02b: CSRF rejection precedes malformed JSON parsing", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_PROTECTION_FAILED");
  });

  it("CSRF-02c: rejects untrusted and null origins", async () => {
    for (const origin of ["https://evil.example", "null", "http://127.0.0.1:5173"]) {
      const res = await request(app).post("/api/auth/login").set("X-Requested-With", XRW).set("Origin", origin).send({ email: "a@b.com", password: "x" });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_PROTECTION_FAILED");
    }
  });

  it("CSRF-03: allows requests without Origin header (integration test / curl pattern)", async () => {
    // A request with X-Requested-With but no Origin header should not be rejected for CSRF
    const res = await request(app).post("/api/auth/login").set("X-Requested-With", XRW).send({ email: "nobody@example.com", password: "x" });
    // Will get 401 INVALID_CREDENTIALS, not 403 CSRF_PROTECTION_FAILED
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// mustChangePassword enforcement
// ---------------------------------------------------------------------------
describe("mustChangePassword guard", () => {
  let userId: number;
  let cookie: string;
  beforeAll(async () => { const u = await createUser({ mustChangePassword: true }); userId = u.id; cookie = u.sessionCookie; });
  afterAll(async () => { await cleanupUser(userId); });

  it("MCP-01: blocks access to /api/tickets with MUST_CHANGE_PASSWORD", async () => {
    const res = await request(app).get("/api/tickets").set("Cookie", cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MUST_CHANGE_PASSWORD");
  });

  it("MCP-02: allows GET /api/auth/me even with mustChangePassword", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });

  it("MCP-03: allows POST /api/auth/change-password with mustChangePassword session", async () => {
    // We just check it reaches the password-validation layer, not that CSRF fires first
    const res = await request(app).post("/api/auth/change-password").set("X-Requested-With", XRW).set("Cookie", cookie)
      .send({ currentPassword: "bad", newPassword: "NewPass2@", confirmPassword: "NewPass2@" });
    expect(res.status).not.toBe(403);
  });
});

afterAll(async () => { await db.$disconnect(); });
