import type { RequestHandler } from "express";
import { getPrisma } from "./prisma.js";
import { sendError } from "./errors.js";
export interface RequesterLocals { requesterId: number }

// Testing identity only. Future routes use this ID in database predicates.
// Lab 3 can replace this resolver without changing the schema.
export const requesterContext: RequestHandler<Record<string, string>, unknown, unknown, Record<string, string>, RequesterLocals> = async (req, res, next) => {
  const header = req.get("x-requester-id");
  if (header === undefined) { sendError(res, "MISSING_REQUESTER_CONTEXT"); return; }
  if (!/^[0-9]+$/.test(header) || !Number.isSafeInteger(Number(header)) || Number(header) <= 0) {
    sendError(res, "INVALID_REQUESTER_ID"); return;
  }
  const id = Number(header);
  // A positive ID beyond PostgreSQL Int range cannot identify an existing row.
  if (id > 2147483647) { sendError(res, "REQUESTER_NOT_FOUND"); return; }
  try {
    const requester = await getPrisma().user.findFirst({ where: { id, isActive: true, role: "REQUESTER" }, select: { id: true } });
    if (!requester) { sendError(res, "REQUESTER_NOT_FOUND"); return; }
    res.locals.requesterId = requester.id;
    next();
  } catch { sendError(res, "INTERNAL_ERROR"); }
};
