import { beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../src/AuthContext.js";
import { AuthApp } from "../../src/AuthApp.js";
import * as api from "../../src/attachment-api.js";
import * as tickets from "../../src/ticket-api.js";
import { created, mocks } from "./ticket-test-support.js";
beforeEach(() => { cleanup(); mocks("/tickets/new"); });
it("UI-TCK-015–016: creates JSON ticket first, uploads sequentially and preserves partial success", async () => {
  let finish!: (value: never) => void;
  vi.spyOn(api, "uploadAttachment").mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockRejectedValueOnce(new Error("offline"));
  const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>); await screen.findByRole("option", { name: "Hardware" });
  await user.selectOptions(screen.getByLabelText(/^Category/), "2"); await user.selectOptions(screen.getByLabelText(/^Related System/), "1"); await user.type(screen.getByLabelText(/^Ticket Summary/), created.summary); await user.type(screen.getByLabelText(/^Description/), created.description);
  await user.upload(screen.getByLabelText("Supporting attachments"), [new File(["%PDF-1.4"], "first.pdf", { type: "application/pdf" }), new File(["%PDF-1.4"], "second.pdf", { type: "application/pdf" })]);
  expect(api.uploadAttachment).not.toHaveBeenCalled(); await user.click(screen.getByRole("button", { name: "Submit Ticket" })); expect(tickets.createTicket).toHaveBeenCalledTimes(1); expect(vi.mocked(tickets.createTicket).mock.calls[0][0]).not.toHaveProperty("attachments"); expect(api.uploadAttachment).toHaveBeenCalledTimes(1); expect(vi.mocked(api.uploadAttachment).mock.calls[0][0]).toBe(created.id);
  await act(async () => finish({ id: 7 } as never)); expect(api.uploadAttachment).toHaveBeenCalledTimes(2); expect(await screen.findByText(/second.pdf.*failed/i)).toBeInTheDocument(); expect(screen.getByText(/first.pdf.*uploaded/i)).toBeInTheDocument(); expect(screen.getByText(/created successfully/)).toHaveTextContent(created.ticketNumber); expect(screen.getByRole("link", { name: /Retry.*Ticket Detail/ })).toHaveAttribute("href", "/tickets/42"); expect(tickets.createTicket).toHaveBeenCalledTimes(1);
});
