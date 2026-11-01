import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiCallError } from "../../src/api.js";
import { StaffTicketDetail } from "../../src/StaffTicketDetail.js";
import * as staff from "../../src/staff-api.js";

vi.mock("../../src/staff-api.js", async importOriginal => ({
  ...await importOriginal<typeof staff>(), getStaffTicket: vi.fn(), getStaffUsers: vi.fn(), updateTicketStatus: vi.fn(),
}));
vi.mock("../../src/AuthContext.js", () => ({ useAuth: () => ({ user: { id: 3, name: "Staff", role: "IT_STAFF" } }) }));
vi.mock("../../src/ActionsSection.js", () => ({ ActionsSection: ({ ticketId }: { ticketId: number }) => <section id={`actions-${ticketId}`} tabIndex={-1}>Actions Taken</section> }));

const detail: any = {
  id: 17, ticketNumber: "TKT-2026-000017", summary: "Workflow ticket", description: "Verify workflow controls.",
  requesterId: 2, requesterName: "Requester", requesterEmail: "requester@example.com", ownerId: 3, ownerName: "Staff",
  categoryId: 1, categoryName: "Hardware", relatedSystemId: 1, relatedSystemName: "Printer", requestedPriority: "MEDIUM", itPriority: "HIGH",
  currentStatus: "OPEN", requesterResolved: false, requesterResolvedAt: null, workflowVersion: 4, resolvedAt: null,
  createdAt: "2026-10-30T01:00:00.000Z", updatedAt: "2026-10-30T01:00:00.000Z", attachments: [], comments: [], internalNotes: [],
};

beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  vi.mocked(staff.getStaffTicket).mockResolvedValue(detail);
  vi.mocked(staff.getStaffUsers).mockResolvedValue({ items: [{ id: 3, name: "Staff", role: "IT_STAFF" }] });
});

describe("Feature 18 staff workflow UI", () => {
  it("shows only approved transitions, resolution guidance, current version, and submits once with workflowVersion", async () => {
    const user = userEvent.setup(); let finish!: (value: any) => void;
    vi.mocked(staff.updateTicketStatus).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<StaffTicketDetail id={17}/>);
    const select = await screen.findByLabelText("Change status");
    expect(screen.getByText("Workflow version 4")).toBeVisible();
    expect([...select.querySelectorAll("option")].map(option => option.value)).toEqual(["", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]);
    await user.selectOptions(select, "RESOLVED");
    expect(screen.getByText(/Requires at least one completed Action/)).toBeVisible();
    const button = screen.getByRole("button", { name: "Update Status" }); await user.click(button);
    expect(screen.getByRole("button", { name: "Updating..." })).toBeDisabled();
    expect(staff.updateTicketStatus).toHaveBeenCalledTimes(1); expect(staff.updateTicketStatus).toHaveBeenCalledWith(17, "RESOLVED", 4);
    finish({}); await waitFor(() => expect(staff.getStaffTicket).toHaveBeenCalledTimes(2));
  });

  it("focuses Actions for ACTION_REQUIRED and preserves the selected transition", async () => {
    const user = userEvent.setup();
    vi.mocked(staff.updateTicketStatus).mockRejectedValue(new ApiCallError(409, { code: "ACTION_REQUIRED", message: "Action required." }));
    render(<StaffTicketDetail id={17}/>); const select = await screen.findByLabelText("Change status");
    await user.selectOptions(select, "RESOLVED"); await user.click(screen.getByRole("button", { name: "Update Status" }));
    expect(await screen.findByText(/completed Action with a nonblank Result/)).toBeVisible();
    await waitFor(() => expect(document.getElementById("actions-17")).toHaveFocus());
    expect(select).toHaveValue("RESOLVED");
  });

  it("preserves stale selections, focuses Review latest, and refreshes deliberately", async () => {
    const user = userEvent.setup();
    vi.mocked(staff.updateTicketStatus).mockRejectedValue(new ApiCallError(409, { code: "STALE_TICKET", message: "Stale.", currentVersion: 5 } as any));
    render(<StaffTicketDetail id={17}/>); const select = await screen.findByLabelText("Change status");
    await user.selectOptions(select, "IN_PROGRESS"); await user.click(screen.getByRole("button", { name: "Update Status" }));
    const review = await screen.findByRole("button", { name: "Review latest" }); expect(review).toHaveFocus(); expect(select).toHaveValue("IN_PROGRESS");
    await user.click(review); await waitFor(() => expect(staff.getStaffTicket).toHaveBeenCalledTimes(2));
    expect(select).toHaveValue("IN_PROGRESS"); expect(screen.getByText(/Latest workflow state loaded/)).toBeVisible();
  });
});
