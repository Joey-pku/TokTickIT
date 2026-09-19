import { randomBytes, createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import type { RequestHandler, Response, Request } from "express";
import bcrypt from "bcrypt";
import { getPrisma } from "./prisma.js";
import { sendError } from "./errors.js";
import type { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types placed on res.locals by requireAuth / requireAuthAllowMustChange
// ---------------------------------------------------------------------------
export interface AuthLocals {
  userId: number;
  userRole: Role;
  mustChangePassword: boolean;
  sessionId: string;
}

// ---------------------------------------------------------------------------
// Cookie / session helpers
// ---------------------------------------------------------------------------
const COOKIE_NAME = "toktickit_session";
const SESSION_SECONDS = 8 * 60 * 60; // 8 hours
const SESSION_MS = SESSION_SECONDS * 1000;
const ALLOWED_ORIGINS = new Set(["http://localhost:5173", "http://localhost:5174"]);

/** Generate a 32-byte random token (hex) and its SHA-256 digest stored in DB. */
export function makeSessionToken(): { raw: string; digest: string } {
  const raw = randomBytes(32).toString("hex");
  const digest = createHash("sha256").update(raw).digest("hex");
  return { raw, digest };
}

/** Write the session cookie. */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MS,
  });
}

/** Clear the session cookie. */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", path: "/" });
}

/** Parse toktickit_session from Cookie header without cookie-parser. */
function parseCookie(req: Request): string | undefined {
  const raw = req.headers.cookie ?? "";
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === COOKIE_NAME) return part.slice(eq + 1).trim();
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// CSRF middleware — must be applied to every mutating route
// ---------------------------------------------------------------------------
export const csrfProtection: RequestHandler = (req, res, next) => {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) { next(); return; }
  const header = req.get("X-Requested-With");
  if (header !== "XMLHttpRequest") { sendError(res, "CSRF_PROTECTION_FAILED"); return; }
  const origin = req.get("Origin");
  // Allow requests without an Origin header (integration tests / curl with the XRW header present).
  if (origin !== undefined && !ALLOWED_ORIGINS.has(origin)) { sendError(res, "CSRF_PROTECTION_FAILED"); return; }
  next();
};

// ---------------------------------------------------------------------------
// Session resolution helper (shared by middleware)
// ---------------------------------------------------------------------------
async function resolveSession(req: Request) {
  const raw = parseCookie(req);
  if (!raw) return null;
  const digest = createHash("sha256").update(raw).digest("hex");
  const db = getPrisma();
  const session = await db.session.findUnique({
    where: { token: digest },
    select: { id: true, expiresAt: true, userId: true, user: { select: { role: true, mustChangePassword: true, isActive: true } } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) return null; // expired
  if (!session.user.isActive) return null;
  return session;
}

// ---------------------------------------------------------------------------
// Auth middleware — blocks unauthenticated + mustChangePassword sessions
// ---------------------------------------------------------------------------
export const requireAuth: RequestHandler<Record<string, string>, unknown, unknown, Record<string, string>, AuthLocals> =
  async (req, res, next) => {
    try {
      const session = await resolveSession(req);
      if (!session) { sendError(res, "UNAUTHENTICATED"); return; }
      if (session.user.mustChangePassword) { sendError(res, "MUST_CHANGE_PASSWORD"); return; }
      res.locals.userId = session.userId;
      res.locals.userRole = session.user.role;
      res.locals.mustChangePassword = session.user.mustChangePassword;
      res.locals.sessionId = session.id;
      next();
    } catch { sendError(res, "INTERNAL_ERROR"); }
  };

/** Like requireAuth but allows sessions where mustChangePassword=true (for /auth/change-password). */
export const requireAuthAllowMustChange: RequestHandler<Record<string, string>, unknown, unknown, Record<string, string>, AuthLocals> =
  async (req, res, next) => {
    try {
      const session = await resolveSession(req);
      if (!session) { sendError(res, "UNAUTHENTICATED"); return; }
      res.locals.userId = session.userId;
      res.locals.userRole = session.user.role;
      res.locals.mustChangePassword = session.user.mustChangePassword;
      res.locals.sessionId = session.id;
      next();
    } catch { sendError(res, "INTERNAL_ERROR"); }
  };

/** Reusable role guard middleware. Enforces required roles, allowing Administrators for IT Staff routes. */
export const requireRole = (...roles: Role[]): RequestHandler<Record<string, string>, unknown, unknown, Record<string, string>, AuthLocals> => {
  return (_req, res, next) => {
    const userRole = res.locals.userRole;
    const isAllowed = roles.includes(userRole) || (roles.includes("IT_STAFF") && userRole === "ADMINISTRATOR");
    if (!isAllowed) {
      sendError(res, "FORBIDDEN");
      return;
    }
    next();
  };
};

// ---------------------------------------------------------------------------
// Password validation helpers
// ---------------------------------------------------------------------------
export function validatePasswordComplexity(password: string): boolean {
  const codePoints = Array.from(password).length;
  const bytes = Buffer.byteLength(password, "utf8");
  return codePoints >= 8 && bytes <= 72 &&
    /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) &&
    /[^a-zA-Z0-9\s]/.test(password);
}

// ---------------------------------------------------------------------------
// In-memory rate-limit store for login attempts (per email, case-insensitive)
// ---------------------------------------------------------------------------
interface RateBucket { attempts: number; firstAt: number }
const rateBuckets = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 5;

function checkRateLimit(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.firstAt >= RATE_WINDOW_MS) return false; // not limited
  return bucket.attempts >= RATE_MAX_ATTEMPTS;
}

