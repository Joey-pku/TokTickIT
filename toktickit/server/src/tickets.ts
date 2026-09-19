import { Router } from "express";
import type { Prisma, RequestedPriority } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { requireAuth, csrfProtection } from "./auth.js";
import { sendError } from "./errors.js";
import { attachmentSelect } from "./attachment-dto.js";
import { allocateTicketNumber } from "./ticket-number.js";

export const tickets = Router();
// All requester-facing ticket routes require a fully authenticated session.
tickets.use(requireAuth);
const priorities = ["LOW", "MEDIUM", "HIGH"];
const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const createSelect = { id: true, ticketNumber: true, summary: true, description: true, requestedPriority: true, itPriority: true, currentStatus: true, requesterResolved: true, requesterResolvedAt: true, requesterId: true, ownerId: true, categoryId: true, relatedSystemId: true, createdAt: true, updatedAt: true } as const;
const integer = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647;
const accessibleTicket = (id: number, userId: number, role: string) => getPrisma().ticket.findFirst({ where: role === "REQUESTER" ? { id, requesterId: userId } : { id }, select: { id: true } });
const threadSelect = { id: true, ticketId: true, authorId: true, content: true, createdAt: true, author: { select: { name: true, role: true } } } as const;
const flattenAuthor = ({ author, ...item }: any) => ({ ...item, authorName: author.name, authorRole: author.role });

