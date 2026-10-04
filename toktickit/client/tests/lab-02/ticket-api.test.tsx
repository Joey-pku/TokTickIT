import { afterEach, expect, it, vi } from "vitest";
import { createTicket, listTickets, getTicket, TicketApiError } from "../../src/ticket-api.js";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it("serializes only supplied filters and uses session credentials", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [], pagination: {} }) }); vi.stubGlobal("fetch", fetcher);
  await listTickets({ page: 1, pageSize: 10, sortBy: "createdAt", sortOrder: "desc" });
  const url = new URL(fetcher.mock.calls[0][0]); expect(url.searchParams.has("status")).toBe(false); expect(url.searchParams.has("categoryId")).toBe(false);
  expect(fetcher.mock.calls[0][1].credentials).toBe("include");
});
it("parses direct objects and validation envelopes", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) })
    .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { code: "VALIDATION_ERROR", message: "Invalid data", fields: { summary: "Too short" } } }) });
  vi.stubGlobal("fetch", fetcher);
  expect(await getTicket(1)).toEqual({ id: 1 });
  await expect(createTicket({ categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", summary: "abc", description: "valid description" })).rejects.toBeInstanceOf(TicketApiError);
});