function recordFailedAttempt(email: string): void {
  const key = email.toLowerCase();
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.firstAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { attempts: 1, firstAt: now });
  } else {
    bucket.attempts++;
  }
}

function clearRateLimit(email: string): void {
  rateBuckets.delete(email.toLowerCase());
}

// ---------------------------------------------------------------------------
// Auth router handlers (exported, mounted in app.ts)
// ---------------------------------------------------------------------------
import { Router } from "express";
export const auth = Router();

const userSelect = { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true } as const;

// POST /api/auth/login
auth.post("/login", csrfProtection, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!req.is("application/json") || !body || typeof body !== "object" || Array.isArray(body)) {
      sendError(res, "VALIDATION_ERROR", { body: "A JSON object is required." }); return;
    }
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email) { sendError(res, "VALIDATION_ERROR", { email: "Email is required." }); return; }
    if (!password) { sendError(res, "VALIDATION_ERROR", { password: "Password is required." }); return; }
    if (checkRateLimit(email)) { sendError(res, "TOO_MANY_REQUESTS"); return; }
    const db = getPrisma();
    const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { ...userSelect, passwordHash: true } });
    if (!user || !user.isActive) {
      recordFailedAttempt(email); sendError(res, "INVALID_CREDENTIALS"); return;
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      recordFailedAttempt(email); sendError(res, "INVALID_CREDENTIALS"); return;
    }
    clearRateLimit(email);
    const { raw, digest } = makeSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_MS);
    await db.session.create({ data: { id: randomUUID(), token: digest, userId: user.id, expiresAt } });
    setSessionCookie(res, raw);
    const { passwordHash: _ph, ...userDto } = user;
    res.json({ user: userDto });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

// POST /api/auth/logout
auth.post("/logout", csrfProtection, requireAuthAllowMustChange, async (_req, res) => {
  try {
    await getPrisma().session.delete({ where: { id: res.locals.sessionId } });
    clearSessionCookie(res);
    res.json({ message: "Logged out successfully." });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

// GET /api/auth/me
auth.get("/me", requireAuthAllowMustChange, async (_req, res) => {
  try {
    const user = await getPrisma().user.findUniqueOrThrow({ where: { id: res.locals.userId }, select: userSelect });
    res.json({ user });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

// POST /api/auth/change-password
auth.post("/change-password", csrfProtection, requireAuthAllowMustChange, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!req.is("application/json") || !body || typeof body !== "object" || Array.isArray(body)) {
      sendError(res, "VALIDATION_ERROR", { body: "A JSON object is required." }); return;
    }
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    const fields: Record<string, string> = {};
    if (!currentPassword) fields.currentPassword = "Current password is required.";
    if (!newPassword) fields.newPassword = "New password is required.";
    if (!confirmPassword) fields.confirmPassword = "Confirm password is required.";
    if (Object.keys(fields).length) { sendError(res, "VALIDATION_ERROR", fields); return; }
    if (newPassword !== confirmPassword) { sendError(res, "VALIDATION_ERROR", { confirmPassword: "Passwords do not match." }); return; }
    if (!validatePasswordComplexity(newPassword)) { sendError(res, "PASSWORD_COMPLEXITY_FAILED"); return; }
    const db = getPrisma();
    const user = await db.user.findUniqueOrThrow({ where: { id: res.locals.userId }, select: { passwordHash: true } });
    const currentMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatch) { sendError(res, "INVALID_CURRENT_PASSWORD"); return; }
    const sameAsNew = await bcrypt.compare(newPassword, user.passwordHash);
    if (sameAsNew) { sendError(res, "PASSWORD_SAME_AS_CURRENT"); return; }
    const newHash = await bcrypt.hash(newPassword, 10);
    const { raw, digest } = makeSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_MS);
    const currentId = res.locals.userId;
    await db.$transaction(async tx => {
      await tx.user.update({ where: { id: currentId }, data: { passwordHash: newHash, mustChangePassword: false } });
      // Invalidate all existing sessions
      await tx.session.deleteMany({ where: { userId: currentId } });
      // Create fresh session
      await tx.session.create({ data: { id: randomUUID(), token: digest, userId: currentId, expiresAt } });
    });
    setSessionCookie(res, raw);
    const updatedUser = await db.user.findUniqueOrThrow({ where: { id: currentId }, select: userSelect });
    res.json({ message: "Password changed successfully.", user: updatedUser });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});
