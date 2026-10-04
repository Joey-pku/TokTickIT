import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../src/AuthContext.js";
import { AuthApp } from "../../src/AuthApp.js";
import * as api from "../../src/ticket-api.js";
import { detail, mocks } from "./ticket-test-support.js";
beforeEach(() => { cleanup(); mocks("/tickets/42"); });
it("UI-DTL-001,008: displays backend fields read-only and back navigation", async () => {
  const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>);
  expect(await screen.findByText(detail.ticketNumber)).toBeInTheDocument();
  expect(screen.getByText(detail.description)).toBeInTheDocument();
  expect(screen.getByText("Hardware")).toBeInTheDocument();
  expect(screen.getByText("VPN")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Add Public Comment" })).toBeInTheDocument();
  expect(screen.queryByText(/Internal Notes/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload attachments" })).toBeDisabled();
  await user.click(screen.getByRole("link", { name: /Back to My Tickets/ }));
  expect(window.location.pathname).toBe("/tickets");
});
it("UI-DTL-002: 404 shows the specified not-found state", async () => {
  vi.mocked(api.getTicket).mockRejectedValue(new api.TicketApiError(404, { code: "TICKET_NOT_FOUND", message: "Ticket not found." }));
  render(<AuthProvider><AuthApp /></AuthProvider>);
  expect(await screen.findByRole("heading", { name: "Ticket Not Found" })).toBeInTheDocument();
  expect(screen.getByText("The requested ticket does not exist or you do not have permission to view it.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Return to My Tickets" })).toBeInTheDocument();
});
it("shows a detail skeleton while the request is pending", async () => {
  vi.mocked(api.getTicket).mockReturnValue(new Promise(() => {})); render(<AuthProvider><AuthApp /></AuthProvider>);
  expect(await screen.findByText("Loading ticket details...")).toBeInTheDocument();
  expect(screen.queryByText(detail.ticketNumber)).not.toBeInTheDocument();
});
it("supports server failure/retry states", async () => {
  vi.mocked(api.getTicket).mockRejectedValueOnce(new Error("offline")); const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>);
  await user.click(await screen.findByRole("button", { name: "Retry" }));
  expect(await screen.findByText(detail.ticketNumber)).toBeInTheDocument();
});
it("renders removed metadata without operational attachment UI", async () => {
  vi.mocked(api.getTicket).mockResolvedValue({ ...detail, attachments: [{
    id: 7, originalFileName: "proof.pdf", mimeType: "application/pdf", fileSizeBytes: 1024, isRemoved: true,
    removedAt: detail.updatedAt, removalReason: "Wrong document", createdAt: detail.createdAt,
  }] });
  render(<AuthProvider><AuthApp /></AuthProvider>); await screen.findByText("Removed Attachments (1)");
  await userEvent.setup().click(screen.getByText("Removed Attachments (1)"));
  expect(screen.getByText("proof.pdf")).toBeInTheDocument();
  expect(screen.getByText(/Wrong document/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Download/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Remove proof.pdf" })).not.toBeInTheDocument();
});
