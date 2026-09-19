import express from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { sendError } from "./errors.js";
import { tickets } from "./tickets.js";
import { attachments } from "./attachments.js";
import type { ErrorRequestHandler } from "express";

// Keep the exported app separate from the listener for Supertest.
export const app = express();
app.use(cors());
app.use(express.json());
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "TokTickIT API" });
});
// Public reference data: requester context is deliberately not mounted here.
app.get("/api/categories", async (_req, res) => {
  try {
    const items = await getPrisma().category.findMany({ select: { id: true, name: true }, orderBy: { id: "asc" } });
    res.json({ items });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});
app.get("/api/development-requesters", async (_req, res) => {
  try {
    const items = await getPrisma().user.findMany({
      where: { isActive: true, role: "REQUESTER" }, select: { id: true, name: true, department: true }, orderBy: { name: "asc" },
    });
    res.json({ items });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});
app.get("/api/related-systems", async (_req, res) => {
  try {
    const items = await getPrisma().relatedSystem.findMany({
      where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" },
    });
    res.json({ items });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});
app.use("/api", attachments);
app.use("/api/tickets", tickets);
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.type === "entity.parse.failed") sendError(res, "VALIDATION_ERROR", { body: "A valid JSON object is required." });
  else sendError(res, "INTERNAL_ERROR");
};
app.use(errorHandler);
export default app;