// ---------------------------------------------------------------------------
// POST /api/tickets — Create Ticket
// ---------------------------------------------------------------------------
tickets.post("/", csrfProtection, async (req, res) => {
  try {
    const body = req.body;
    if (!req.is("application/json") || !body || typeof body !== "object" || Array.isArray(body)) {
      sendError(res, "VALIDATION_ERROR", { body: "A JSON object is required." }); return;
    }
    const fields: Record<string, string> = Object.create(null);
    const allowed = ["categoryId", "relatedSystemId", "requestedPriority", "summary", "description"];
    for (const key of Object.keys(body)) if (!allowed.includes(key)) fields[key] = "This field is not allowed.";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (summary.length < 5 || summary.length > 100) fields.summary = "Summary must be between 5 and 100 characters.";
    if (description.length < 10 || description.length > 2000) fields.description = "Description must be between 10 and 2000 characters.";
    if (!priorities.includes(body.requestedPriority)) fields.requestedPriority = "Requested Priority must be LOW, MEDIUM, or HIGH.";
    const db = getPrisma();
    if (!integer(body.categoryId) || !await db.category.findUnique({ where: { id: body.categoryId } })) fields.categoryId = "Select a valid Category.";
    if (!integer(body.relatedSystemId) || !await db.relatedSystem.findFirst({ where: { id: body.relatedSystemId, isActive: true } })) fields.relatedSystemId = "Select an active Related System.";
    if (Object.keys(fields).length) { sendError(res, "VALIDATION_ERROR", fields); return; }
    const requesterId = res.locals.userId;
    const ticket = await db.$transaction(async tx => {
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT CURRENT_TIMESTAMP AS now`;
      const ticketNumber = await allocateTicketNumber(tx, clock.now);
      return tx.ticket.create({ data: {
        categoryId: body.categoryId, relatedSystemId: body.relatedSystemId,
        summary, description, requestedPriority: body.requestedPriority, itPriority: body.requestedPriority,
        requesterId, currentStatus: "NEW",
        ticketNumber,
        createdAt: clock.now, updatedAt: clock.now,
      }, select: createSelect });
    });
    res.status(201).json(ticket);
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

// ---------------------------------------------------------------------------
// GET /api/tickets — My Tickets list
// ---------------------------------------------------------------------------
tickets.get("/", async (req, res) => {
  try {
    const q = req.query;
    const fields: Record<string, string> = Object.create(null);
    const allowed = ["search", "categoryId", "requestedPriority", "status", "sortBy", "sortOrder", "page", "pageSize"];
    for (const [key, value] of Object.entries(q)) if (!allowed.includes(key) || typeof value !== "string") fields[key] = "Invalid query parameter.";
    const parse = (key: string, fallback?: number) => {
      if (q[key] === undefined) return fallback;
      if (typeof q[key] !== "string" || !/^\d+$/.test(q[key] as string) || !Number.isSafeInteger(Number(q[key])) || Number(q[key]) <= 0) fields[key] = "A positive integer is required.";
      return Number(q[key]);
    };
    const page = parse("page", 1)!;
    const pageSize = parse("pageSize", 10)!;
    const categoryId = parse("categoryId");
    if (![10, 25, 50].includes(pageSize)) fields.pageSize = "Page size must be 10, 25, or 50.";
    const sortBy = q.sortBy ?? "createdAt", sortOrder = q.sortOrder ?? "desc";
    if (!["createdAt", "ticketNumber", "updatedAt"].includes(sortBy as string)) fields.sortBy = "Invalid sort column.";
    if (!["asc", "desc"].includes(sortOrder as string)) fields.sortOrder = "Invalid sort order.";
    if (q.requestedPriority !== undefined && !priorities.includes(q.requestedPriority as string)) fields.requestedPriority = "Invalid priority.";
    if (q.status !== undefined && !statuses.includes(q.status as string)) fields.status = "Invalid status.";
    const db = getPrisma();
    if (categoryId !== undefined && !fields.categoryId && (!integer(categoryId) || !await db.category.findUnique({ where: { id: categoryId } }))) fields.categoryId = "Select a valid Category.";
    if (Object.keys(fields).length) { sendError(res, "VALIDATION_ERROR", fields); return; }
    const search = (q.search as string | undefined)?.trim().replace(/[\\%_]/g, "\\$&");
    const requesterId = res.locals.userId;
    const where: Prisma.TicketWhereInput = { requesterId,
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(q.requestedPriority ? { requestedPriority: q.requestedPriority as RequestedPriority } : {}),
      ...(typeof q.status === "string" ? { currentStatus: q.status } : {}),
      ...(search ? { OR: [{ ticketNumber: { contains: search, mode: "insensitive" } }, { summary: { contains: search, mode: "insensitive" } }] } : {}),
    };
    const { rows, totalItems } = await db.$transaction(async tx => {
      const totalItems = await tx.ticket.count({ where });
      const rows = page > Math.ceil(totalItems / pageSize) ? [] : await tx.ticket.findMany({ where, orderBy: [{ [sortBy as string]: sortOrder }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, ticketNumber: true, summary: true, requestedPriority: true, itPriority: true, currentStatus: true, requesterResolved: true, requesterResolvedAt: true, categoryId: true, relatedSystemId: true, createdAt: true, updatedAt: true, category: { select: { name: true } }, relatedSystem: { select: { name: true } } } });
      return { rows, totalItems };
    }, { isolationLevel: "RepeatableRead" });
    res.json({ items: rows.map(({ category, relatedSystem, ...row }) => ({ ...row, categoryName: category.name, relatedSystemName: relatedSystem.name })), pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

// ---------------------------------------------------------------------------
// GET /api/tickets/:ticketId — Ticket detail (requester: own tickets only)
// ---------------------------------------------------------------------------
tickets.get("/:ticketId", async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.ticketId) || !Number.isSafeInteger(Number(req.params.ticketId)) || Number(req.params.ticketId) <= 0) { sendError(res, "VALIDATION_ERROR", { ticketId: "A positive integer is required." }); return; }
    const id = Number(req.params.ticketId);
    if (id > 2147483647) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const requesterId = res.locals.userId;
    const ticket = await getPrisma().ticket.findFirst({ where: { id, requesterId }, select: {
      ...createSelect, requester: { select: { name: true } }, category: { select: { name: true } }, relatedSystem: { select: { name: true } },
      attachments: { orderBy: { id: "asc" }, select: attachmentSelect },
      comments: { orderBy: { createdAt: "asc" }, select: { id: true, ticketId: true, authorId: true, content: true, createdAt: true, author: { select: { name: true, role: true } } } },
    } });
    if (!ticket) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const { requester, category, relatedSystem, comments, ...dto } = ticket;
    res.json({ ...dto, requesterName: requester.name, categoryName: category.name, relatedSystemName: relatedSystem.name,
      comments: comments.map(({ author, ...c }) => ({ ...c, authorName: author.name, authorRole: author.role })) });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

// ---------------------------------------------------------------------------
// POST /api/tickets/:ticketId/appear-resolved
// ---------------------------------------------------------------------------
tickets.post("/:ticketId/appear-resolved", csrfProtection, async (req, res) => {
  try {
    if (res.locals.userRole !== "REQUESTER") { sendError(res, "FORBIDDEN"); return; }
    if (!/^\d+$/.test(req.params.ticketId) || !Number.isSafeInteger(Number(req.params.ticketId)) || Number(req.params.ticketId) <= 0) { sendError(res, "VALIDATION_ERROR", { ticketId: "A positive integer is required." }); return; }
    const id = Number(req.params.ticketId);
    if (id > 2147483647) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const requesterId = res.locals.userId;
    const db = getPrisma();
    const ticket = await db.ticket.findFirst({ where: { id, requesterId }, select: { id: true, ticketNumber: true, currentStatus: true, requesterResolved: true, requesterResolvedAt: true } });
    if (!ticket) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const eligibleStatuses = ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER"];
    if (!eligibleStatuses.includes(ticket.currentStatus)) { sendError(res, "INVALID_STATUS_FOR_RESOLUTION"); return; }
    if (!req.is("application/json") || !req.body || typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).length > 0) { sendError(res, "VALIDATION_ERROR", { body: "An empty JSON object is required." }); return; }
    const now = new Date();
    await db.$transaction(async tx => {
      const changed = await tx.ticket.updateMany({ where: { id, requesterId, requesterResolved: false, currentStatus: { in: eligibleStatuses } }, data: { requesterResolved: true, requesterResolvedAt: now, updatedAt: now } });
      if (changed.count) await tx.comment.create({ data: { ticketId: id, authorId: requesterId, content: "Requester indicated that the problem appears resolved.", createdAt: now } });
    });
    const updated = await db.ticket.findUniqueOrThrow({ where: { id }, select: { id: true, ticketNumber: true, requesterResolved: true, requesterResolvedAt: true, currentStatus: true } });
    res.json({ ...updated, message: "Resolution intent recorded." });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

// ---------------------------------------------------------------------------
// GET /api/tickets/:ticketId/comments
// ---------------------------------------------------------------------------
tickets.get("/:ticketId/comments", async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.ticketId) || Number(req.params.ticketId) <= 0) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const id = Number(req.params.ticketId);
    if (id > 2147483647) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const ticket = await accessibleTicket(id, res.locals.userId, res.locals.userRole);
    if (!ticket) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const items = await getPrisma().comment.findMany({ where: { ticketId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: threadSelect });
    res.json({ items: items.map(flattenAuthor) });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

// ---------------------------------------------------------------------------
// POST /api/tickets/:ticketId/comments
// ---------------------------------------------------------------------------
tickets.post("/:ticketId/comments", csrfProtection, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.ticketId) || Number(req.params.ticketId) <= 0) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const id = Number(req.params.ticketId);
    if (id > 2147483647) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const userId = res.locals.userId;
    const db = getPrisma();
    const ticket = await accessibleTicket(id, userId, res.locals.userRole);
    if (!ticket) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const body = req.body as Record<string, unknown>;
    if (!req.is("application/json") || !body || typeof body !== "object" || Array.isArray(body)) { sendError(res, "VALIDATION_ERROR", { body: "A JSON object is required." }); return; }
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (content.length === 0 || content.length > 2000) { sendError(res, "VALIDATION_ERROR", { content: "Comment must be between 1 and 2000 characters." }); return; }
    const now = new Date();
    // Posting a manual comment resets requesterResolved
    const comment = await db.$transaction(async tx => {
      await tx.ticket.update({ where: { id }, data: { ...(res.locals.userRole === "REQUESTER" ? { requesterResolved: false, requesterResolvedAt: null } : {}), updatedAt: now } });
      return tx.comment.create({ data: { ticketId: id, authorId: userId, content, createdAt: now }, select: threadSelect });
    });
    const { author, ...dto } = comment;
    res.status(201).json({ ...dto, authorName: author.name, authorRole: author.role });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

tickets.get("/:ticketId/internal-notes", async (req, res) => {
  if (res.locals.userRole === "REQUESTER") { sendError(res, "TICKET_NOT_FOUND"); return; }
  if (!/^\d+$/.test(req.params.ticketId) || Number(req.params.ticketId) <= 0 || Number(req.params.ticketId) > 2147483647) { sendError(res, "TICKET_NOT_FOUND"); return; }
  try {
    const ticketId = Number(req.params.ticketId);
    if (!await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } })) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const items = await getPrisma().internalNote.findMany({ where: { ticketId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: threadSelect });
    res.json({ items: items.map(flattenAuthor) });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

tickets.post("/:ticketId/internal-notes", async (req, res) => {
  if (res.locals.userRole === "REQUESTER") { sendError(res, "TICKET_NOT_FOUND"); return; }
  if (!/^\d+$/.test(req.params.ticketId) || Number(req.params.ticketId) <= 0 || Number(req.params.ticketId) > 2147483647) { sendError(res, "TICKET_NOT_FOUND"); return; }
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!req.is("application/json") || !req.body || Array.isArray(req.body) || Object.keys(req.body).some(key => key !== "content") || content.length < 1 || content.length > 2000) { sendError(res, "VALIDATION_ERROR", { content: "Internal note must be between 1 and 2000 characters." }); return; }
  try {
    const ticketId = Number(req.params.ticketId), db = getPrisma();
    if (!await db.ticket.findUnique({ where: { id: ticketId }, select: { id: true } })) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const note = await db.$transaction(async tx => {
      const created = await tx.internalNote.create({ data: { ticketId, authorId: res.locals.userId, content }, select: threadSelect });
      await tx.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
      return created;
    });
    res.status(201).json(flattenAuthor(note));
  } catch { sendError(res, "INTERNAL_ERROR"); }
});
