import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiCallError } from "../../src/api.js";
import { ActionsSection } from "../../src/ActionsSection.js";
import * as actions from "../../src/action-api.js";

vi.mock("../../src/action-api.js", async importOriginal => ({
  ...await importOriginal<typeof actions>(),
  listTicketActions: vi.fn(), listActionAssignees: vi.fn(), createTicketAction: vi.fn(), updateTicketAction: vi.fn(),
}));

const planned: actions.TicketAction = {
  id: 41, ticketId: 17, performedById: 8, performedByName: "Narin Support", assignedToId: 9, assignedToName: "Mali Admin",
  description: "Replace damaged network cable", result: "", followUpRequired: true, followUpNote: "Confirm stability tomorrow",
  attachmentNotes: "See cable-before.jpg", status: "PLANNED", version: 1,
  createdAt: "2026-10-29T04:30:00.000Z", updatedAt: "2026-10-29T04:30:00.000Z",
};
const assignees = [{ id: 8, name: "Narin Support", role: "IT_STAFF" as const }, { id: 9, name: "Mali Admin", role: "ADMINISTRATOR" as const }];

beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "8ce47993-287f-4a23-aa3a-3dd60e031bf1") });
  vi.mocked(actions.listTicketActions).mockResolvedValue({ items: [planned] });
  vi.mocked(actions.listActionAssignees).mockResolvedValue({ items: assignees });
});

