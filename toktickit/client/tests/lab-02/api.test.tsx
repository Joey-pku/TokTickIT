import { afterEach, expect, it, vi } from "vitest";
import { checkSystem, getCategories, getRelatedSystems } from "../../src/api.js";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it("unwraps reference items and preserves the Lab 1 system-check return shape", async () => {
  const categories = [{ id: 1, name: "Account and Access" }];
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: categories }) });
  vi.stubGlobal("fetch", fetcher);
  expect(await getCategories()).toEqual(categories);
  expect(await getRelatedSystems()).toEqual(categories);
  fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok", service: "TokTickIT API" }) });
  expect(await checkSystem()).toEqual({ online: true, categories });
});
it("propagates reference API failures", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  await expect(getCategories()).rejects.toThrow();
});
