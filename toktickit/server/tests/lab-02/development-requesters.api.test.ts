import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
afterAll(() => prisma.$disconnect());
describe("Development requester and reference APIs", () => {
  it("API-REQ-001–004: exposes exactly the four active requester DTOs in name order", async () => {
    const response = await request(app).get("/api/development-requesters");
    expect(response.status).toBe(200);
    expect(response.body.items.map((item: { name: string }) => item.name)).toEqual([
      "David Lee", "Jennifer Anderson", "Michael Brown", "Sarah Johnson",
    ]);
    for (const item of response.body.items) {
      expect(Object.keys(item).sort()).toEqual(["department", "id", "name"]);
      expect(item.id).toEqual(expect.any(Number));
      expect(item.department).toEqual(expect.any(String));
    }
  });
  it("returns categories in id order in the items envelope without context", async () => {
    const response = await request(app).get("/api/categories");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: await prisma.category.findMany({ select: { id: true, name: true }, orderBy: { id: "asc" } }) });
  });
  it("returns seven active systems alphabetically, excluding inactive fixtures", async () => {
    const inactive = await prisma.relatedSystem.create({ data: { name: "Inactive test system", isActive: false } });
    try {
      const response = await request(app).get("/api/related-systems");
      expect(response.status).toBe(200);
      expect(response.body.items.map((item: { name: string }) => item.name)).toEqual([
        "Campus Wi-Fi", "Corporate Laptop", "Email", "Grade Submission App", "LEB2 App", "Printer", "VPN",
      ]);
      for (const item of response.body.items) expect(Object.keys(item).sort()).toEqual(["id", "name"]);
    } finally { await prisma.relatedSystem.delete({ where: { id: inactive.id } }); }
  });
  it.each(["development-requesters", "categories", "related-systems"])("%s is public even with a malformed context header", async (path) => {
    expect((await request(app).get(`/api/${path}`).set("x-requester-id", "invalid")).status).toBe(200);
  });
  it.each([
    ["development-requesters", "developmentRequester"], ["categories", "category"], ["related-systems", "relatedSystem"],
  ] as const)("%s handles empty results and sanitizes DB failures", async (path, model) => {
    const delegate = prisma[model] as unknown as { findMany: () => Promise<unknown[]> };
    const spy = vi.spyOn(delegate, "findMany");
    try {
      spy.mockResolvedValueOnce([]);
      expect((await request(app).get(`/api/${path}`)).body).toEqual({ items: [] });
      spy.mockRejectedValueOnce(new Error("PRIVATE SQL /internal/path"));
      const failure = await request(app).get(`/api/${path}`);
      expect(failure.status).toBe(500);
      expect(failure.body).toEqual({ error: { code: "INTERNAL_ERROR", message: expect.any(String) } });
      expect(JSON.stringify(failure.body)).not.toMatch(/PRIVATE|SQL|internal\/path/);
    } finally { spy.mockRestore(); }
  });
});
