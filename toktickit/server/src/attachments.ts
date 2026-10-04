import { Router, type Request, type Response } from "express";
import multer from "multer";
import { create as contentDisposition } from "content-disposition";
import { getPrisma } from "./prisma.js";
import { requireAuth, csrfProtection } from "./auth.js";
import { sendError } from "./errors.js";
import { attachmentSelect } from "./attachment-dto.js";
import { attachmentStorage } from "./attachment-storage.js";
import { MAX_FILE_BYTES, validateFile } from "./attachment-validation.js";

export const attachments = Router();
const parser = multer({ storage: multer.memoryStorage(), defParamCharset: "utf8", limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 0 } }).single("file");
class AttachmentFailure extends Error { constructor(public code: "TICKET_NOT_FOUND" | "ATTACHMENT_NOT_FOUND" | "ATTACHMENT_LIMIT_REACHED" | "ALREADY_REMOVED") { super(code); } }
function idFrom(req: Request, res: Response, key: string): number | null {
  const value = req.params[key];
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) { sendError(res, "VALIDATION_ERROR", { [key]: "A positive integer is required." }); return null; }
  if (Number(value) > 2147483647) { sendError(res, key === "ticketId" ? "TICKET_NOT_FOUND" : "ATTACHMENT_NOT_FOUND"); return null; }
  return Number(value);
}
function fail(res: Response, error: unknown) { sendError(res, error instanceof AttachmentFailure ? error.code : "INTERNAL_ERROR"); }

