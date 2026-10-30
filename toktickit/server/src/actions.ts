import { Router } from "express";
import { ActionStatus, Prisma } from "@prisma/client";
import { requireAuth, requireRole } from "./auth.js";
import { sendError } from "./errors.js";
import { getPrisma } from "./prisma.js";
import { lockUserEligibility } from "./user-eligibility-lock.js";

export const actions = Router();
actions.use(requireAuth);

const actionStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const editableFields = ["assignedToId", "description", "result", "followUpRequired", "followUpNote", "attachmentNotes", "status"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const positiveId = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647;
const routeId = (value: string) => /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2147483647 ? Number(value) : null;
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isUnique = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const actionSelect = {
  id: true, ticketId: true, performedById: true, assignedToId: true,
  description: true, result: true, followUpRequired: true, followUpNote: true,
  attachmentNotes: true, status: true, version: true, createdAt: true, updatedAt: true,
  performedBy: { select: { name: true } }, assignedTo: { select: { name: true } },
} as const;

type SelectedAction = Prisma.TicketActionGetPayload<{ select: typeof actionSelect }>;

function dto({ performedBy, assignedTo, ...row }: SelectedAction) {
  return { ...row, performedByName: performedBy.name, assignedToName: assignedTo?.name ?? null };
}

function snapshot(row: SelectedAction) {
  return {
    id: row.id, ticketId: row.ticketId, performedById: row.performedById,
    assignedToId: row.assignedToId, description: row.description, result: row.result,
    followUpRequired: row.followUpRequired, followUpNote: row.followUpNote,
    attachmentNotes: row.attachmentNotes, status: row.status, version: row.version,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

export type ActionValues = {
  assignedToId: number;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  status: ActionStatus;
};

export function validateActionValues(body: Record<string, unknown>, defaults?: ActionValues) {
  const fields: Record<string, string> = {};
  const assignedToId = body.assignedToId === undefined && defaults ? defaults.assignedToId : body.assignedToId;
  const descriptionValue = body.description === undefined && defaults ? defaults.description : body.description;
  const resultValue = body.result === undefined ? (defaults ? defaults.result : "") : body.result;
  const followUpRequired = body.followUpRequired === undefined && defaults ? defaults.followUpRequired : body.followUpRequired;
  const followUpValue = body.followUpNote === undefined && defaults ? defaults.followUpNote : body.followUpNote;
  const attachmentValue = body.attachmentNotes === undefined && defaults ? defaults.attachmentNotes : body.attachmentNotes;
  const statusValue = body.status === undefined ? (defaults ? defaults.status : "PLANNED") : body.status;

  if (!positiveId(assignedToId)) fields.assignedToId = "Assignee must be a positive user ID.";
  const description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  if (description.length < 1 || description.length > 2000) fields.description = "Description must be between 1 and 2000 characters.";
  const result = typeof resultValue === "string" ? resultValue.trim() : "";
  if (typeof resultValue !== "string" || result.length > 2000) fields.result = "Result must be at most 2000 characters.";
  if (typeof followUpRequired !== "boolean") fields.followUpRequired = "Follow-Up Required must be true or false.";
  let followUpNote: string | null = null;
  if (followUpRequired === true) {
    followUpNote = typeof followUpValue === "string" ? followUpValue.trim() : "";
    if (followUpNote.length < 1 || followUpNote.length > 2000) fields.followUpNote = "Follow-up Note must be between 1 and 2000 characters when follow-up is required.";
  } else if (followUpValue !== undefined && followUpValue !== null) {
    fields.followUpNote = "Follow-up Note must be null or omitted when follow-up is not required.";
  }
  let attachmentNotes: string | null = null;
  if (attachmentValue !== undefined && attachmentValue !== null) {
    attachmentNotes = typeof attachmentValue === "string" ? attachmentValue.trim() : "";
    if (attachmentNotes.length < 1 || attachmentNotes.length > 2000) fields.attachmentNotes = "Attachment Notes must be between 1 and 2000 characters when provided.";
  }
  if (!actionStatuses.includes(statusValue as typeof actionStatuses[number])) fields.status = "Select a valid action status.";
  if (statusValue === "COMPLETED" && result.length < 1) fields.result = "Result is required when an action is completed.";

  return {
    fields,
    values: { assignedToId: assignedToId as number, description, result, followUpRequired: followUpRequired as boolean, followUpNote, attachmentNotes, status: statusValue as ActionStatus },
  };
}

async function eligibleAssignee(tx: Prisma.TransactionClient, userId: number) {
  return tx.user.findFirst({ where: { id: userId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } });
}

function sameCreation(row: SelectedAction, ticketId: number, performerId: number, values: ActionValues) {
  return row.ticketId === ticketId && row.performedById === performerId &&
    row.assignedToId === values.assignedToId && row.description === values.description &&
    row.result === values.result && row.followUpRequired === values.followUpRequired &&
    row.followUpNote === values.followUpNote && row.attachmentNotes === values.attachmentNotes &&
    row.status === values.status;
}

async function resolveReplay(key: string, ticketId: number, performerId: number, values: ActionValues) {
  const existing = await getPrisma().ticketAction.findUnique({ where: { idempotencyKey: key }, select: actionSelect });
  if (!existing || !sameCreation(existing, ticketId, performerId, values)) return null;
  return existing;
}

actions.get("/tickets/:ticketId/actions", async (req, res) => {
  const ticketId = routeId(req.params.ticketId);
  if (!ticketId) { sendError(res, "VALIDATION_ERROR", { ticketId: "A positive integer is required." }); return; }
  try {
    const db = getPrisma();
    const ticket = await db.ticket.findFirst({
      where: res.locals.userRole === "REQUESTER" ? { id: ticketId, requesterId: res.locals.userId } : { id: ticketId },
      select: { id: true },
    });
    if (!ticket) { sendError(res, "TICKET_NOT_FOUND"); return; }
    const items = await db.ticketAction.findMany({ where: { ticketId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: actionSelect });
    res.json({ items: items.map(dto) });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

actions.post("/tickets/:ticketId/actions", requireRole("IT_STAFF"), async (req, res) => {
  const ticketId = routeId(req.params.ticketId);
  if (!ticketId) { sendError(res, "VALIDATION_ERROR", { ticketId: "A positive integer is required." }); return; }
  if (!req.is("application/json") || !isObject(req.body)) { sendError(res, "VALIDATION_ERROR", { body: "A JSON object is required." }); return; }
  const body = req.body;
  const allowed = ["idempotencyKey", ...editableFields];
  const fields: Record<string, string> = {};
  for (const key of Object.keys(body)) if (!allowed.includes(key as typeof allowed[number])) fields[key] = "This field is not allowed.";
  if (typeof body.idempotencyKey !== "string" || !uuid.test(body.idempotencyKey)) fields.idempotencyKey = "A valid UUID is required.";
  if (body.status !== undefined && !["PLANNED", "IN_PROGRESS"].includes(body.status as string)) fields.status = "Creation status must be PLANNED or IN_PROGRESS.";
  const parsed = validateActionValues(body);
  Object.assign(fields, parsed.fields);
  if (Object.keys(fields).length) { sendError(res, "VALIDATION_ERROR", fields); return; }
  const key = body.idempotencyKey as string;
  const performerId = res.locals.userId;
  try {
    const existing = await getPrisma().ticketAction.findUnique({ where: { idempotencyKey: key }, select: actionSelect });
    if (existing) {
      if (!sameCreation(existing, ticketId, performerId, parsed.values)) { sendError(res, "IDEMPOTENCY_CONFLICT"); return; }
      res.set("Idempotent-Replay", "true").json(dto(existing)); return;
    }
    const created = await getPrisma().$transaction(async tx => {
      await lockUserEligibility(tx);
      if (!await tx.ticket.findUnique({ where: { id: ticketId }, select: { id: true } })) return { error: "TICKET_NOT_FOUND" as const };
      if (!await eligibleAssignee(tx, parsed.values.assignedToId)) return { error: "INELIGIBLE_ASSIGNEE" as const };
      const row = await tx.ticketAction.create({ data: { idempotencyKey: key, ticketId, performedById: performerId, ...parsed.values }, select: actionSelect });
      return { row };
    });
    if ("error" in created && created.error) { sendError(res, created.error); return; }
    res.status(201).json(dto(created.row));
  } catch (error) {
    if (isUnique(error)) {
      const replay = await resolveReplay(key, ticketId, performerId, parsed.values);
      if (replay) { res.set("Idempotent-Replay", "true").json(dto(replay)); return; }
      sendError(res, "IDEMPOTENCY_CONFLICT"); return;
    }
    sendError(res, "INTERNAL_ERROR");
  }
});

const transitions: Record<ActionStatus, readonly ActionStatus[]> = {
  PLANNED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const canTransitionAction = (from: ActionStatus, to: ActionStatus) => transitions[from].includes(to);
export const isEligibleActionAssignee = (user: { isActive: boolean; role: string }) => user.isActive && (user.role === "IT_STAFF" || user.role === "ADMINISTRATOR");

actions.patch("/tickets/:ticketId/actions/:actionId", requireRole("IT_STAFF"), async (req, res) => {
  const ticketId = routeId(req.params.ticketId), actionId = routeId(req.params.actionId);
  if (!ticketId || !actionId) { sendError(res, "VALIDATION_ERROR", { ...(!ticketId ? { ticketId: "A positive integer is required." } : {}), ...(!actionId ? { actionId: "A positive integer is required." } : {}) }); return; }
  if (!req.is("application/json") || !isObject(req.body)) { sendError(res, "VALIDATION_ERROR", { body: "A JSON object is required." }); return; }
  const body = req.body;
  const allowed = ["version", ...editableFields];
  const fields: Record<string, string> = {};
  for (const key of Object.keys(body)) if (!allowed.includes(key as typeof allowed[number])) fields[key] = "This field is not allowed.";
  if (!positiveId(body.version)) fields.version = "Current version must be a positive integer.";
  if (!Object.keys(body).some(key => editableFields.includes(key as typeof editableFields[number]))) fields.body = "At least one editable field is required.";
  if (body.assignedToId !== undefined && !positiveId(body.assignedToId)) fields.assignedToId = "Assignee must be a positive user ID.";
  if (Object.keys(fields).length) { sendError(res, "VALIDATION_ERROR", fields); return; }

  try {
    const result = await getPrisma().$transaction(async tx => {
      await lockUserEligibility(tx);
      const current = await tx.ticketAction.findFirst({ where: { id: actionId, ticketId }, select: actionSelect });
      if (!current) return { error: "ACTION_NOT_FOUND" as const };
      if (current.version !== body.version) return { error: "STALE_ACTION" as const, currentVersion: current.version };
      if (current.status === "COMPLETED" || current.status === "CANCELLED") return { error: "TERMINAL_ACTION" as const };

      if (current.assignedToId === null) {
        const keys = Object.keys(body).sort();
        if (body.assignedToId === undefined) return { error: "ACTION_UNASSIGNED" as const };
        if (keys.length !== 2 || keys[0] !== "assignedToId" || keys[1] !== "version") return { validation: { body: "An unassigned action accepts only version and assignedToId." } };
        if (!await eligibleAssignee(tx, body.assignedToId as number)) return { error: "INELIGIBLE_ASSIGNEE" as const };
      }

      const defaults: ActionValues = {
        assignedToId: current.assignedToId ?? body.assignedToId as number,
        description: current.description, result: current.result,
        followUpRequired: current.followUpRequired, followUpNote: current.followUpNote,
        attachmentNotes: current.attachmentNotes, status: current.status,
      };
      const parsed = validateActionValues(body, defaults);
      if (Object.keys(parsed.fields).length) return { validation: parsed.fields };
      if (body.assignedToId !== undefined && !await eligibleAssignee(tx, parsed.values.assignedToId)) return { error: "INELIGIBLE_ASSIGNEE" as const };
      if (parsed.values.status !== current.status && !canTransitionAction(current.status, parsed.values.status)) return { error: "INVALID_ACTION_TRANSITION" as const };
      const unchanged = sameCreation(current, current.ticketId, current.performedById, parsed.values);
      if (unchanged) return { row: current, unchanged: true };

      const changed = await tx.ticketAction.updateMany({
        where: { id: actionId, ticketId, version: current.version },
        data: { ...parsed.values, version: { increment: 1 } },
      });
      if (!changed.count) {
        const latest = await tx.ticketAction.findUnique({ where: { id: actionId }, select: { version: true } });
        return { error: "STALE_ACTION" as const, currentVersion: latest?.version ?? current.version };
      }
      const updated = await tx.ticketAction.findUniqueOrThrow({ where: { id: actionId }, select: actionSelect });
      await tx.ticketActionRevision.create({ data: {
        actionId, version: updated.version, editedById: res.locals.userId,
        beforeState: snapshot(current), afterState: snapshot(updated),
      } });
      return { row: updated, unchanged: false };
    });
    if ("validation" in result && result.validation) { sendError(res, "VALIDATION_ERROR", result.validation); return; }
    if ("error" in result && result.error) { sendError(res, result.error, {}, "currentVersion" in result ? { currentVersion: result.currentVersion } : {}); return; }
    res.json(dto(result.row));
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

actions.get("/action-assignees", requireRole("IT_STAFF"), async (_req, res) => {
  try {
    const items = await getPrisma().user.findMany({
      where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } },
      select: { id: true, name: true, role: true }, orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    res.json({ items });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});