describe("Feature 17 Actions Taken UI", () => {
  it("UI-06/07/08: renders complete requester history read-only with semantic responsive structure", async () => {
    render(<ActionsSection ticketId={17} editable={false}/>);
    expect(await screen.findByRole("heading", { name: "Replace damaged network cable" })).toBeVisible();
    expect(screen.getByText("Narin Support")).toBeVisible(); expect(screen.getByText("Mali Admin")).toBeVisible();
    expect(screen.getByText("Confirm stability tomorrow")).toBeVisible(); expect(screen.getByText("See cable-before.jpg")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add Action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit|Reassign/ })).not.toBeInTheDocument();
    expect(document.querySelector("#action-41")).toHaveClass("action-card");
    expect(document.querySelector(".action-details")).toBeInTheDocument();
  });

  it("UI-06: provides requester-local loading, empty, and retryable error states", async () => {
    vi.mocked(actions.listTicketActions).mockReturnValueOnce(new Promise(() => {}));
    const view = render(<ActionsSection ticketId={17} editable={false}/>);
    expect(screen.getByText("Loading Actions Taken...")).toBeVisible();
    view.unmount();
    vi.mocked(actions.listTicketActions).mockResolvedValueOnce({ items: [] });
    render(<ActionsSection ticketId={17} editable={false}/>);
    expect(await screen.findByText("No Actions Taken have been recorded.")).toBeVisible();
    cleanup();
    vi.mocked(actions.listTicketActions).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ items: [planned] });
    render(<ActionsSection ticketId={17} editable={false}/>);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Retry Actions" }));
    expect(await screen.findByText("Replace damaged network cable")).toBeVisible();
  });

  it("UI-03/07: validates create fields, disables duplicate submit, and reuses the key after network failure", async () => {
    const user = userEvent.setup(); render(<ActionsSection ticketId={17} editable/>);
    await user.click(await screen.findByRole("button", { name: "Add Action" }));
    await user.click(screen.getByRole("button", { name: "Record Action" }));
    expect(screen.getByText("Description must be between 1 and 2000 characters.")).toBeVisible();
    expect(screen.getByText("Select an eligible assignee.")).toBeVisible();
    await user.selectOptions(screen.getByLabelText(/Assigned to/), "9");
    await user.type(screen.getByLabelText(/Action Description/), "Inspect the affected service");
    await user.click(screen.getByLabelText(/Follow-Up Required/));
    await user.click(screen.getByRole("button", { name: "Record Action" }));
    expect(screen.getByText("Follow-up Note must be between 1 and 2000 characters.")).toBeVisible();
    expect(screen.getByLabelText(/Follow-up Note/)).toHaveAccessibleDescription("Follow-up Note must be between 1 and 2000 characters.");
    await user.type(screen.getByLabelText(/Follow-up Note/), "Check again tomorrow");
    vi.mocked(actions.createTicketAction).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ ...planned, id: 42 });
    await user.click(screen.getByRole("button", { name: "Record Action" }));
    expect(await screen.findByText(/entries are preserved/)).toBeVisible();
    expect(screen.getByLabelText(/Action Description/)).toHaveValue("Inspect the affected service");
    await user.click(screen.getByRole("button", { name: "Record Action" }));
    await waitFor(() => expect(actions.createTicketAction).toHaveBeenCalledTimes(2));
    expect(vi.mocked(actions.createTicketAction).mock.calls[0][1].idempotencyKey).toBe(vi.mocked(actions.createTicketAction).mock.calls[1][1].idempotencyKey);
  });

  it("UI-04: requires a completion result, confirms cancellation, and makes terminal Actions read-only", async () => {
    const user = userEvent.setup(); render(<ActionsSection ticketId={17} editable/>);
    await user.click(await screen.findByRole("button", { name: "View / Edit" }));
    await user.selectOptions(screen.getByLabelText("Status"), "COMPLETED");
    await user.click(screen.getByRole("button", { name: "Save Action" }));
    expect(screen.getByText("Result is required when completing an Action.")).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Status"), "CANCELLED");
    await user.click(screen.getByRole("button", { name: "Save Action" }));
    expect(screen.getByRole("dialog", { name: "Cancel this Action?" })).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Cancel this Action?" })).toHaveAccessibleDescription("The Action will remain in history and become read-only.");
    expect(screen.getByRole("button", { name: "Cancel Action" })).toHaveFocus();
    await user.keyboard("{Escape}"); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    cleanup();
    vi.mocked(actions.listTicketActions).mockResolvedValue({ items: [{ ...planned, status: "COMPLETED", result: "Restored", version: 2 }] });
    render(<ActionsSection ticketId={17} editable/>);
    await user.click(await screen.findByRole("button", { name: "View" }));
    expect(screen.getByLabelText(/Action Description/)).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: "Save Action" })).not.toBeInTheDocument();
  });

  it("UI-05: preserves stale and ineligible-assignee drafts and supports reassignment-only recovery", async () => {
    const user = userEvent.setup(); render(<ActionsSection ticketId={17} editable/>);
    await user.click(await screen.findByRole("button", { name: "View / Edit" }));
    const description = screen.getByLabelText(/Action Description/); await user.clear(description); await user.type(description, "My unsaved draft");
    vi.mocked(actions.updateTicketAction).mockRejectedValueOnce(new ApiCallError(409, { code: "STALE_ACTION", message: "Stale." }));
    await user.click(screen.getByRole("button", { name: "Save Action" }));
    expect(await screen.findByText(/changed since you opened it/)).toBeVisible();
    expect(description).toHaveValue("My unsaved draft"); expect(screen.getByRole("button", { name: "Review latest" })).toBeVisible();
    vi.mocked(actions.updateTicketAction).mockRejectedValueOnce(new ApiCallError(409, { code: "INELIGIBLE_ASSIGNEE", message: "Ineligible." }));
    await user.click(screen.getByRole("button", { name: "Save Action" }));
    expect(await screen.findByText(/no longer eligible/)).toBeVisible(); expect(description).toHaveValue("My unsaved draft");
    cleanup();
    vi.mocked(actions.listTicketActions).mockResolvedValue({ items: [{ ...planned, assignedToId: null, assignedToName: null, version: 2 }] });
    render(<ActionsSection ticketId={17} editable/>); await user.click(await screen.findByRole("button", { name: "Reassign" }));
    expect(screen.queryByLabelText(/Action Description/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/Assigned to/), "8");
    vi.mocked(actions.updateTicketAction).mockResolvedValue({ ...planned, assignedToId: 8, assignedToName: "Narin Support", version: 3 });
    await user.click(screen.getByRole("button", { name: "Reassign" }));
    await waitFor(() => expect(actions.updateTicketAction).toHaveBeenLastCalledWith(17, 41, { version: 2, assignedToId: 8 }));
  });
});
