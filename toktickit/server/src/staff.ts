import { Router } from "express";
import type { Prisma, RequestedPriority } from "@prisma/client";
import { requireAuth, requireRole } from "./auth.js";
import { getPrisma } from "./prisma.js";
import { sendError } from "./errors.js";
import { attachmentSelect } from "./attachment-dto.js";
import { canTransition, isTicketStatus, type TicketStatus } from "./status-workflow.js";

export const staff = Router();
staff.use(requireAuth, requireRole("IT_STAFF"));
const priorities = ["LOW", "MEDIUM", "HIGH"] as const;
const id = (raw: string) => /^\d+$/.test(raw) && Number(raw) > 0 && Number(raw) <= 2147483647 ? Number(raw) : null;
const commentSelect = { id: true, ticketId: true, authorId: true, content: true, createdAt: true, author: { select: { name: true, role: true } } } as const;
const flattenAuthor = ({ author, ...item }: any) => ({ ...item, authorName: author.name, authorRole: author.role });

staff.get("/tickets", async (req, res) => {
  try {
    const q = req.query, fields: Record<string, string> = {};
    const allowed = ["search", "categoryId", "status", "itPriority", "requestedPriority", "ownerId", "sortBy", "sortOrder", "page", "pageSize"];
    for (const [key, value] of Object.entries(q)) if (!allowed.includes(key) || typeof value !== "string") fields[key] = "Invalid query parameter.";
    const positive = (key: string, fallback?: number) => {
      if (q[key] === undefined) return fallback;
      if (typeof q[key] !== "string" || !/^\d+$/.test(q[key] as string) || Number(q[key]) <= 0 || !Number.isSafeInteger(Number(q[key]))) fields[key] = "A positive integer is required.";
      return Number(q[key]);
    };
    const page = positive("page", 1)!, pageSize = positive("pageSize", 10)!, categoryId = positive("categoryId");
    if (![10, 25, 50].includes(pageSize)) fields.pageSize = "Page size must be 10, 25, or 50.";
    if (q.status !== undefined && !isTicketStatus(q.status)) fields.status = "Invalid status.";
    for (const key of ["itPriority", "requestedPriority"]) if (q[key] !== undefined && !priorities.includes(q[key] as any)) fields[key] = "Invalid priority.";
    const sortBy = q.sortBy ?? "createdAt", sortOrder = q.sortOrder ?? "desc";
    if (!["createdAt", "ticketNumber", "updatedAt", "itPriority", "currentStatus"].includes(sortBy as string)) fields.sortBy = "Invalid sort column.";
    if (!["asc", "desc"].includes(sortOrder as string)) fields.sortOrder = "Invalid sort order.";
    let ownerId: number | "unassigned" | "me" | undefined;
    if (q.ownerId === "unassigned" || q.ownerId === "me") ownerId = q.ownerId;
    else if (q.ownerId !== undefined) { const parsed = positive("ownerId"); if (!fields.ownerId) ownerId = parsed; }
    const db = getPrisma();
    if (categoryId && !fields.categoryId && !await db.category.findUnique({ where: { id: categoryId } })) fields.categoryId = "Select a valid Category.";
    if (Object.keys(fields).length) { sendError(res, "VALIDATION_ERROR", fields); return; }
    const search = typeof q.search === "string" ? q.search.trim() : "";
    const where: Prisma.TicketWhereInput = {
      ...(categoryId ? { categoryId } : {}),
      ...(typeof q.status === "string" ? { currentStatus: q.status } : {}),
      ...(q.itPriority ? { itPriority: q.itPriority as RequestedPriority } : {}),
      ...(q.requestedPriority ? { requestedPriority: q.requestedPriority as RequestedPriority } : {}),
      ...(ownerId === "unassigned" ? { ownerId: null } : ownerId === "me" ? { ownerId: res.locals.userId } : typeof ownerId === "number" ? { ownerId } : {}),
      ...(search ? { OR: [{ ticketNumber: { contains: search, mode: "insensitive" } }, { summary: { contains: search, mode: "insensitive" } }, { requester: { name: { contains: search, mode: "insensitive" } } }] } : {}),
    };
    const [items, totalItems] = await db.$transaction([
      db.ticket.findMany({ where, orderBy: [{ [sortBy as string]: sortOrder }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, ticketNumber: true, summary: true, requesterId: true, categoryId: true, requestedPriority: true, itPriority: true, currentStatus: true, ownerId: true, requesterResolved: true, requesterResolvedAt: true, createdAt: true, updatedAt: true, requester: { select: { name: true } }, category: { select: { name: true } }, owner: { select: { name: true } } } }),
      db.ticket.count({ where }),
    ]);
    res.json({ items: items.map(({ requester, category, owner, ...ticket }) => ({ ...ticket, requesterName: requester.name, categoryName: category.name, ownerName: owner?.name ?? null })), pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

staff.get("/users", async (_req, res) => {
  try { res.json({ items: await getPrisma().user.findMany({ where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true, name: true, role: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }) }); }
  catch { sendError(res, "INTERNAL_ERROR"); }
});

staff.get("/tickets/:ticketId", async (req, res) => {
  const ticketId = id(req.params.ticketId); if (!ticketId) { sendError(res, "TICKET_NOT_FOUND"); return; }
  try {
    const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true, ticketNumber: true, summary: true, description: true, requestedPriority: true, itPriority: true, currentStatus: true, requesterResolved: true, requesterResolvedAt: true, requesterId: true, ownerId: true, categoryId: true, relatedSystemId: true, createdAt: true, updatedAt: true, requester: { select: { name: true, email: true } }, owner: { select: { name: true } }, category: { select: { name: true } }, relatedSystem: { select: { name: true } }, attachments: { orderBy: { id: "asc" }, select: { ...attachmentSelect, uploadedById: true } }, comments: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: commentSelect }, internalNotes: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: commentSelect } } });
    if (!ticket) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const { requester, owner, category, relatedSystem, comments, internalNotes, ...dto } = ticket;
    res.json({ ...dto, requesterName: requester.name, requesterEmail: requester.email, ownerName: owner?.name ?? null, categoryName: category.name, relatedSystemName: relatedSystem.name, comments: comments.map(flattenAuthor), internalNotes: internalNotes.map(flattenAuthor) });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

staff.patch("/tickets/:ticketId/assign", async (req, res) => {
  const ticketId = id(req.params.ticketId); if (!ticketId) { sendError(res, "TICKET_NOT_FOUND"); return; }
  const body = req.body as Record<string, unknown>;
  if (!req.is("application/json") || !body || Array.isArray(body) || Object.keys(body).some(k => k !== "ownerId") || !(body.ownerId === null || (typeof body.ownerId === "number" && Number.isInteger(body.ownerId) && body.ownerId > 0))) { sendError(res, "VALIDATION_ERROR", { ownerId: "Owner must be a positive user ID or null." }); return; }
  try {
    const db = getPrisma();
    if (typeof body.ownerId === "number" && !await db.user.findFirst({ where: { id: body.ownerId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } })) { sendError(res, "INELIGIBLE_OWNER"); return; }
    const current = await db.ticket.findUnique({ where: { id: ticketId }, select: { ownerId: true, currentStatus: true } });
    if (!current) { sendError(res, "TICKET_NOT_FOUND"); return; }
    // Assigning yourself is the claim operation. Once another claimant wins,
    // a concurrent self-claim must conflict instead of silently stealing it.
    if (body.ownerId === res.locals.userId && current.ownerId !== null && current.ownerId !== res.locals.userId) { sendError(res, "OWNER_CONFLICT"); return; }
    if (current.ownerId === null && body.ownerId !== null) {
      const changed = await db.ticket.updateMany({ where: { id: ticketId, ownerId: null }, data: { ownerId: body.ownerId, ...(current.currentStatus === "NEW" ? { currentStatus: "OPEN" } : {}) } });
      if (!changed.count) { sendError(res, "OWNER_CONFLICT"); return; }
    } else await db.ticket.update({ where: { id: ticketId }, data: { ownerId: body.ownerId as number | null } });
    const result = await db.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { id: true, ticketNumber: true, ownerId: true, currentStatus: true, updatedAt: true, owner: { select: { name: true } } } });
    const { owner, ...dto } = result; res.json({ ...dto, ownerName: owner?.name ?? null });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

staff.patch("/tickets/:ticketId/priority", async (req, res) => {
  const ticketId = id(req.params.ticketId); if (!ticketId) { sendError(res, "TICKET_NOT_FOUND"); return; }
  const body = req.body as Record<string, unknown> | undefined, value = body?.itPriority;
  if (!req.is("application/json") || !body || Array.isArray(body) || !priorities.includes(value as any) || Object.keys(body).some(k => k !== "itPriority")) { sendError(res, "VALIDATION_ERROR", { itPriority: "IT Priority must be LOW, MEDIUM, or HIGH." }); return; }
  try { const value = await getPrisma().ticket.update({ where: { id: ticketId }, data: { itPriority: req.body.itPriority }, select: { id: true, ticketNumber: true, requestedPriority: true, itPriority: true, updatedAt: true } }); res.json(value); }
  catch (error: any) { if (error?.code === "P2025") sendError(res, "TICKET_NOT_FOUND"); else sendError(res, "INTERNAL_ERROR"); }
});

staff.patch("/tickets/:ticketId/status", async (req, res) => {
  const ticketId = id(req.params.ticketId); if (!ticketId) { sendError(res, "TICKET_NOT_FOUND"); return; }
  const body = req.body as Record<string, unknown> | undefined, status = body?.status;
  if (!req.is("application/json") || !body || Array.isArray(body) || !isTicketStatus(status) || Object.keys(body).some(k => k !== "status")) { sendError(res, "VALIDATION_ERROR", { status: "Select a valid status." }); return; }
  try {
    const db = getPrisma();
    const current = await db.ticket.findUnique({ where: { id: ticketId }, select: { id: true, ticketNumber: true, currentStatus: true, ownerId: true, requesterResolved: true, requesterResolvedAt: true, updatedAt: true, owner: { select: { isActive: true, role: true } } } });
    if (!current) { sendError(res, "TICKET_NOT_FOUND"); return; }
    if (!isTicketStatus(current.currentStatus) || !canTransition(current.currentStatus, status as TicketStatus)) { sendError(res, "INVALID_STATUS_TRANSITION"); return; }
    if (current.currentStatus === status) { const { owner: _owner, ...dto } = current; res.json(dto); return; }
    const reopening = status === "REOPENED";
    const clearOwner = reopening && current.owner && (!current.owner.isActive || current.owner.role === "REQUESTER");
    const result = await db.ticket.update({ where: { id: ticketId }, data: { currentStatus: status, ...(reopening ? { requesterResolved: false, requesterResolvedAt: null } : {}), ...(clearOwner ? { ownerId: null } : {}) }, select: { id: true, ticketNumber: true, currentStatus: true, ownerId: true, requesterResolved: true, requesterResolvedAt: true, updatedAt: true } });
    res.json(result);
  } catch { sendError(res, "INTERNAL_ERROR"); }
});
