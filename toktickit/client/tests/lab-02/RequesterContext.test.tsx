import { useState } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequesterProvider, useRequester } from "../../src/RequesterContext.js";
import { RequesterGuard } from "../../src/RequesterApp.js";
import * as api from "../../src/api.js";

beforeEach(() => {
  cleanup(); vi.restoreAllMocks(); localStorage.clear();
  localStorage.setItem("toktickit_selected_requester_id", "1");
  vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue([
    { id: 1, name: "Requester A", department: "A" }, { id: 2, name: "Requester B", department: "B" },
  ]);
});
function ScopedConsumer() {
  const { requester } = useRequester();
  const [cachedName] = useState(requester!.name);
  return <p>Cached: {cachedName}</p>;
}
function Harness() {
  const { select, change } = useRequester();
  return <><button onClick={() => select(2)}>Switch to B</button><button onClick={change}>Clear context</button><RequesterGuard><ScopedConsumer /></RequesterGuard></>;
}
it("switching identity remounts scoped consumers and aborts old requests", async () => {
  const user = userEvent.setup(); render(<RequesterProvider><Harness /></RequesterProvider>);
  expect(await screen.findByText("Cached: Requester A")).toBeInTheDocument();
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
  await api.requesterFetch("/test-only");
  const oldSignal = fetcher.mock.calls[0][1]!.signal!;
  await user.click(screen.getByRole("button", { name: "Switch to B" }));
  expect(oldSignal.aborted).toBe(true);
  expect(screen.queryByText("Cached: Requester A")).not.toBeInTheDocument();
  expect(screen.getByText("Cached: Requester B")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Clear context" }));
  expect(screen.queryByText("Cached: Requester B")).not.toBeInTheDocument();
  expect(localStorage.getItem("toktickit_selected_requester_id")).toBeNull();
});
