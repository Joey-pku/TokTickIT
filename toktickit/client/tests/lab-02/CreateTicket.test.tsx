import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequesterApp } from "../../src/RequesterApp.js";
import * as api from "../../src/ticket-api.js";
import * as reference from "../../src/api.js";
import { created, mocks } from "./ticket-test-support.js";
beforeEach(() => { cleanup(); mocks("/tickets/new"); });
async function fill(summary = "VPN connection failed", description = "The VPN cannot connect after the password reset.") {
  const user = userEvent.setup();
  await screen.findByRole("option", { name: "Hardware" });
  await user.selectOptions(screen.getByLabelText(/^Category/), "2");
  await user.selectOptions(screen.getByLabelText(/^Related System/), "1");
  await user.type(screen.getByLabelText(/^Ticket Summary/), summary);
  await user.type(screen.getByLabelText(/^Description/), description);
  return user;
}
it("UI-TCK-001–004: shows placeholders, requester and required fields with MEDIUM default", async () => {
  render(<RequesterApp />);
  expect(await screen.findByText("Generated after submission")).toBeInTheDocument();
  expect(screen.getByText("Assigned after submission")).toBeInTheDocument();
  expect(screen.getAllByText("Jennifer Anderson").length).toBeGreaterThanOrEqual(1);
  expect(screen.getByLabelText(/^Requested Priority/)).toHaveValue("MEDIUM");
  for (const label of [/^Category/, /^Related System/, /^Requested Priority/, /^Ticket Summary/, /^Description/]) expect(screen.getByLabelText(label)).toHaveAttribute("aria-required", "true");
  expect(screen.queryByText(created.ticketNumber)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/upload/i)).not.toBeInTheDocument();
});
it.each([["abcd", "valid description", /Summary must/], ["x".repeat(101), "valid description", /Summary must/], ["valid summary", "short", /Description must/]])("UI-TCK-005–007: validates %s before dispatch", async (summary, description, error) => {
  render(<RequesterApp />); const user = await fill(summary, description);
  await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
  expect(screen.getByText(error)).toBeInTheDocument(); expect(api.createTicket).not.toHaveBeenCalled();
});
it("UI-TCK-008–009: missing references show associated field errors", async () => {
  const user = userEvent.setup(); render(<RequesterApp />); await screen.findByRole("option", { name: "Hardware" });
  await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
  for (const label of [/^Category/, /^Related System/]) {
    const input = screen.getByLabelText(label); expect(input).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)).toBeInTheDocument();
  }
  expect(api.createTicket).not.toHaveBeenCalled();
});
it("UI-TCK-010,012–014: submits once, trims, sends explicit priority and uses only backend-generated values", async () => {
  let complete!: (value: typeof created) => void;
  vi.mocked(api.createTicket).mockReturnValue(new Promise(resolve => { complete = resolve; }));
  render(<RequesterApp />); const user = await fill("  VPN connection failed  ", "  The VPN cannot connect after the password reset.  ");
  await user.dblClick(screen.getByRole("button", { name: "Submit Ticket" }));
  expect(screen.getByRole("button", { name: /Submitting/ })).toBeDisabled();
  expect(api.createTicket).toHaveBeenCalledTimes(1);
  expect(vi.mocked(api.createTicket).mock.calls[0][0]).toEqual({ categoryId: 2, relatedSystemId: 1, requestedPriority: "MEDIUM", summary: created.summary, description: created.description });
  complete(created);
  expect(await screen.findByText(/created successfully/)).toHaveTextContent(created.ticketNumber);
  expect(screen.queryByText("Assigned after submission")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View Ticket Details" })).toHaveAttribute("href", "/tickets/42");
  expect(screen.getByRole("link", { name: "Go to My Tickets" })).toHaveAttribute("href", "/tickets");
});
it("UI-TCK-011: preserves form values on server failure", async () => {
  vi.mocked(api.createTicket).mockRejectedValue(new Error("offline")); render(<RequesterApp />); const user = await fill();
  await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
  expect(await screen.findByText("Server error: Unable to submit ticket. Please check your network and try again.")).toBeInTheDocument();
  expect(screen.getByLabelText(/^Ticket Summary/)).toHaveValue(created.summary);
  expect(screen.getByLabelText(/^Description/)).toHaveValue(created.description);
  expect(screen.getByLabelText(/^Category/)).toHaveValue("2");
  expect(screen.getByRole("button", { name: "Submit Ticket" })).toBeEnabled();
});
it("renders backend field errors without discarding input", async () => {
  vi.mocked(api.createTicket).mockRejectedValue(new api.TicketApiError(400, { code: "VALIDATION_ERROR", message: "Invalid data", fields: { relatedSystemId: "Related System is unavailable." } }));
  render(<RequesterApp />); const user = await fill(); await user.click(screen.getByRole("button", { name: "Submit Ticket" }));
  expect(await screen.findByText("Related System is unavailable.")).toBeInTheDocument();
  expect(screen.getByLabelText(/^Ticket Summary/)).toHaveValue(created.summary);
});
it("reference failure offers Retry and Cancel returns to My Tickets", async () => {
  vi.mocked(reference.getCategories).mockRejectedValueOnce(new Error("offline")); const user = userEvent.setup(); render(<RequesterApp />);
  await user.click(await screen.findByRole("button", { name: "Retry" }));
  await screen.findByRole("option", { name: "Hardware" });
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(window.location.pathname).toBe("/tickets"));
});

