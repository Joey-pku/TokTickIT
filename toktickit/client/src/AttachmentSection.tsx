import { useEffect, useRef, useState } from "react";
import { downloadAttachment, uploadAttachment, type Attachment } from "./attachment-api.js";
import { AttachmentPicker, formatFileSize } from "./AttachmentPicker.js";
import { RemovalModal } from "./RemovalModal.js";
import { formatDate } from "./TicketComponents.js";
export function AttachmentSection({ ticketId, attachments, refresh, changed }: { ticketId: number; attachments: Attachment[]; refresh: () => Promise<void>; changed: (attachment: Attachment) => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [files, setFiles] = useState<File[]>([]); const [busy, setBusy] = useState(false); const [messages, setMessages] = useState<{ file: File; failed: boolean; text: string }[]>([]);
  const [removing, setRemoving] = useState<Attachment | null>(null); const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState<number | null>(null);
  const downloadPending = useRef(false);
  const controller = useRef<AbortController>(); const pending = useRef(false);
  useEffect(() => { controller.current = new AbortController(); return () => controller.current?.abort(); }, []);
  const active = attachments.filter(a => !a.isRemoved), removed = attachments.filter(a => a.isRemoved);
  async function update() { try { await refresh(); } catch { if (!controller.current?.signal.aborted) setNotice("The attachment action succeeded, but ticket information could not refresh. Please retry refreshing."); } }
  async function upload(selected: File[], retry = false) {
    if (pending.current) return; pending.current = true; setBusy(true); setNotice("");
    const signal = controller.current!.signal;
    let succeeded = false;
    try {
      if (retry) { try { await refresh(); } catch { if (!signal.aborted) setNotice("Unable to refresh attachments before retry. Please try again."); return; } }
      for (const file of selected) {
        if (signal.aborted) break;
        try { const item = await uploadAttachment(ticketId, file, signal); if (!signal.aborted) { succeeded = true; changed(item); setMessages(previous => [...previous.filter(m => m.file !== file), { file, failed: false, text: `${file.name} uploaded successfully.` }]); } }
        catch { if (!signal.aborted) setMessages(previous => [...previous.filter(m => m.file !== file), { file, failed: true, text: `${file.name} upload failed. Refresh and retry if the file is not already attached.` }]); }
      }
      if (!signal.aborted) { setFiles([]); if (succeeded) await update(); }
    } finally { if (!signal.aborted) { pending.current = false; setBusy(false); } }
  }
  async function download(file: Attachment) {
    if (downloadPending.current) return;
    downloadPending.current = true; setDownloading(file.id);
    try { await downloadAttachment(file, controller.current!.signal); }
    catch { if (!controller.current?.signal.aborted) setNotice(`Unable to download ${file.originalFileName}. Please try again.`); }
    finally { if (!controller.current?.signal.aborted) { downloadPending.current = false; setDownloading(null); } }
  }
  return <section aria-label="Ticket attachments"><h2 ref={heading} tabIndex={-1}>Attachments ({active.length}/5)</h2>
    {notice && <div role="status" className="zen-alert zen-info">{notice}<button className="zen-button zen-secondary" onClick={() => { refresh().then(() => setNotice("")).catch(() => setNotice("Unable to refresh ticket information. Please try again.")); }}>Refresh attachments</button></div>}
    {!active.length && <p>No active attachments.</p>}
    <ul className="ticket-attachments">{active.map(file => <li key={file.id}><span aria-hidden="true">{file.mimeType.startsWith("image/") ? "▧" : "▤"} </span><strong>{file.originalFileName}</strong><p>{formatFileSize(file.fileSizeBytes)} · {formatDate(file.createdAt)}</p><div className="attachment-row-actions"><button className="zen-button zen-secondary" disabled={downloading !== null} aria-label={`${downloading === file.id ? "Downloading" : "Download"} ${file.originalFileName}`} onClick={() => download(file)}>{downloading === file.id ? "Downloading..." : "Download"}</button><button className="zen-button attachment-danger-outline" aria-label={`Remove ${file.originalFileName}`} onClick={() => setRemoving(file)}>Remove</button></div></li>)}</ul>
    <AttachmentPicker files={files} onChange={setFiles} slots={5 - active.length} disabled={busy} />
    <button className="zen-button zen-primary" disabled={busy || !files.length || active.length >= 5} onClick={() => upload(files)}>{busy && <span className="zen-spinner ticket-inline-spinner" aria-hidden="true" />}{busy ? "Uploading..." : "Upload attachments"}</button>
    <div aria-live="polite">{messages.map((message, i) => <div className={`zen-alert ${message.failed ? "zen-error" : "ticket-success"}`} key={i}>{message.text}{message.failed && <button className="zen-button zen-secondary" disabled={busy || active.length >= 5} onClick={() => upload([message.file], true)}>Retry {message.file.name}</button>}</div>)}</div>
    {removed.length > 0 && <details className="attachment-removed"><summary>Removed Attachments ({removed.length})</summary><ul className="ticket-attachments">{removed.map(file => <li className="ticket-removed" key={file.id}><strong>{file.originalFileName}</strong><span className="attachment-removed-badge">Removed</span><p>{formatFileSize(file.fileSizeBytes)} · {formatDate(file.createdAt)}</p>{file.removedAt && <p>Removed on {formatDate(file.removedAt)}</p>}<p><em>Reason: {file.removalReason}</em></p></li>)}</ul></details>}
    {removing && <RemovalModal attachment={removing} fallbackFocus={() => heading.current?.focus()} close={() => { setRemoving(null); void refresh().catch(() => {}); }} removed={item => { changed(item); setRemoving(null); setNotice("Attachment removed successfully."); void update(); }} />}
  </section>;
}
