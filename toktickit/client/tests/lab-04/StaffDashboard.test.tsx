import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaffDashboard } from "../../src/StaffDashboard.js";
import * as dashboardApi from "../../src/dashboard-api.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/AuthContext.js";
import { AuthApp } from "../../src/AuthApp.js";
import * as staffApi from "../../src/staff-api.js";

vi.mock("../../src/dashboard-api.js", async importOriginal => ({ ...await importOriginal<typeof dashboardApi>(), getStaffDashboard: vi.fn() }));

const data: dashboardApi.StaffDashboardData = {
  metrics: { unassignedActive: 4, ownedByMeActive: 6 },
  byStatus: { NEW: 2, OPEN: 3, IN_PROGRESS: 4, WAITING_FOR_REQUESTER: 1, RESOLVED: 2, CLOSED: 8, REOPENED: 0, CANCELLED: 1 },
  activeByPriority: { LOW: 2, MEDIUM: 5, HIGH: 3 },
  recentUrgent: [{ id: 17, ticketNumber: "TKT-2026-000017", summary: "No network connection", currentStatus: "IN_PROGRESS", itPriority: "HIGH", ownerId: null, updatedAt: "2026-10-29T05:10:00.000Z", href: "/staff/tickets/17" }],
  myCurrentActions: [{ id: 41, ticketId: 17, ticketNumber: "TKT-2026-000017", description: "Replace damaged cable", status: "IN_PROGRESS", updatedAt: "2026-10-29T05:00:00.000Z", href: "/staff/tickets/17#action-41" }],
  drillDown: { unassignedActive: "/staff/queue?view=active&ownerId=unassigned", ownedByMeActive: "/staff/queue?view=active&ownerId=me", recentUrgent: "/staff/queue?view=active&itPriority=HIGH" },
};

describe("Feature 20 staff dashboard UI", () => {
  beforeEach(() => { window.history.replaceState({}, "", "/staff/dashboard"); vi.restoreAllMocks(); vi.mocked(dashboardApi.getStaffDashboard).mockReset().mockResolvedValue(data); });
  afterEach(cleanup);

  it("UI-02: renders exact metrics, summaries, lists, and contracted links", async () => {
    render(<StaffDashboard />);
    expect(await screen.findByRole("link", { name: "4 active unassigned Tickets" })).toHaveAttribute("href", data.drillDown.unassignedActive);
    expect(screen.getByRole("link", { name: "6 active Tickets owned by me" })).toHaveAttribute("href", data.drillDown.ownedByMeActive);
    expect(screen.getByRole("link", { name: /New\s*2/ })).toHaveAttribute("href", "/staff/queue?status=NEW");
    expect(screen.getByRole("link", { name: /High\s*3/ })).toHaveAttribute("href", "/staff/queue?view=active&itPriority=HIGH");
    expect(screen.getAllByRole("link", { name: "TKT-2026-000017" })[0]).toHaveAttribute("href", "/staff/tickets/17");
    expect(screen.getByText("Replace damaged cable").closest("article")?.querySelector("a")).toHaveAttribute("href", "/staff/tickets/17#action-41");
  });

  it("UI-02: distinguishes loading from an all-zero dashboard and renders specific empty states", async () => {
    let resolve!: (value: dashboardApi.StaffDashboardData) => void;
    vi.mocked(dashboardApi.getStaffDashboard).mockReturnValue(new Promise(done => { resolve = done; }));
    render(<StaffDashboard />); expect(screen.getByText("Loading staff dashboard...")).toBeVisible();
    resolve({ ...data, metrics: { unassignedActive: 0, ownedByMeActive: 0 }, byStatus: Object.fromEntries(Object.keys(data.byStatus).map(key => [key, 0])) as typeof data.byStatus, activeByPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 }, recentUrgent: [], myCurrentActions: [] });
    expect(await screen.findByRole("link", { name: "0 active unassigned Tickets" })).toBeVisible();
    expect(screen.getByText("No active high-priority Tickets.")).toBeVisible(); expect(screen.getByText("No current Actions assigned to you.")).toBeVisible();
  });

  it("UI-02: retries safe failures and refreshes without duplicate clicks", async () => {
    vi.mocked(dashboardApi.getStaffDashboard).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(data);
    const user = userEvent.setup(); render(<StaffDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load the staff dashboard");
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    expect(await screen.findByRole("link", { name: "4 active unassigned Tickets" })).toBeVisible();
    vi.mocked(dashboardApi.getStaffDashboard).mockReturnValueOnce(new Promise(() => {}));
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(screen.getByRole("button", { name: "Refreshing..." })).toBeDisabled();
  });

  it.each(["IT_STAFF", "ADMINISTRATOR"] as const)("UI-02: uses the staff dashboard as the %s default with active navigation", async role => {
    window.history.replaceState({}, "", "/");
    vi.spyOn(api, "getMe").mockResolvedValue({ id: 3, name: "Operator", email: "operator@example.com", role, isActive: true, mustChangePassword: false });
    vi.spyOn(api, "logout").mockResolvedValue(undefined); vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(staffApi, "getStaffUsers").mockResolvedValue({ items: [] }); vi.spyOn(staffApi, "listStaffTickets").mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
    render(<AuthProvider><AuthApp /></AuthProvider>);
    expect(await screen.findByRole("heading", { name: "Staff Dashboard" })).toBeVisible(); expect(window.location.pathname).toBe("/staff/dashboard");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });
});
