import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { StaffTicketDetail } from "../../src/StaffTicketDetail.js";
import * as staff from "../../src/staff-api.js";

vi.mock("../../src/staff-api.js", async importOriginal => ({ ...await importOriginal<typeof staff>(), getStaffTicket: vi.fn(), getStaffUsers: vi.fn() }));
vi.mock("../../src/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 3, name: "Staff", email: "staff@example.com", role: "IT_STAFF", mustChangePassword: false } }) }));
const detail: any = { id: 1, ticketNumber: "TKT-2026-000001", summary: "Printer issue", description: "Printer cannot produce documents.", requesterId: 2, requesterName: "Requester", requesterEmail: "requester@example.com", ownerId: null, ownerName: null, categoryId: 1, categoryName: "Hardware", relatedSystemId: 1, relatedSystemName: "Printer", requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "IN_PROGRESS", requesterResolved: true, requesterResolvedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), attachments: [], comments: [{ id: 1, ticketId: 1, authorId: 2, authorName: "Requester", authorRole: "REQUESTER", content: "<b>plain text</b>", createdAt: new Date().toISOString() }], internalNotes: [{ id: 2, ticketId: 1, authorId: 3, authorName: "Staff", authorRole: "IT_STAFF", content: "Confidential", createdAt: new Date().toISOString() }] };
beforeEach(() => { vi.mocked(staff.getStaffTicket).mockResolvedValue(detail); vi.mocked(staff.getStaffUsers).mockResolvedValue({ items: [{ id: 3, name: "Staff", role: "IT_STAFF" }] }); });

it("UI-STAFF-01,02 and UI-NOTE-01: renders workflow controls, resolution banner, and segregated notes", async () => {
  render(<StaffTicketDetail id={1}/>);
  expect(await screen.findByLabelText("Assigned Owner")).toBeVisible(); expect(screen.getByLabelText("IT Priority")).toHaveValue("HIGH"); expect(screen.getByLabelText("Current Status")).toHaveValue("IN_PROGRESS");
  expect(screen.getByText(/Requester Requester indicated.*that the problem appears resolved/)).toBeVisible();
  expect(screen.getByRole("option", { name: "Claim Ticket (Assign to Me)" })).toBeVisible();
  expect(screen.getByText("Confidential").closest("section")).toHaveClass("internal-notes");
  expect(screen.getByText("<b>plain text</b>")).toBeVisible(); expect(document.querySelector("b")).toBeNull();
});
