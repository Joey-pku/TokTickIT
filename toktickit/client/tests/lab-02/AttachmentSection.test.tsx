import { beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../src/AuthContext.js";
import { AuthApp } from "../../src/AuthApp.js";
import * as attachmentApi from "../../src/attachment-api.js";
import * as ticketApi from "../../src/ticket-api.js";
import { detail, mocks } from "./ticket-test-support.js";
const active = { id: 7, originalFileName: "proof.pdf", mimeType: "application/pdf", fileSizeBytes: 1024, isRemoved: false, removedAt: null, removalReason: null, createdAt: detail.createdAt };
beforeEach(() => { cleanup(); mocks("/tickets/42"); vi.spyOn(ticketApi, "getTicket").mockResolvedValue({ ...detail, attachments: [active] }); vi.spyOn(attachmentApi, "uploadAttachment").mockResolvedValue({ ...active, id: 8 }); vi.spyOn(attachmentApi, "removeAttachment").mockResolvedValue({ ...active, isRemoved: true, removedAt: detail.updatedAt, removalReason: "Wrong document" }); vi.spyOn(attachmentApi, "downloadAttachment").mockResolvedValue(undefined); });
it("UI-ATT-001–003, UI-DTL-003–007: active and removed sections expose only appropriate actions", async () => {
  vi.mocked(ticketApi.getTicket).mockResolvedValue({ ...detail, attachments: [active, { ...active, id: 8, originalFileName: "old.pdf", isRemoved: true, removedAt: detail.updatedAt, removalReason: "Wrong document" }] });
  const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>); expect(await screen.findByText("Attachments (1/5)")).toBeInTheDocument();
  expect(screen.getByText("proof.pdf")).toBeInTheDocument(); expect(within(screen.getByText("proof.pdf").closest("li")!).getByText(/1.0 KB/)).toBeInTheDocument(); expect(screen.getByLabelText("Supporting attachments")).toBeInTheDocument();
  expect(screen.getByText(/JPG.*PNG.*WEBP.*PDF.*5 MB/)).toBeInTheDocument(); await user.click(screen.getByText("Removed Attachments (1)"));
  const removed = screen.getByText("old.pdf").closest("li")!; expect(within(removed).getByText(/Wrong document/)).toBeInTheDocument(); expect(within(removed).queryByRole("button")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Download proof.pdf" })); expect(attachmentApi.downloadAttachment).toHaveBeenCalledWith(active, expect.any(AbortSignal));
});
it.each([["bad.exe", "application/octet-stream", 2, /File type not permitted/], ["big.pdf", "application/pdf", 5242881, /File exceeds maximum size/]])("UI-ATT-009–010: rejects %s locally", async (name, type, size, error) => { render(<AuthProvider><AuthApp /></AuthProvider>); const input = await screen.findByLabelText("Supporting attachments"); fireEvent.change(input, { target: { files: [new File([new Uint8Array(size)], name as string, { type: type as string })] } }); expect(screen.getByText(error as RegExp)).toBeInTheDocument(); expect(attachmentApi.uploadAttachment).not.toHaveBeenCalled(); });
it("UI-ATT-008: fifth active file disables file selection", async () => { vi.mocked(ticketApi.getTicket).mockResolvedValue({ ...detail, attachments: Array.from({ length: 5 }, (_, i) => ({ ...active, id: i + 1 })) }); render(<AuthProvider><AuthApp /></AuthProvider>); expect(await screen.findByLabelText("Supporting attachments")).toBeDisabled(); expect(screen.getByText(/Maximum active attachments/)).toBeInTheDocument(); });
it("uploads selected files, preserves a failed file for explicit retry and refreshes detail", async () => {
  vi.mocked(attachmentApi.uploadAttachment).mockRejectedValueOnce(new Error("offline")); const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>);
  await user.upload(await screen.findByLabelText("Supporting attachments"), new File(["%PDF-1.4"], "new.pdf", { type: "application/pdf" })); await user.click(screen.getByRole("button", { name: "Upload attachments" }));
  expect(await screen.findByText(/new.pdf.*failed/i)).toBeInTheDocument(); await user.click(screen.getByRole("button", { name: "Retry new.pdf" })); expect(await screen.findByText(/new.pdf.*uploaded/i)).toBeInTheDocument(); expect(ticketApi.getTicket).toHaveBeenCalledTimes(3);
});
it("UI-ATT-004–007: reason boundaries, busy state, trim and explicit confirmation", async () => {
  let finish!: (value: typeof active) => void; vi.mocked(attachmentApi.removeAttachment).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>); await user.click(await screen.findByRole("button", { name: "Remove proof.pdf" })); const dialog = screen.getByRole("dialog", { name: "Remove Attachment" }); const reason = within(dialog).getByLabelText(/Reason for removal/); const confirm = within(dialog).getByRole("button", { name: "Confirm Removal" }); expect(confirm).toBeDisabled();
  await user.type(reason, "abcd"); expect(confirm).toBeDisabled(); expect(within(dialog).getByText(/at least 5/)).toBeInTheDocument(); fireEvent.change(reason, { target: { value: "x".repeat(256) } }); expect(confirm).toBeDisabled();
  fireEvent.change(reason, { target: { value: "  Wrong document  " } }); await user.dblClick(confirm); expect(attachmentApi.removeAttachment).toHaveBeenCalledTimes(1); expect(vi.mocked(attachmentApi.removeAttachment).mock.calls[0].slice(0, 2)).toEqual([7, "Wrong document"]); expect(screen.getByRole("button", { name: /Removing/ })).toBeDisabled();
  await act(async () => finish(active)); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("Cancel, Escape and backdrop never remove; focus is trapped and restored", async () => {
  const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>); const trigger = await screen.findByRole("button", { name: "Remove proof.pdf" }); await user.click(trigger);
  const dialog = screen.getByRole("dialog"); fireEvent.click(dialog.parentElement!); expect(screen.getByRole("dialog")).toBeInTheDocument(); await user.keyboard("{Escape}"); expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
  await user.click(trigger); await user.click(screen.getByRole("button", { name: "Cancel" })); expect(trigger).toHaveFocus(); expect(attachmentApi.removeAttachment).not.toHaveBeenCalled();
  await user.click(trigger); const reason = screen.getByLabelText(/Reason for removal/); expect(reason).toHaveFocus(); await user.tab({ shift: true }); expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus(); await user.tab(); expect(reason).toHaveFocus();
});
it("removal error preserves the reason and permits retry", async () => { vi.mocked(attachmentApi.removeAttachment).mockRejectedValueOnce(new Error("offline")); const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>); await user.click(await screen.findByRole("button", { name: "Remove proof.pdf" })); await user.type(screen.getByLabelText(/Reason for removal/), "Wrong document"); await user.click(screen.getByRole("button", { name: "Confirm Removal" })); expect(await screen.findByText(/Unable to remove/)).toBeInTheDocument(); expect(screen.getByLabelText(/Reason for removal/)).toHaveValue("Wrong document"); await user.click(screen.getByRole("button", { name: "Confirm Removal" })); expect(await screen.findByText(/removed successfully/)).toBeInTheDocument(); });
it("prevents duplicate downloads while showing a busy state", async () => {
  let finish!: () => void; vi.mocked(attachmentApi.downloadAttachment).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>); await user.dblClick(await screen.findByRole("button", { name: "Download proof.pdf" }));
  expect(attachmentApi.downloadAttachment).toHaveBeenCalledTimes(1); expect(screen.getByRole("button", { name: "Downloading proof.pdf" })).toBeDisabled();
  await act(async () => finish()); expect(screen.getByRole("button", { name: "Download proof.pdf" })).toBeEnabled();
});
it("switching requester cancels an attachment action and hides its eventual result", async () => {
  let finish!: (value: typeof active) => void; vi.mocked(attachmentApi.uploadAttachment).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const user = userEvent.setup(); render(<AuthProvider><AuthApp /></AuthProvider>); await user.upload(await screen.findByLabelText("Supporting attachments"), new File(["pdf"], "pending.pdf", { type: "application/pdf" })); await user.dblClick(screen.getByRole("button", { name: "Upload attachments" }));
  expect(attachmentApi.uploadAttachment).toHaveBeenCalledTimes(1); expect(screen.getByRole("button", { name: "Uploading..." })).toBeDisabled();
  const signal = vi.mocked(attachmentApi.uploadAttachment).mock.calls[0][2]!; await user.click(screen.getByRole("button", { name: "Open profile menu" })); await user.click(screen.getByRole("menuitem", { name: "Logout" })); expect(signal.aborted).toBe(true);
  await act(async () => finish(active)); expect(screen.queryByText(/pending.pdf.*uploaded/)).not.toBeInTheDocument();
});
