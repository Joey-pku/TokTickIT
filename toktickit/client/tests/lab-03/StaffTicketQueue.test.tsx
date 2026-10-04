import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { StaffTicketQueue } from "../../src/StaffTicketQueue.js";
import * as staff from "../../src/staff-api.js";
import * as api from "../../src/api.js";

vi.mock("../../src/staff-api.js", async importOriginal => ({ ...await importOriginal<typeof staff>(), listStaffTickets: vi.fn(), getStaffUsers: vi.fn() }));
vi.mock("../../src/api.js", async importOriginal => ({ ...await importOriginal<typeof api>(), getCategories: vi.fn() }));
const ticket = { id: 1, ticketNumber: "TKT-2026-000001", summary: "Printer issue", requesterId: 2, requesterName: "Requester", categoryId: 1, categoryName: "Hardware", requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "IN_PROGRESS", ownerId: 3, ownerName: "Staff", requesterResolved: false, requesterResolvedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as const;
beforeEach(() => { vi.mocked(api.getCategories).mockResolvedValue([{ id: 1, name: "Hardware" }]); vi.mocked(staff.getStaffUsers).mockResolvedValue({ items: [{ id: 3, name: "Staff", role: "IT_STAFF" }] }); vi.mocked(staff.listStaffTickets).mockResolvedValue({ items: [ticket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } }); });

it("UI-QUEUE-01,02: renders queue fields and re-queries filters", async () => {
  const user = userEvent.setup(); render(<StaffTicketQueue/>);
  expect((await screen.findAllByRole("link", { name: ticket.ticketNumber }))[0]).toBeVisible();
  expect(screen.getAllByText("In Progress")[0]).toBeVisible(); expect(screen.getAllByText("High")[0]).toBeVisible();
  expect(screen.getByText("Showing 1 to 1 of 1 tickets")).toBeVisible();
  expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute("href", "/staff/tickets/1");
  await user.selectOptions(screen.getByLabelText("Owner"), "me");
  expect(await vi.waitFor(() => vi.mocked(staff.listStaffTickets).mock.calls.at(-1)?.[0].ownerId)).toBe("me");
});

it("UI-QUEUE-03: renders request failures", async () => {
  vi.mocked(staff.listStaffTickets).mockRejectedValueOnce(new Error("offline")); render(<StaffTicketQueue/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load the staff ticket queue");
});
