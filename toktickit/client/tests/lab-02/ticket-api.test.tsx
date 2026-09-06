import { afterEach, expect, it, vi } from "vitest";
import { createTicket, listTickets, getTicket, TicketApiError } from "../../src/ticket-api.js";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it("serializes only supplied filters and passes requester identity", async () => {
  localStorage.setItem("toktickit_selected_requester_id", "2");
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [], pagination: {} }) }); vi.stubGlobal("fetch", fetcher);
  await listTickets({ page: 1, pageSize: 10, sortBy: "createdAt", sortOrder: "desc" });
  const url = new URL(fetcher.mock.calls[0][0]); expect(url.searchParams.has("status")).toBe(false); expect(url.searchParams.has("categoryId")).toBe(false);
  expect(new Headers(fetcher.mock.calls[0][1].headers).get("x-requester-id")).toBe("2");
});
it("parses direct objects and validation envelopes", async () => {
  localStorage.setItem("toktickit_selected_requester_id", "1");
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) })
    .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { code: "VALIDATION_ERROR", message: "Invalid data", fields: { summary: "Too short" } } }) });
  vi.stubGlobal("fetch", fetcher);
  expect(await getTicket(1)).toEqual({ id: 1 });
  await expect(createTicket({ categoryId: 1, relatedSystemId: 1, requestedPriority: "MEDIUM", summary: "abc", description: "valid description" })).rejects.toBeInstanceOf(TicketApiError);
});

