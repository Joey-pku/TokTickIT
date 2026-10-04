import { Router } from "express";
import bcrypt from "bcrypt";
import type { Prisma, Role } from "@prisma/client";
import { requireAuth, requireRole, validatePasswordComplexity } from "./auth.js";
import { getPrisma } from "./prisma.js";
import { sendError } from "./errors.js";
import { lockUserEligibility } from "./user-eligibility-lock.js";

export const admin = Router();
admin.use(requireAuth, requireRole("ADMINISTRATOR"));

const roles = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const;
const activeStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const userSelect = { id: true, name: true, email: true, department: true, role: true, isActive: true, mustChangePassword: true, createdAt: true, updatedAt: true } as const;
const parseId = (raw: string) => /^\d+$/.test(raw) && Number(raw) > 0 && Number(raw) <= 2147483647 ? Number(raw) : null;
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const duplicate = (error: unknown) => typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";

function profile(body: Record<string, unknown>, includePassword: boolean) {
  const allowed = ["name", "email", "department", "role", "isActive", ...(includePassword ? ["initialPassword"] : [])];
  const fields: Record<string, string> = {};
  for (const key of Object.keys(body)) if (!allowed.includes(key)) fields[key] = "This field is not allowed.";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const department = body.department === null || body.department === undefined || body.department === "" ? null : typeof body.department === "string" ? body.department.trim() : "";
  if (name.length < 2 || name.length > 100) fields.name = "Full name must be between 2 and 100 characters.";
  if (!emailValid(email)) fields.email = "Enter a valid email address.";
  if (department !== null && (department.length < 1 || department.length > 100)) fields.department = "Department must be at most 100 characters.";
  if (!roles.includes(body.role as Role)) fields.role = "Select a valid role.";
  if (typeof body.isActive !== "boolean") fields.isActive = "Active status is required.";
  const initialPassword = includePassword && typeof body.initialPassword === "string" ? body.initialPassword : "";
  if (includePassword && !validatePasswordComplexity(initialPassword)) fields.initialPassword = "Password does not meet complexity requirements.";
  return { fields, data: { name, email, department, role: body.role as Role, isActive: body.isActive as boolean }, initialPassword };
}

