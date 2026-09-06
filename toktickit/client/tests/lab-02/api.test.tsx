import { afterEach, expect, it, vi } from "vitest";
import { checkSystem, getCategories, getDevelopmentRequesters, getRelatedSystems, requesterFetch } from "../../src/api.js";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it("unwraps reference items and preserves the Lab 1 system-check return shape", async () => {
  const categories = [{ id: 1, name: "Account and Access" }];
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: categories }) });
  vi.stubGlobal("fetch", fetcher);
  expect(await getCategories()).toEqual(categories);
  expect(await getRelatedSystems()).toEqual(categories);
  expect(await getDevelopmentRequesters()).toEqual(categories);
  fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok", service: "TokTickIT API" }) });
  expect(await checkSystem()).toEqual({ online: true, categories });
});
it("uses the latest selected ID for every scoped request and refuses absent context", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal("fetch", fetcher);
  localStorage.setItem("toktickit_selected_requester_id", "1"); await requesterFetch("/test-only");
  localStorage.setItem("toktickit_selected_requester_id", "2"); await requesterFetch("/test-only");
  expect(new Headers(fetcher.mock.calls[0][1].headers).get("x-requester-id")).toBe("1");
  expect(new Headers(fetcher.mock.calls[1][1].headers).get("x-requester-id")).toBe("2");
  localStorage.clear(); await expect(requesterFetch("/test-only")).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("propagates reference API failures", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  await expect(getDevelopmentRequesters()).rejects.toThrow();
});
