import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequesterApp } from "../../src/RequesterApp.js";
import * as api from "../../src/api.js";

const key = "toktickit_selected_requester_id";
const requesters = [
  { id: 1, name: "Jennifer Anderson", department: "Marketing" },
  { id: 2, name: "David Lee", department: "Engineering" },
  { id: 3, name: "Sarah Johnson", department: "Human Resources" },
  { id: 4, name: "Michael Brown", department: "Finance" },
];
beforeEach(() => {
  cleanup(); vi.restoreAllMocks(); localStorage.clear();
  window.history.replaceState({}, "", "/select-requester");
  vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(requesters);
});
it("UI-REQ-001: shows loading with disabled dropdown and Continue", () => {
  vi.mocked(api.getDevelopmentRequesters).mockReturnValue(new Promise(() => {}));
  render(<RequesterApp />);
  expect(screen.getByText("Loading active development requesters...")).toBeInTheDocument();
  expect(screen.getByRole("combobox")).toBeDisabled();
  expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();
});
it("UI-REQ-002,003,008–013: selects, persists, navigates, and labels the testing-only UI", async () => {
  const user = userEvent.setup(); render(<RequesterApp />);
  const select = await screen.findByRole("option", { name: "Jennifer Anderson (Marketing)" });
  expect(select).toBeInTheDocument();
  expect(screen.getAllByRole("option")).toHaveLength(5);
  expect(screen.queryByRole("option", { name: /Alex Taylor/ })).not.toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: /Development Requester/ })).toHaveAttribute("aria-required", "true");
  expect(screen.getByText(/This is not a login screen/)).toBeInTheDocument();
  expect(screen.getByText(/Authentication coming in Lab 3/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();
  await user.selectOptions(screen.getByRole("combobox"), "1");
  expect(localStorage.getItem(key)).toBeNull();
  expect(screen.getByRole("button", { name: /Continue/ })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: /Continue/ }));
  expect(localStorage.getItem(key)).toBe("1");
  expect(window.location.pathname).toBe("/tickets");
  expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
});
it("Cancel clears the pending choice", async () => {
  const user = userEvent.setup(); render(<RequesterApp />);
  await screen.findByRole("option", { name: /Jennifer/ });
  await user.selectOptions(screen.getByRole("combobox"), "1");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("combobox")).toHaveValue("");
  expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();
  expect(localStorage.getItem(key)).toBeNull();
});
it("UI-REQ-004–006: failure preserves persisted context and Retry fetches again", async () => {
  localStorage.setItem(key, "1"); window.history.replaceState({}, "", "/tickets");
  vi.mocked(api.getDevelopmentRequesters).mockRejectedValueOnce(new Error("offline"));
  const user = userEvent.setup(); render(<RequesterApp />);
  expect(await screen.findByText("Unable to load Development Requesters. Please try again.")).toBeInTheDocument();
  expect(localStorage.getItem(key)).toBe("1");
  await user.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
  expect(api.getDevelopmentRequesters).toHaveBeenCalledTimes(2);
});
it("UI-REQ-007: empty list disables selection and Continue", async () => {
  vi.mocked(api.getDevelopmentRequesters).mockResolvedValue([]); render(<RequesterApp />);
  expect(await screen.findByText("No active Development Requesters are available. Please contact the development team.")).toBeInTheDocument();
  expect(screen.getByRole("combobox")).toBeDisabled();
  expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();
});
it.each(["/tickets", "/tickets/new", "/tickets/23"])("guards %s without implementing ticket content", async (path) => {
  window.history.replaceState({}, "", path); render(<RequesterApp />);
  await waitFor(() => expect(window.location.pathname).toBe("/select-requester"));
  expect(await screen.findByRole("option", { name: /Jennifer/ })).toBeInTheDocument();
});
it("restores identity after remount and clears it immediately on Change Requester", async () => {
  localStorage.setItem(key, "1"); window.history.replaceState({}, "", "/tickets");
  const user = userEvent.setup(); const view = render(<RequesterApp />);
  expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
  view.unmount(); render(<RequesterApp />);
  expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Change Requester" }));
  expect(localStorage.getItem(key)).toBeNull();
  expect(window.location.pathname).toBe("/select-requester");
  expect(screen.queryByText("Jennifer Anderson")).not.toBeInTheDocument();
  await user.selectOptions(screen.getByRole("combobox"), "2");
  await user.click(screen.getByRole("button", { name: /Continue/ }));
  expect(screen.getByText("David Lee")).toBeInTheDocument();
  expect(localStorage.getItem(key)).toBe("2");
});
it.each(["999", "invalid", "0", ""])("clears stale stored context %s only after a successful list response", async (id) => {
  localStorage.setItem(key, id); window.history.replaceState({}, "", "/tickets"); render(<RequesterApp />);
  await waitFor(() => expect(localStorage.getItem(key)).toBeNull());
  expect(window.location.pathname).toBe("/select-requester");
});
it("redirects a missing identity immediately even while reference loading is pending", async () => {
  window.history.replaceState({}, "", "/tickets/23");
  vi.mocked(api.getDevelopmentRequesters).mockReturnValue(new Promise(() => {}));
  render(<RequesterApp />);
  await waitFor(() => expect(window.location.pathname).toBe("/select-requester"));
});
it("supports keyboard selection actions in dropdown, Cancel, Continue order", async () => {
  const user = userEvent.setup(); render(<RequesterApp />);
  await screen.findByRole("option", { name: /Jennifer/ });
  const dropdown = screen.getByRole("combobox");
  await user.selectOptions(dropdown, "1");
  dropdown.focus(); await user.tab();
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  await user.tab(); expect(screen.getByRole("button", { name: /Continue/ })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(window.location.pathname).toBe("/tickets");
});
it("mobile navigation has an accessible toggle and closes on destination selection", async () => {
  localStorage.setItem(key, "1"); window.history.replaceState({}, "", "/tickets");
  const user = userEvent.setup(); render(<RequesterApp />); await screen.findByText("Jennifer Anderson");
  const toggle = screen.getByRole("button", { name: "Toggle Navigation" });
  await user.click(toggle); expect(toggle).toHaveAttribute("aria-expanded", "true");
  await user.click(screen.getByRole("link", { name: "Create Ticket" }));
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(window.location.pathname).toBe("/tickets/new");
});
