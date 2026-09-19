import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { db, listKeys, ticketFixtures } from "./ticket-fixtures.js";
let f: Awaited<ReturnType<typeof ticketFixtures>>;
beforeAll(async () => { f = await ticketFixtures(); });
afterEach(async () => { await f.clear(); });
afterAll(async () => { await f.dispose(); });
const list = async (query = "", cookieOrUser?: string | { email: string }) => {
  let cookie = typeof cookieOrUser === "string" ? cookieOrUser : undefined;
  if (!cookieOrUser) cookie = await f.loginAs(f.a);
  else if (typeof cookieOrUser === "object") cookie = await f.loginAs(cookieOrUser);
  return request(app).get("/api/tickets" + query).set("Cookie", cookie || "");
};

it("API-LST-001–005: exact DTO and pagination isolate rows and counts", async () => {
  const own = await f.ticket(); const other = await f.ticket({ requesterId: f.b.id });
  const res = await list(); expect(res.status).toBe(200);
  expect(res.body.pagination).toEqual({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
  expect(res.body.items.map((t: { id: number }) => t.id)).toEqual([own.id]);
  expect(Object.keys(res.body.items[0]).sort()).toEqual(listKeys);
  expect(res.body.items[0]).toMatchObject({ categoryName: "Hardware", relatedSystemName: "VPN" });
  const b = await list("", f.b); expect(b.body.items.map((t: { id: number }) => t.id)).toEqual([other.id]);
  expect(await db.ticket.count({ where: { id: { in: res.body.items.map((t: { id: number }) => t.id) }, requesterId: f.a.id } })).toBe(1);
});
it("API-LST-004–007: pagination boundaries and allowed page sizes", async () => {
  await Promise.all(Array.from({ length: 26 }, () => f.ticket()));
  for (const size of [10, 25, 50]) {
    const res = await list("?pageSize=" + size); expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(Math.min(size, 26));
    expect(res.body.pagination.totalPages).toBe(Math.ceil(26 / size));
  }
  expect((await list("?page=2")).body.items).toHaveLength(10);
  const beyond = await list("?page=99"); expect(beyond.status).toBe(200);
  expect(beyond.body).toEqual({ items: [], pagination: { page: 99, pageSize: 10, totalItems: 26, totalPages: 3 } });
});
it("API-LST-007,016: zero records yields zero pages", async () => {
  expect((await list()).body).toEqual({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
});
it("a large positive page beyond the last page remains a successful empty result", async () => {
  await f.ticket();
  const res = await list("?page=2147483648");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ items: [], pagination: { page: 2147483648, pageSize: 10, totalItems: 1, totalPages: 1 } });
});
it("search treats percent and underscore as literal substring characters", async () => {
  const literal = await f.ticket({ summary: "VPN_100% outage" });
  await f.ticket({ summary: "VPNX100X outage" });
  const res = await list("?search=" + encodeURIComponent("_100%"));
  expect(res.status).toBe(200);
  expect(res.body.items.map((ticket: { id: number }) => ticket.id)).toEqual([literal.id]);
});
it.each(["page=0", "page=-1", "page=1.5", "page=abc", "page=", "pageSize=11", "pageSize=0", "pageSize=abc",
  "sortBy=summary", "sortOrder=DESC", "categoryId=2147483647", "categoryId=abc", "categoryId=1.5",
  "requestedPriority=CRITICAL", "requestedPriority=ALL", "status=INVALID", "status=ALL", "status=",
  "page=1&page=2", "search[x]=a"])("API-LST-008,009,013,022: invalid query %s", async query => {
  const res = await list("?" + query); expect(res.status).toBe(400);
  expect(res.body).toMatchObject({ error: { code: "VALIDATION_ERROR", message: expect.any(String), fields: expect.any(Object) } });
});
it("API-LST-010–012: sorting uses deterministic id DESC ties", async () => {
  const date = new Date("2026-01-01T00:00:00.000Z");
  const a = await f.ticket({ ticketNumber: "TKT-1901-000001", createdAt: date, updatedAt: date });
  const b = await f.ticket({ ticketNumber: "TKT-1901-000002", createdAt: date, updatedAt: new Date("2026-01-02T00:00:00Z") });
  const ids = (res: { body: { items: { id: number }[] } }) => res.body.items.map(t => t.id);
  expect(ids(await list())).toEqual([b.id, a.id]);
  expect(ids(await list("?sortBy=createdAt&sortOrder=asc"))).toEqual([b.id, a.id]);
  expect(ids(await list("?sortBy=ticketNumber&sortOrder=asc"))).toEqual([a.id, b.id]);
  expect(ids(await list("?sortBy=updatedAt&sortOrder=desc"))).toEqual([b.id, a.id]);
});
it("API-LST-014–021: case-insensitive substring search, filters, omission and intersections", async () => {
  const vpn = await f.ticket({ summary: "My VPN Connection", requestedPriority: "HIGH", ticketNumber: "TKT-1902-000321" });
  await f.ticket({ summary: "Laptop software failure", categoryId: f.otherCategory.id, requestedPriority: "LOW" });
  await f.ticket({ requesterId: f.b.id, summary: "My VPN Connection", requestedPriority: "HIGH" });
  for (const query of ["search=%20vPn%20", "search=tkt-1902-0003", "categoryId=" + f.category.id, "requestedPriority=HIGH", "search=vpn&requestedPriority=HIGH&status=NEW&categoryId=" + f.category.id]) {
    const res = await list("?" + query); expect(res.body.items.map((t: { id: number }) => t.id)).toEqual([vpn.id]); expect(res.body.pagination.totalItems).toBe(1);
  }
  expect((await list("?search=absent")).body.pagination.totalPages).toBe(0);
  expect((await list("?search=%20%20&status=NEW")).body.items).toHaveLength(2);
  expect((await list()).body.items).toHaveLength(2);
});
it("API-LST-023–024: requires session auth", async () => {
  const req = request(app).get("/api/tickets");
  const res = await req; expect(res.status).toBe(401); expect(res.body).toEqual({ error: { code: "UNAUTHENTICATED", message: expect.any(String) } });
});
