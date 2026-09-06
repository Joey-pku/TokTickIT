import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import request from "supertest";
import { mkdtemp, readdir, readFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app } from "../../src/app.js";
import type { Prisma } from "@prisma/client";
import { db, ticketFixtures } from "./ticket-fixtures.js";
let f: Awaited<ReturnType<typeof ticketFixtures>>, ticketId: number, directory: string;
const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, ...Buffer.from("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
const webp = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");
const keys = ["id", "originalFileName", "mimeType", "fileSizeBytes", "isRemoved", "removedAt", "removalReason", "createdAt"].sort();
beforeAll(async () => { directory = await mkdtemp(join(tmpdir(), "toktickit-attachments-test-")); process.env.UPLOAD_DIR = directory; f = await ticketFixtures(); });
beforeEach(async () => { ticketId = (await f.ticket({ updatedAt: new Date("2020-01-01") })).id; });
afterEach(async () => { vi.restoreAllMocks(); await f.clear(); for (const name of await readdir(directory)) await unlink(join(directory, name)); });
afterAll(async () => { await f.dispose(); await rmdir(directory); delete process.env.UPLOAD_DIR; });
const upload = (bytes = pdf, name = "proof.pdf", type = "application/pdf", id?: number, requester?: number) => request(app).post(`/api/tickets/${id ?? ticketId}/attachments`).set("x-requester-id", String(requester ?? f.a.id)).attach("file", bytes, { filename: name, contentType: type });
const remove = (id: number, reason: unknown = "Wrong document", owner?: number) => request(app).patch(`/api/attachments/${id}/remove`).set("x-requester-id", String(owner ?? f.a.id)).send({ removalReason: reason });
function envelope(res: { status: number; body: unknown }, status: number, code: string) { expect(res.status).toBe(status); expect(res.body).toEqual({ error: { code, message: expect.any(String), ...(code === "VALIDATION_ERROR" ? { fields: expect.any(Object) } : {}) } }); }
it.each([[jpeg, "photo.jpg", "image/jpeg"], [jpeg, "photo.JPEG", "image/jpeg"], [png, "photo.png", "image/png"], [webp, "photo.webp", "image/webp"], [pdf, "proof.pdf", "application/pdf"]] as const)("API-ATT-001–004,013–014: persists permitted %s %s with exact DTO and private UUID filename", async (bytes, name, type) => {
  const res = await upload(bytes, name, type); expect(res.status).toBe(201); expect(Object.keys(res.body).sort()).toEqual(keys);
  expect(res.body).toMatchObject({ originalFileName: name, mimeType: type, fileSizeBytes: bytes.length, isRemoved: false, removedAt: null, removalReason: null });
  const stored = await db.attachment.findUniqueOrThrow({ where: { id: res.body.id } }); expect(stored.uploadedById).toBe(f.a.id);
  expect(stored.storedFileName).toMatch(/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|pdf)$/);
  expect(await readFile(join(directory, stored.storedFileName))).toEqual(bytes);
});
it("API-ATT-005,021: successful mutations strictly advance parent updatedAt", async () => {
  const before = await db.ticket.findUniqueOrThrow({ where: { id: ticketId } }); const res = await upload(); expect(res.status).toBe(201);
  const after = await db.ticket.findUniqueOrThrow({ where: { id: ticketId } }); expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  expect((await remove(res.body.id)).status).toBe(200); const end = await db.ticket.findUniqueOrThrow({ where: { id: ticketId } }); expect(end.updatedAt.getTime()).toBeGreaterThan(after.updatedAt.getTime()); expect(end.createdAt).toEqual(before.createdAt);
});
it.each([["bad.exe", "application/pdf", pdf], ["bad.docx", "application/pdf", pdf], ["fake.png", "image/png", pdf], ["fake.pdf", "image/png", pdf], ["fake.pdf", "application/pdf", Buffer.from("not a document")], ["empty.pdf", "application/pdf", Buffer.alloc(0)]] as const)("API-ATT-006: rejects mismatched extension/content/declaration %s %s", async (name, type, bytes) => { envelope(await upload(bytes, name, type), 415, "UNSUPPORTED_MEDIA_TYPE"); expect(await readdir(directory)).toEqual([]); });
it.each([5242880, 5242881])("API-ATT-007–008: exact size boundary %i", async size => {
  const bytes = Buffer.alloc(size, 32); pdf.copy(bytes); const res = await upload(bytes);
  if (size === 5242880) expect(res.status).toBe(201); else { envelope(res, 413, "FILE_TOO_LARGE"); expect(await readdir(directory)).toEqual([]); }
});
it("API-ATT-009: missing, wrong field, multiple files and malformed multipart return 400", async () => {
  const base = () => request(app).post(`/api/tickets/${ticketId}/attachments`).set("x-requester-id", String(f.a.id));
  for (const res of [await base().send({}), await base().field("note", "no file"), await base().attach("wrong", pdf, "x.pdf"), await base().attach("file", pdf, "x.pdf").attach("file", pdf, "y.pdf"), await base().set("Content-Type", "multipart/form-data; boundary=broken").send("broken")]) envelope(res, 400, "VALIDATION_ERROR");
  expect(await readdir(directory)).toEqual([]);
});
it("API-ATT-010,020: concurrent uploads enforce five active slots and removal releases one", async () => {
  const results = await Promise.all(Array.from({ length: 7 }, () => upload()));
  expect(results.filter(r => r.status === 201)).toHaveLength(5); for (const res of results.filter(r => r.status !== 201)) envelope(res, 409, "ATTACHMENT_LIMIT_REACHED");
  expect(await db.attachment.count({ where: { ticketId, isRemoved: false } })).toBe(5); expect(await readdir(directory)).toHaveLength(5);
  expect((await remove(results.find(r => r.status === 201)!.body.id)).status).toBe(200); expect((await upload()).status).toBe(201);
});
it("API-ATT-011–012: upload cannot distinguish absent and unowned tickets", async () => { const own = await upload(pdf, "p.pdf", "application/pdf", ticketId, f.b.id); const absent = await upload(pdf, "p.pdf", "application/pdf", 2147483647); envelope(own, 404, "TICKET_NOT_FOUND"); expect(absent.status).toBe(404); expect(absent.body).toEqual(own.body); expect(await readdir(directory)).toEqual([]); });
it("API-ATT-015: download bytes and headers preserve original name", async () => {
  const uploaded = await upload(pdf, 'original report.pdf'); expect(uploaded.status).toBe(201);
  const res = await request(app).get(`/api/attachments/${uploaded.body.id}/download`).set("x-requester-id", String(f.a.id)).buffer(true).parse((response, done) => { const chunks: Buffer[] = []; response.on("data", chunk => chunks.push(Buffer.from(chunk))); response.on("end", () => done(null, Buffer.concat(chunks))); });
  expect(res.status).toBe(200); expect(res.headers["content-type"]).toBe("application/pdf"); expect(res.headers["content-disposition"]).toBe('attachment; filename="original report.pdf"'); expect(Number(res.headers["content-length"])).toBe(pdf.length); expect(res.body).toEqual(pdf);
});
it("API-ATT-016–019,022–023,028–035: removal retains audit metadata and blocks content", async () => {
  const uploaded = await upload(); expect(uploaded.status).toBe(201); const id = uploaded.body.id;
  const active = await request(app).get(`/api/attachments/${id}`).set("x-requester-id", String(f.a.id)); expect(active.status).toBe(200); expect(active.body).toEqual(uploaded.body);
  const removed = await remove(id, "  Wrong document  "); expect(removed.status).toBe(200); expect(Object.keys(removed.body).sort()).toEqual(keys); expect(removed.body).toMatchObject({ isRemoved: true, removalReason: "Wrong document", removedAt: expect.any(String) });
  envelope(await remove(id), 409, "ALREADY_REMOVED");
  const stored = await db.attachment.findUniqueOrThrow({ where: { id } }); expect(stored.removedById).toBe(f.a.id); expect(stored.uploadedById).toBe(f.a.id); expect(await readFile(join(directory, stored.storedFileName))).toEqual(pdf);
  const meta = await request(app).get(`/api/attachments/${id}`).set("x-requester-id", String(f.a.id)); expect(meta.status).toBe(200); expect(meta.body).toEqual(removed.body);
  for (const suffix of ["", "/download"]) {
    const other = await request(app).get(`/api/attachments/${id}${suffix}`).set("x-requester-id", String(f.b.id)); const absent = await request(app).get(`/api/attachments/2147483647${suffix}`).set("x-requester-id", String(f.a.id)); envelope(other, 404, "ATTACHMENT_NOT_FOUND"); expect(absent.body).toEqual(other.body);
  }
  envelope(await request(app).get(`/api/attachments/${id}/download`).set("x-requester-id", String(f.a.id)), 404, "ATTACHMENT_NOT_FOUND");
  envelope(await remove(id, "Wrong file", f.b.id), 404, "ATTACHMENT_NOT_FOUND"); envelope(await remove(2147483647), 404, "ATTACHMENT_NOT_FOUND");
});
it.each([undefined, null, 42, {}, "", "    ", "abcd", "x".repeat(256)])("API-ATT-024–027: rejects removal reason %j", async reason => { const uploaded = await upload(); expect(uploaded.status).toBe(201); envelope(await remove(uploaded.body.id, reason === undefined ? null : reason), 400, "VALIDATION_ERROR"); expect((await db.attachment.findUniqueOrThrow({ where: { id: uploaded.body.id } })).isRemoved).toBe(false); });
it.each([5, 255])("accepts removal reason boundary %i after trim", async length => { const uploaded = await upload(); expect(uploaded.status).toBe(201); const res = await remove(uploaded.body.id, "  " + "x".repeat(length) + "  "); expect(res.status).toBe(200); expect(res.body.removalReason).toHaveLength(length); });
it("concurrent removals record exactly one success", async () => { const uploaded = await upload(); expect(uploaded.status).toBe(201); const results = await Promise.all([remove(uploaded.body.id, "First reason"), remove(uploaded.body.id, "Second reason")]); expect(results.map(r => r.status).sort()).toEqual([200, 409]); expect((await db.attachment.findUniqueOrThrow({ where: { id: uploaded.body.id } })).removalReason).toBe(results.find(r => r.status === 200)!.body.removalReason); });
it("all four endpoints retain requester-context errors", async () => {
  for (const [id, status, code] of [[null, 400, "MISSING_REQUESTER_CONTEXT"], ["abc", 400, "INVALID_REQUESTER_ID"], [String(f.inactive.id), 404, "REQUESTER_NOT_FOUND"], ["2147483647", 404, "REQUESTER_NOT_FOUND"]] as const) {
    for (const req of [request(app).post(`/api/tickets/${ticketId}/attachments`), request(app).get("/api/attachments/1"), request(app).get("/api/attachments/1/download"), request(app).patch("/api/attachments/1/remove")]) { if (id !== null) req.set("x-requester-id", id); envelope(await req, status, code); }
  }
});
it("failed upload preserves the ticket, prior attachments and parent timestamp", async () => { const good = await upload(); expect(good.status).toBe(201); const before = await db.ticket.findUniqueOrThrow({ where: { id: ticketId } }); envelope(await upload(pdf, "bad.exe"), 415, "UNSUPPORTED_MEDIA_TYPE"); expect(await db.ticket.findUniqueOrThrow({ where: { id: ticketId } })).toEqual(before); expect(await db.attachment.count({ where: { ticketId } })).toBe(1); });
it("disk failure returns a safe 500 without database changes", async () => { const old = process.env.UPLOAD_DIR; process.env.UPLOAD_DIR = join(directory, "blocked"); const { writeFile } = await import("node:fs/promises"); await writeFile(process.env.UPLOAD_DIR, "not a directory"); try { envelope(await upload(), 500, "INTERNAL_ERROR"); expect(await db.attachment.count({ where: { ticketId } })).toBe(0); } finally { process.env.UPLOAD_DIR = old; } });
it("database failure after file creation removes the new file and rolls back parent changes", async () => {
  const before = await db.ticket.findUniqueOrThrow({ where: { id: ticketId } });
  const transaction = db.$transaction.bind(db);
  vi.spyOn(db, "$transaction").mockImplementationOnce((async (operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => transaction(async tx => {
    const create = vi.spyOn(tx.attachment, "create").mockRejectedValueOnce(new Error("PRIVATE database failure"));
    try { return await operation(tx); } finally { create.mockRestore(); }
  })) as typeof db.$transaction);
  envelope(await upload(), 500, "INTERNAL_ERROR");
  expect(await readdir(directory)).toEqual([]); expect(await db.attachment.count({ where: { ticketId } })).toBe(0);
  expect(await db.ticket.findUniqueOrThrow({ where: { id: ticketId } })).toEqual(before);
});
it("missing removal reason and extra server-controlled fields return validation errors", async () => {
  const uploaded = await upload(); expect(uploaded.status).toBe(201);
  for (const body of [{}, { removalReason: "Wrong document", removedById: f.b.id }, { removalReason: "Wrong document", isRemoved: true }]) {
    envelope(await request(app).patch(`/api/attachments/${uploaded.body.id}/remove`).set("x-requester-id", String(f.a.id)).send(body), 400, "VALIDATION_ERROR");
  }
});
it("missing binary returns 404 while metadata remains retrievable", async () => {
  const uploaded = await upload(); expect(uploaded.status).toBe(201); const stored = await db.attachment.findUniqueOrThrow({ where: { id: uploaded.body.id } }); await unlink(join(directory, stored.storedFileName));
  envelope(await request(app).get(`/api/attachments/${stored.id}/download`).set("x-requester-id", String(f.a.id)), 404, "ATTACHMENT_NOT_FOUND");
  expect((await request(app).get(`/api/attachments/${stored.id}`).set("x-requester-id", String(f.a.id))).status).toBe(200);
});
it("Unicode filename is metadata only and download headers encode it safely", async () => {
  const name = "หลักฐาน.pdf", uploaded = await upload(pdf, name); expect(uploaded.status).toBe(201); expect(uploaded.body.originalFileName).toBe(name);
  const res = await request(app).get(`/api/attachments/${uploaded.body.id}/download`).set("x-requester-id", String(f.a.id)); expect(res.status).toBe(200);
  expect(res.headers["content-disposition"]).toContain("filename*=UTF-8''" + encodeURIComponent(name)); expect(res.headers["content-disposition"]).not.toContain(directory);
});