admin.get("/users", async (req, res) => {
  try {
    const q = req.query, fields: Record<string, string> = {};
    const allowed = ["search", "role", "sortBy", "sortOrder", "page", "pageSize"];
    for (const [key, value] of Object.entries(q)) if (!allowed.includes(key) || typeof value !== "string") fields[key] = "Invalid query parameter.";
    if (q.role !== undefined && !roles.includes(q.role as Role)) fields.role = "Select a valid role.";
    const sortBy = q.sortBy ?? "name", sortOrder = q.sortOrder ?? "asc";
    if (!["name", "email", "role", "createdAt", "updatedAt"].includes(sortBy as string)) fields.sortBy = "Invalid sort column.";
    if (!["asc", "desc"].includes(sortOrder as string)) fields.sortOrder = "Invalid sort order.";
    const number = (key: string, fallback: number) => q[key] === undefined ? fallback : typeof q[key] === "string" && /^\d+$/.test(q[key] as string) ? Number(q[key]) : NaN;
    const page = number("page", 1), pageSize = number("pageSize", 10);
    if (!Number.isSafeInteger(page) || page < 1) fields.page = "A positive integer is required.";
    if (![10, 25, 50].includes(pageSize)) fields.pageSize = "Page size must be 10, 25, or 50.";
    if (Object.keys(fields).length) { sendError(res, "VALIDATION_ERROR", fields); return; }
    const search = typeof q.search === "string" ? q.search.trim() : "";
    const where: Prisma.UserWhereInput = { ...(q.role ? { role: q.role as Role } : {}), ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}) };
    const db = getPrisma();
    const [items, totalItems] = await db.$transaction([
      db.user.findMany({ where, select: userSelect, orderBy: [{ [sortBy as string]: sortOrder }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      db.user.count({ where }),
    ]);
    res.json({ items, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

admin.post("/users", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (!req.is("application/json") || !body || typeof body !== "object" || Array.isArray(body)) { sendError(res, "VALIDATION_ERROR", { body: "A JSON object is required." }); return; }
  const parsed = profile(body, true);
  if (Object.keys(parsed.fields).length) { sendError(res, "VALIDATION_ERROR", parsed.fields); return; }
  try {
    const passwordHash = await bcrypt.hash(parsed.initialPassword, 10);
    const user = await getPrisma().user.create({ data: { ...parsed.data, passwordHash, mustChangePassword: true }, select: userSelect });
    res.status(201).json({ user });
  } catch (error) { if (duplicate(error)) sendError(res, "DUPLICATE_EMAIL"); else sendError(res, "INTERNAL_ERROR"); }
});

admin.patch("/users/:userId", async (req, res) => {
  const userId = parseId(req.params.userId); if (!userId) { sendError(res, "USER_NOT_FOUND"); return; }
  const body = req.body as Record<string, unknown>;
  if (!req.is("application/json") || !body || typeof body !== "object" || Array.isArray(body)) { sendError(res, "VALIDATION_ERROR", { body: "A JSON object is required." }); return; }
  const parsed = profile(body, false);
  if (Object.keys(parsed.fields).length) { sendError(res, "VALIDATION_ERROR", parsed.fields); return; }
  try {
    const result = await getPrisma().$transaction(async tx => {
      await lockUserEligibility(tx);
      const current = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
      if (!current) return { error: "USER_NOT_FOUND" as const };
      if (userId === res.locals.userId && current.isActive && !parsed.data.isActive) return { error: "CANNOT_DEACTIVATE_SELF" as const };
      const removesActiveAdmin = current.role === "ADMINISTRATOR" && current.isActive && (parsed.data.role !== "ADMINISTRATOR" || !parsed.data.isActive);
      if (removesActiveAdmin && await tx.user.count({ where: { role: "ADMINISTRATOR", isActive: true } }) <= 1) return { error: "CANNOT_DEACTIVATE_LAST_ADMIN" as const };
      const losesOwnerEligibility = (current.role !== "REQUESTER" && parsed.data.role === "REQUESTER") || (current.isActive && !parsed.data.isActive);
      const user = await tx.user.update({ where: { id: userId }, data: parsed.data, select: userSelect });
      if (losesOwnerEligibility) await tx.ticket.updateMany({ where: { ownerId: userId, currentStatus: { in: activeStatuses } }, data: { ownerId: null } });
      if (current.isActive && !parsed.data.isActive) await tx.session.deleteMany({ where: { userId } });
      return { user };
    });
    if ("error" in result && result.error) { sendError(res, result.error); return; }
    res.json({ user: result.user });
  } catch (error) { if (duplicate(error)) sendError(res, "DUPLICATE_EMAIL"); else sendError(res, "INTERNAL_ERROR"); }
});

admin.post("/users/:userId/reset-password", async (req, res) => {
  const userId = parseId(req.params.userId); if (!userId) { sendError(res, "USER_NOT_FOUND"); return; }
  const body = req.body as Record<string, unknown>, initialPassword = typeof body?.initialPassword === "string" ? body.initialPassword : "";
  if (!req.is("application/json") || !body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => key !== "initialPassword") || !validatePasswordComplexity(initialPassword)) { sendError(res, "VALIDATION_ERROR", { initialPassword: "Password does not meet complexity requirements." }); return; }
  try {
    const current = await getPrisma().user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!current) { sendError(res, "USER_NOT_FOUND"); return; }
    if (await bcrypt.compare(initialPassword, current.passwordHash)) { sendError(res, "PASSWORD_SAME_AS_CURRENT"); return; }
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    await getPrisma().$transaction(async tx => { await tx.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: true } }); await tx.session.deleteMany({ where: { userId } }); });
    res.json({ message: "Initial password set successfully. User must change password at next login." });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});
