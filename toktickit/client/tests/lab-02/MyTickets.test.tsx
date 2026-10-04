import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../src/AuthContext.js";
import { AuthApp } from "../../src/AuthApp.js";
import * as api from "../../src/ticket-api.js";
import { listed, mocks, page } from "./ticket-test-support.js";
beforeEach(() => { cleanup(); mocks("/tickets"); });
afterEach(() => { vi.useRealTimers(); });
it("UI-LST-001: pending fetch shows loading state", async () => {
  vi.mocked(api.listTickets).mockReturnValue(new Promise(() => {})); render(<AuthProvider><AuthApp /></AuthProvider>);
  expect(await screen.findByText("Loading tickets...")).toBeInTheDocument();
});
it("UI-LST-002,010,013–015: renders columns, labels, count and create link", async () => {
  render(<AuthProvider><AuthApp /></AuthProvider>); await screen.findAllByText(listed.ticketNumber);
  expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
  expect(screen.getByText("Showing 1 to 1 of 1 tickets")).toBeInTheDocument();
  for (const name of [/Search/, /Category/, /Requested Priority/, /Current Status/]) expect(screen.getByLabelText(name)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "+ Create Ticket" })).toBeInTheDocument();
  expect(vi.mocked(api.listTickets).mock.calls[0][0]).not.toHaveProperty("categoryId");
});
it("UI-LST-003: zero tickets shows the first-ticket prompt", async () => {
  vi.mocked(api.listTickets).mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
  render(<AuthProvider><AuthApp /></AuthProvider>); expect(await screen.findByText("No Tickets Found")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "+ Create Your First Ticket" })).toBeInTheDocument();
});
it("offers sort controls for the mobile card layout", async () => {
  const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>); await screen.findAllByText(listed.ticketNumber);
  await user.selectOptions(screen.getByLabelText("Sort tickets by"), "updatedAt");
  expect(vi.mocked(api.listTickets).mock.lastCall![0]).toMatchObject({ sortBy: "updatedAt", page: 1 });
  await user.selectOptions(screen.getByLabelText("Sort direction"), "asc");
  expect(vi.mocked(api.listTickets).mock.lastCall![0]).toMatchObject({ sortOrder: "asc" });
});
it("UI-LST-004,006–009: debounce, Enter, no-results and Clear Filters", async () => {
  render(<AuthProvider><AuthApp /></AuthProvider>); await screen.findAllByText(listed.ticketNumber); vi.useFakeTimers();
  const search = screen.getByLabelText("Search tickets");
  const count = vi.mocked(api.listTickets).mock.calls.length;
  fireEvent.change(search, { target: { value: "vpn" } });
  await act(async () => { vi.advanceTimersByTime(299); }); expect(api.listTickets).toHaveBeenCalledTimes(count);
  await act(async () => { vi.advanceTimersByTime(1); });
  expect(vi.mocked(api.listTickets).mock.lastCall![0]).toMatchObject({ search: "vpn", page: 1 });
  fireEvent.change(search, { target: { value: "absent" } });
  vi.mocked(api.listTickets).mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
  await act(async () => { fireEvent.keyDown(search, { key: "Enter" }); });
  expect(vi.mocked(api.listTickets).mock.lastCall![0]).toMatchObject({ search: "absent" });
  expect(screen.getByText("No tickets match your search or filter criteria. Try adjusting your filters or search term.")).toBeInTheDocument();
  const afterEnter = vi.mocked(api.listTickets).mock.calls.length;
  await act(async () => { vi.advanceTimersByTime(300); }); expect(api.listTickets).toHaveBeenCalledTimes(afterEnter);
  await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "Clear Filters" })[0]); });
  expect(search).toHaveValue(""); expect(vi.mocked(api.listTickets).mock.lastCall![0]).not.toHaveProperty("search");
});
it("UI-LST-005: API failure hides data and offers retry", async () => {
  vi.mocked(api.listTickets).mockRejectedValueOnce(new Error("offline")); const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>);
  expect(await screen.findByText("Unable to load tickets from the server. Please check your network connection.")).toBeInTheDocument();
  expect(screen.queryByText(listed.ticketNumber)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try Again" })); await screen.findAllByText(listed.ticketNumber);
});
it("UI-LST-008,011: page navigation, filters, page sizes and sorting", async () => {
  vi.mocked(api.listTickets).mockResolvedValue({ ...page, pagination: { page: 1, pageSize: 10, totalItems: 26, totalPages: 3 } });
  const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>); await screen.findAllByText(listed.ticketNumber);
  await user.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(vi.mocked(api.listTickets).mock.lastCall![0].page).toBe(2));
  await user.selectOptions(screen.getByLabelText("Category"), "2");
  await waitFor(() => expect(vi.mocked(api.listTickets).mock.lastCall![0]).toMatchObject({ categoryId: 2, page: 1 }));
  await user.selectOptions(screen.getByLabelText("Tickets per page"), "25");
  await waitFor(() => expect(vi.mocked(api.listTickets).mock.lastCall![0].pageSize).toBe(25));
  await user.click(screen.getByRole("button", { name: /Sort by Ticket No/ }));
  await waitFor(() => expect(vi.mocked(api.listTickets).mock.lastCall![0]).toMatchObject({ sortBy: "ticketNumber", sortOrder: "asc" }));
});
it("ignores an old query response after a newer response", async () => {
  let old!: (value: typeof page) => void;
  vi.mocked(api.listTickets).mockReturnValueOnce(new Promise(resolve => { old = resolve; }));
  render(<AuthProvider><AuthApp /></AuthProvider>); await screen.findByText("Loading tickets...");
  vi.mocked(api.listTickets).mockResolvedValue({ ...page, items: [{ ...listed, summary: "Newest result" }] });
  fireEvent.change(screen.getByLabelText("Search tickets"), { target: { value: "new" } });
  fireEvent.keyDown(screen.getByLabelText("Search tickets"), { key: "Enter" });
  await screen.findAllByText("Newest result");
  await act(async () => { old(page); });
  expect(screen.queryByText(listed.summary)).not.toBeInTheDocument();
});
it("logout hides tickets and returns to login", async () => {
  const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>); await screen.findAllByText(listed.ticketNumber);
  await user.click(screen.getByRole("button", { name: "Open profile menu" }));
  await user.click(screen.getByRole("menuitem", { name: "Logout" }));
  expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
  expect(screen.queryByText(listed.ticketNumber)).not.toBeInTheDocument();
});
