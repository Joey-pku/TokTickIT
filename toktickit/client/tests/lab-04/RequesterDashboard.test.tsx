import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequesterDashboard } from "../../src/RequesterDashboard.js";
import * as dashboardApi from "../../src/dashboard-api.js";
import { AuthProvider } from "../../src/AuthContext.js";
import { AuthApp } from "../../src/AuthApp.js";
import { mocks } from "../lab-02/ticket-test-support.js";

vi.mock("../../src/dashboard-api.js", async importOriginal => ({ ...await importOriginal<typeof dashboardApi>(), getRequesterDashboard: vi.fn() }));

const data: dashboardApi.RequesterDashboardData = {
  metrics: { active: 3, waitingForRequester: 1 },
  recentlyUpdated: [{ id: 17, ticketNumber: "TKT-2026-000017", summary: "No network connection", currentStatus: "IN_PROGRESS", requestedPriority: "HIGH", updatedAt: "2026-10-29T05:10:00.000Z", href: "/tickets/17" }],
  recentlyResolved: [{ id: 12, ticketNumber: "TKT-2026-000012", summary: "Printer unavailable", currentStatus: "CLOSED", resolvedAt: "2026-10-28T08:00:00.000Z", href: "/tickets/12" }],
  drillDown: { active: "/tickets?view=active", waitingForRequester: "/tickets?status=WAITING_FOR_REQUESTER", recentlyUpdated: "/tickets?sortBy=updatedAt&sortOrder=desc", recentlyResolved: "/tickets?view=resolved" },
};

describe("Feature 19 requester dashboard UI", () => {
  beforeEach(() => { window.history.replaceState({}, "", "/dashboard"); vi.mocked(dashboardApi.getRequesterDashboard).mockReset().mockResolvedValue(data); });
  afterEach(cleanup);

  it("UI-01: renders exact metrics, recent Tickets, accessible labels, and contracted links", async () => {
    render(<RequesterDashboard />);
    expect(await screen.findByRole("link", { name: "3 active Tickets" })).toHaveAttribute("href", "/tickets?view=active");
    expect(screen.getByRole("link", { name: "1 Tickets waiting for you" })).toHaveAttribute("href", "/tickets?status=WAITING_FOR_REQUESTER");
    expect(screen.getByRole("link", { name: "TKT-2026-000017" })).toHaveAttribute("href", "/tickets/17");
    expect(screen.getByText("In Progress")).toBeVisible(); expect(screen.getByText("High")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "View all" }).map(link => link.getAttribute("href"))).toEqual(["/tickets?sortBy=updatedAt&sortOrder=desc", "/tickets?view=resolved"]);
    expect(document.querySelector(".dashboard-metrics")).toBeInTheDocument();
  });

  it("UI-01: distinguishes loading from a zero/empty dashboard", async () => {
    let resolve!: (value: dashboardApi.RequesterDashboardData) => void;
    vi.mocked(dashboardApi.getRequesterDashboard).mockReturnValue(new Promise(done => { resolve = done; }));
    render(<RequesterDashboard />); expect(screen.getByText("Loading dashboard...")).toBeVisible(); expect(screen.queryByText("Active Tickets")).not.toBeInTheDocument();
    resolve({ ...data, metrics: { active: 0, waitingForRequester: 0 }, recentlyUpdated: [], recentlyResolved: [] });
    expect(await screen.findByRole("link", { name: "0 active Tickets" })).toBeVisible();
    expect(screen.getByText("No recently updated Tickets.")).toBeVisible(); expect(screen.getByText("No recently resolved Tickets.")).toBeVisible();
  });

  it("UI-01: shows a safe error and retries without overlapping requests", async () => {
    vi.mocked(dashboardApi.getRequesterDashboard).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(data);
    const user = userEvent.setup(); render(<RequesterDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load your dashboard");
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    expect(await screen.findByRole("link", { name: "3 active Tickets" })).toBeVisible();
    expect(dashboardApi.getRequesterDashboard).toHaveBeenCalledTimes(2);
  });

  it("UI-01: uses Dashboard as the requester default and marks its navigation link active", async () => {
    mocks("/"); vi.mocked(dashboardApi.getRequesterDashboard).mockResolvedValue(data);
    render(<AuthProvider><AuthApp /></AuthProvider>);
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeVisible();
    expect(window.location.pathname).toBe("/dashboard");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });
});
