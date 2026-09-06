import { Router } from "express";
import type { Prisma, RequestedPriority } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { requesterContext } from "./requester-context.js";
import { sendError } from "./errors.js";
import { attachmentSelect } from "./attachment-dto.js";

export const tickets = Router();
tickets.use(requesterContext);
const priorities = ["LOW", "MEDIUM", "HIGH"];
const createSelect = { id: true, ticketNumber: true, summary: true, description: true, requestedPriority: true, currentStatus: true, requesterId: true, categoryId: true, relatedSystemId: true, createdAt: true, updatedAt: true } as const;
const integer = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647;

tickets.post("/", async (req, res) => {
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
    const ticket = await db.$transaction(async tx => {
      // One database timestamp determines the UTC year and both initial timestamps.
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT CURRENT_TIMESTAMP AS now`;
      const year = clock.now.getUTCFullYear();
      // PostgreSQL serializes concurrent increments on this year's row. The
      // increment rolls back with the ticket; the constraint prevents overflow.
      const [counter] = await tx.$queryRaw<{ lastValue: number }[]>`
        INSERT INTO "TicketNumberCounter" ("year", "lastValue") VALUES (${year}, 1)
        ON CONFLICT ("year") DO UPDATE SET "lastValue" = "TicketNumberCounter"."lastValue" + 1
        RETURNING "lastValue"`;
      return tx.ticket.create({ data: {
        categoryId: body.categoryId, relatedSystemId: body.relatedSystemId,
        summary, description, requestedPriority: body.requestedPriority,
        requesterId: res.locals.requesterId, currentStatus: "NEW",
        ticketNumber: `TKT-${year}-${String(counter.lastValue).padStart(6, "0")}`,
        createdAt: clock.now, updatedAt: clock.now,
      }, select: createSelect });
    });
    res.status(201).json(ticket);
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

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
    if (q.status !== undefined && q.status !== "NEW") fields.status = "Status must be NEW.";
    const db = getPrisma();
    if (categoryId !== undefined && !fields.categoryId && (!integer(categoryId) || !await db.category.findUnique({ where: { id: categoryId } }))) fields.categoryId = "Select a valid Category.";
    if (Object.keys(fields).length) { sendError(res, "VALIDATION_ERROR", fields); return; }
    // Escape LIKE metacharacters so search remains a literal substring.
    const search = (q.search as string | undefined)?.trim().replace(/[\\%_]/g, "\\$&");
    const where: Prisma.TicketWhereInput = { requesterId: res.locals.requesterId,
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(q.requestedPriority ? { requestedPriority: q.requestedPriority as RequestedPriority } : {}),
      ...(q.status ? { currentStatus: "NEW" } : {}),
      ...(search ? { OR: [{ ticketNumber: { contains: search, mode: "insensitive" } }, { summary: { contains: search, mode: "insensitive" } }] } : {}),
    };
    const { rows, totalItems } = await db.$transaction(async tx => {
      const totalItems = await tx.ticket.count({ where });
      // Avoid passing a huge offset to Prisma for a valid out-of-range page.
      const rows = page > Math.ceil(totalItems / pageSize) ? [] : await tx.ticket.findMany({ where, orderBy: [{ [sortBy as string]: sortOrder }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, ticketNumber: true, summary: true, requestedPriority: true, currentStatus: true, categoryId: true, relatedSystemId: true, createdAt: true, updatedAt: true, category: { select: { name: true } }, relatedSystem: { select: { name: true } } } });
      return { rows, totalItems };
    }, { isolationLevel: "RepeatableRead" });
    res.json({ items: rows.map(({ category, relatedSystem, ...row }) => ({ ...row, categoryName: category.name, relatedSystemName: relatedSystem.name })), pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

tickets.get("/:ticketId", async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.ticketId) || !Number.isSafeInteger(Number(req.params.ticketId)) || Number(req.params.ticketId) <= 0) { sendError(res, "VALIDATION_ERROR", { ticketId: "A positive integer is required." }); return; }
    const id = Number(req.params.ticketId);
    if (id > 2147483647) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const ticket = await getPrisma().ticket.findFirst({ where: { id, requesterId: res.locals.requesterId }, select: {
      ...createSelect, requester: { select: { name: true } }, category: { select: { name: true } }, relatedSystem: { select: { name: true } },
      attachments: { orderBy: { id: "asc" }, select: attachmentSelect },
    } });
    if (!ticket) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const { requester, category, relatedSystem, ...dto } = ticket;
    res.json({ ...dto, requesterName: requester.name, categoryName: category.name, relatedSystemName: relatedSystem.name });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});
