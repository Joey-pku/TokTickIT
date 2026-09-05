import express from "express";
import request from "supertest";
import { afterAll, expect, it } from "vitest";
import { requesterContext } from "../../src/requester-context.js";
import { getPrisma } from "../../src/prisma.js";
const prisma = getPrisma();
const harness = express();
harness.use(express.json(), requesterContext);
harness.post("/context", (_req, res) => res.json({ id: res.locals.requesterId }));
afterAll(() => prisma.$disconnect());
it("requires the header even when identity appears in body or query", async () => {
  const response = await request(harness).post("/context?requesterId=1").send({ requesterId: 1 });
  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: { code: "MISSING_REQUESTER_CONTEXT", message: expect.any(String) } });
});
it.each(["", "abc", "1.5", "1e2", "-1", "0", "+1", "1x", "1,2"])("rejects malformed ID %s", async (id) => {
  const response = await request(harness).post("/context").set("x-requester-id", id);
  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: { code: "INVALID_REQUESTER_ID", message: expect.any(String) } });
});
it("returns identical 404 envelopes for inactive and absent requesters", async () => {
  const inactive = await prisma.developmentRequester.findUniqueOrThrow({ where: { email: "alex.taylor@example.com" } });
  const responses = await Promise.all([inactive.id, 2147483647].map(id => request(harness).post("/context").set("x-requester-id", String(id))));
  for (const response of responses) {
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: "REQUESTER_NOT_FOUND", message: expect.any(String) } });
  }
  expect(responses[0].body).toEqual(responses[1].body);
});
it("resolves active context only from the header", async () => {
  const active = await prisma.developmentRequester.findUniqueOrThrow({ where: { email: "jennifer.anderson@example.com" } });
  const response = await request(harness).post("/context?requesterId=999").set("x-requester-id", String(active.id)).send({ requesterId: 999 });
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ id: active.id });
});