// All attachment routes require session authentication.
attachments.post("/tickets/:ticketId/attachments", requireAuth, csrfProtection, async (req, res) => {
  const ticketId = idFrom(req, res, "ticketId"); if (ticketId === null) return;
  let written: string | undefined;
  try {
    const db = getPrisma(), userId = res.locals.userId;
    // Requester can only upload to their own tickets; staff/admin can upload to any.
    const role = res.locals.userRole;
    const where = (role === "REQUESTER")
      ? { id: ticketId, requesterId: userId }
      : { id: ticketId };
    if (!await db.ticket.findFirst({ where, select: { id: true } })) { sendError(res, "TICKET_NOT_FOUND"); return; }
    try { await new Promise<void>((resolve, reject) => parser(req, res, error => error ? reject(error) : resolve())); }
    catch (error) { if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") sendError(res, "FILE_TOO_LARGE"); else sendError(res, "VALIDATION_ERROR", { file: "Provide exactly one multipart file named file." }); return; }
    if (!req.file) { sendError(res, "VALIDATION_ERROR", { file: "A file is required." }); return; }
    const valid = await validateFile(req.file); if (!valid) { sendError(res, "UNSUPPORTED_MEDIA_TYPE"); return; }
    const file = req.file;
    const dto = await db.$transaction(async tx => {
      if (role === "REQUESTER") {
        await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} AND "requesterId" = ${userId} FOR UPDATE`;
      } else {
        await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;
      }
      // Re-check ownership within the transaction
      const ticket = role === "REQUESTER"
        ? await tx.ticket.findFirst({ where: { id: ticketId, requesterId: userId }, select: { id: true } })
        : await tx.ticket.findFirst({ where: { id: ticketId }, select: { id: true } });
      if (!ticket) throw new AttachmentFailure("TICKET_NOT_FOUND");
      if (await tx.attachment.count({ where: { ticketId, isRemoved: false } }) >= 5) throw new AttachmentFailure("ATTACHMENT_LIMIT_REACHED");
      const stored = await attachmentStorage.write(file.buffer, valid.extension); written = stored.storedFileName;
      const attachment = await tx.attachment.create({ data: { ...stored, ticketId, originalFileName: file.originalname, mimeType: valid.mimeType, fileSizeBytes: file.size, uploadedById: userId }, select: attachmentSelect });
      await tx.$executeRaw`UPDATE "Ticket" SET "updatedAt" = GREATEST(date_trunc('milliseconds', clock_timestamp() AT TIME ZONE 'UTC'), "updatedAt" + interval '1 millisecond') WHERE id = ${ticketId}`;
      return attachment;
    });
    written = undefined; res.status(201).json(dto);
  } catch (error) { if (written) await attachmentStorage.discard(written); fail(res, error); }
});

attachments.get("/attachments/:attachmentId", requireAuth, async (req, res) => {
  const id = idFrom(req, res, "attachmentId"); if (id === null) return;
  try {
    const role = res.locals.userRole;
    const where = role === "REQUESTER"
      ? { id, ticket: { requesterId: res.locals.userId } }
      : { id };
    const value = await getPrisma().attachment.findFirst({ where, select: attachmentSelect });
    if (!value) sendError(res, "ATTACHMENT_NOT_FOUND"); else res.json(value);
  } catch (error) { fail(res, error); }
});
attachments.get("/attachments/:attachmentId/download", requireAuth, async (req, res) => {
  const id = idFrom(req, res, "attachmentId"); if (id === null) return;
  try {
    const role = res.locals.userRole;
    const where = role === "REQUESTER"
      ? { id, isRemoved: false, ticket: { requesterId: res.locals.userId } }
      : { id, isRemoved: false };
    const value = await getPrisma().attachment.findFirst({ where, select: { storedFileName: true, originalFileName: true, mimeType: true } });
    if (!value) { sendError(res, "ATTACHMENT_NOT_FOUND"); return; }
    const file = await attachmentStorage.open(value.storedFileName);
    try {
      const info = await file.stat();
      const disposition = contentDisposition(value.originalFileName.replace(/[\r\n\0]/g, ""));
      res.set({ "Content-Type": value.mimeType, "Content-Disposition": disposition, "Content-Length": String(info.size) });
      const stream = file.createReadStream();
      res.on("close", () => stream.destroy());
      stream.on("error", () => { if (res.headersSent) res.destroy(); else { res.removeHeader("Content-Length"); res.removeHeader("Content-Disposition"); sendError(res, "INTERNAL_ERROR"); } });
      stream.pipe(res);
    } catch (error) { await file.close(); throw error; }
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") sendError(res, "ATTACHMENT_NOT_FOUND"); else fail(res, error); }
});
attachments.patch("/attachments/:attachmentId/remove", requireAuth, csrfProtection, async (req, res) => {
  const id = idFrom(req, res, "attachmentId"); if (id === null) return;
  try {
    const db = getPrisma(), userId = res.locals.userId;
    const role = res.locals.userRole;
    const where = role === "REQUESTER"
      ? { id, ticket: { requesterId: userId } }
      : { id };
    const owned = await db.attachment.findFirst({ where, select: { id: true, isRemoved: true } });
    if (!owned) { sendError(res, "ATTACHMENT_NOT_FOUND"); return; }
    if (owned.isRemoved) { sendError(res, "ALREADY_REMOVED"); return; }
    const body = req.body as Record<string, unknown> | undefined;
    const reason = typeof body?.removalReason === "string" ? body.removalReason.trim() : "";
    if (!req.is("application/json") || !body || Array.isArray(body) || Object.keys(body).some(key => key !== "removalReason") || reason.length < 5 || reason.length > 255) { sendError(res, "VALIDATION_ERROR", { removalReason: "Removal reason must be between 5 and 255 characters." }); return; }
    const value = await db.$transaction(async tx => {
      const changed = await tx.attachment.updateMany({ where: { id, isRemoved: false }, data: { isRemoved: true, removedAt: new Date(), removedById: userId, removalReason: reason } });
      if (!changed.count) throw new AttachmentFailure("ALREADY_REMOVED");
      const item = await tx.attachment.findFirstOrThrow({ where: { id }, select: { ...attachmentSelect, ticketId: true } });
      await tx.$executeRaw`UPDATE "Ticket" SET "updatedAt" = GREATEST(date_trunc('milliseconds', clock_timestamp() AT TIME ZONE 'UTC'), "updatedAt" + interval '1 millisecond') WHERE id = ${item.ticketId}`;
      const { ticketId: _internal, ...dto } = item; return dto;
    });
    res.json(value);
  } catch (error) { fail(res, error); }
});
