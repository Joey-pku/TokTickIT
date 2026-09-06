import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { removeAttachment, type Attachment } from "./attachment-api.js";
import { formatFileSize } from "./AttachmentPicker.js";
export function RemovalModal({ attachment, close, removed }: { attachment: Attachment; close: () => void; removed: (value: Attachment) => void }) {
  const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null); const controller = useRef<AbortController>(); const pending = useRef(false);
  useEffect(() => { const trigger = document.activeElement as HTMLElement | null; dialog.current?.querySelector("textarea")?.focus(); return () => { controller.current?.abort(); trigger?.focus(); }; }, []);
  const length = reason.trim().length, valid = length >= 5 && length <= 255;
  function keyboard(event: KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key === "Tab") {
      const controls = Array.from(dialog.current!.querySelectorAll<HTMLElement>("textarea, button:not(:disabled)"));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  async function confirm() {
    if (!valid || pending.current) return; pending.current = true; setBusy(true); setError(""); const abort = new AbortController(); controller.current = abort;
    try { const value = await removeAttachment(attachment.id, reason.trim(), abort.signal); if (!abort.signal.aborted) removed(value); }
    catch { if (!abort.signal.aborted) setError("Unable to remove attachment. Please try again."); }
    finally { if (!abort.signal.aborted) { pending.current = false; setBusy(false); } }
  }
  return <div className="attachment-modal-backdrop"><div ref={dialog} className="attachment-modal" role="dialog" aria-modal="true" aria-labelledby="removal-title" onKeyDown={keyboard}>
    <h2 id="removal-title">Remove Attachment</h2><p>Are you sure you want to remove this attachment? The file will be removed from active ticket evidence and cannot be downloaded again. This action is permanently recorded in the audit trail.</p>
    <p><strong>{attachment.originalFileName}</strong> ({formatFileSize(attachment.fileSizeBytes)})</p>
    <label htmlFor="removal-reason">Reason for removal <span className="required-marker">*</span></label><textarea id="removal-reason" aria-required="true" aria-invalid={!!reason && !valid} aria-describedby="removal-help" value={reason} onChange={event => setReason(event.target.value)} />
    <p id="removal-help" className={!valid && reason ? "ticket-field-error" : "ticket-hint"}>{length < 5 && reason ? "Please provide a removal reason of at least 5 characters." : length > 255 ? "Removal reason must not exceed 255 characters." : "5–255 characters"} ({length}/255)</p>
    {error && <p role="alert" className="zen-alert zen-error">{error}</p>}
    <div className="ticket-actions"><button className="zen-button zen-secondary" onClick={close}>Cancel</button><button className="zen-button attachment-danger" disabled={!valid || busy} onClick={confirm}>{busy && <span className="zen-spinner ticket-inline-spinner" aria-hidden="true" />}{busy ? "Removing..." : "Confirm Removal"}</button></div>
  </div></div>;
}
