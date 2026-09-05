import express from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { sendError } from "./errors.js";

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
    const items = await getPrisma().developmentRequester.findMany({
      where: { isActive: true }, select: { id: true, name: true, department: true }, orderBy: { name: "asc" },
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
export default app;
