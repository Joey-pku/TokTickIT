import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext.js";
import { createTicket, TicketApiError, type Priority, type Ticket } from "./ticket-api.js";
import { formatDate, ReadOnly, TicketLink, useReferences } from "./TicketComponents.js";
import { navigate } from "./navigation.js";
import { AttachmentPicker } from "./AttachmentPicker.js";
import { uploadAttachment } from "./attachment-api.js";

export function CreateTicket() {
  const { user } = useAuth();
  const refs = useReferences(true);
  const [categoryId, setCategory] = useState(""); const [relatedSystemId, setSystem] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [summary, setSummary] = useState(""); const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({}); const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false); const [created, setCreated] = useState<Ticket | null>(null);
  const pending = useRef(false); const controller = useRef<AbortController | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMessages, setUploadMessages] = useState<{ name: string; failed: boolean; reason?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  useEffect(() => () => { controller.current?.abort(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending.current || created) return;
    const errors: Record<string, string> = {};
    if (!categoryId) errors.categoryId = "Please select a category.";
    if (!relatedSystemId) errors.relatedSystemId = "Please select a related system.";
    if (summary.trim().length < 5 || summary.trim().length > 100) errors.summary = "Summary must be between 5 and 100 characters.";
    if (description.trim().length < 10 || description.trim().length > 2000) errors.description = "Description must be between 10 and 2,000 characters.";
    setFields(errors); setFailed(false);
    if (Object.keys(errors).length) { document.getElementById(Object.keys(errors)[0])?.focus(); return; }
    pending.current = true; setBusy(true); const abort = new AbortController(); controller.current = abort;
    try {
      const result = await createTicket({ categoryId: Number(categoryId), relatedSystemId: Number(relatedSystemId), requestedPriority: priority, summary: summary.trim(), description: description.trim() }, abort.signal);
      if (!abort.signal.aborted) {
        setCreated(result); setUploading(files.length > 0);
        for (const file of files) {
          if (abort.signal.aborted) break;
          try {
            await uploadAttachment(result.id, file, abort.signal);
            if (!abort.signal.aborted) setUploadMessages(previous => [...previous, { name: file.name, failed: false }]);
          } catch (error) {
            const reason = error instanceof TicketApiError ? error.error.message : "Unable to communicate with the server. Please try again.";
            if (!abort.signal.aborted) setUploadMessages(previous => [...previous, { name: file.name, failed: true, reason }]);
          }
        }
        if (!abort.signal.aborted) setUploading(false);
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        if (error instanceof TicketApiError && error.error.code === "VALIDATION_ERROR") setFields(error.error.fields ?? {});
        else setFailed(true);
      }
    } finally { if (!abort.signal.aborted) { pending.current = false; setBusy(false); } }
  }
  const fieldProps = (name: string) => ({ id: name, "aria-required": true as const, "aria-invalid": !!fields[name], "aria-describedby": fields[name] ? `${name}-error` : undefined });
  const errorFor = (name: string) => fields[name] && <p id={`${name}-error`} className="ticket-field-error" role="alert"><span aria-hidden="true">⚠ </span>{fields[name]}</p>;
  return <section className="ticket-page"><h1>Create Ticket</h1><p>Submit a new support request.</p>
    {failed && <div className="zen-alert zen-error" role="alert">Server error: Unable to submit ticket. Please check your network and try again.</div>}
    {created && <div className="zen-alert ticket-success" role="status">Ticket {created.ticketNumber} created successfully.</div>}
    {uploading && <p role="status"><span className="zen-spinner ticket-inline-spinner" aria-hidden="true" /> Uploading attachments...</p>}
    <div aria-live="polite">{uploadMessages.map((item, i) => <p key={i} className={`zen-alert ${item.failed ? "zen-error" : "ticket-success"}`}>{item.name} {item.failed ? `upload failed. ${item.reason} The ticket remains created. You can retry uploading this attachment from Ticket Detail.` : "uploaded successfully."}</p>)}</div>
    {created && uploadMessages.some(item => item.failed) && <><p><TicketLink href={`/tickets/${created.id}`}>Retry failed uploads from Ticket Detail</TicketLink></p><div className="ticket-panel"><ReadOnly label="Summary">{summary}</ReadOnly><ReadOnly label="Description">{description}</ReadOnly></div></>}
    <form className="ticket-panel" onSubmit={submit} noValidate>
      <div className="ticket-grid">
        <ReadOnly label="Ticket Number">{created?.ticketNumber ?? "Generated after submission"}</ReadOnly>
        <ReadOnly label="Ticket Date">{created ? formatDate(created.createdAt) : "Assigned after submission"}</ReadOnly>
        <ReadOnly label="Requester">{user?.name}</ReadOnly>
      </div>
      {created ? <div className="ticket-actions"><TicketLink className="zen-button zen-secondary" href="/tickets">Go to My Tickets</TicketLink><TicketLink className="zen-button zen-primary" href={`/tickets/${created.id}`}>View Ticket Details</TicketLink></div> : <>
        {refs.state === "loading" && <p role="status">Loading categories and related systems...</p>}
        {refs.state === "error" && <div className="zen-alert zen-error" role="alert">Unable to load categories and related systems. <button className="zen-button zen-secondary" type="button" onClick={refs.retry}>Retry</button></div>}
        {refs.state === "ready" && (!refs.categories.length || !refs.relatedSystems.length) && <div className="zen-alert zen-info">No categories or active related systems are available. <button className="zen-button zen-secondary" type="button" onClick={refs.retry}>Retry</button></div>}
        <div className="ticket-grid">
          <div><label htmlFor="categoryId">Category <span className="required-marker">*</span></label><select {...fieldProps("categoryId")} value={categoryId} onChange={e => setCategory(e.target.value)}><option value="">-- Select Category --</option>{refs.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{errorFor("categoryId")}</div>
          <div><label htmlFor="relatedSystemId">Related System <span className="required-marker">*</span></label><select {...fieldProps("relatedSystemId")} value={relatedSystemId} onChange={e => setSystem(e.target.value)}><option value="">-- Select Related System --</option>{refs.relatedSystems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{errorFor("relatedSystemId")}</div>
          <div><label htmlFor="requestedPriority">Requested Priority <span className="required-marker">*</span></label><select {...fieldProps("requestedPriority")} value={priority} onChange={e => setPriority(e.target.value as Priority)}>{["LOW", "MEDIUM", "HIGH"].map(p => <option key={p}>{p}</option>)}</select>{errorFor("requestedPriority")}</div>
        </div>
        <div className="ticket-field"><label htmlFor="summary">Ticket Summary <span className="required-marker">*</span></label><input {...fieldProps("summary")} value={summary} onChange={e => setSummary(e.target.value)} />{errorFor("summary")}<div className={`ticket-hint ${fields.summary ? "ticket-field-error" : ""}`}><span>Brief overview of the issue (5–100 characters)</span><span>{summary.length}/100</span></div></div>
        <div className="ticket-field"><label htmlFor="description">Description <span className="required-marker">*</span></label><textarea {...fieldProps("description")} value={description} onChange={e => setDescription(e.target.value)} />{errorFor("description")}<div className={`ticket-hint ${fields.description ? "ticket-field-error" : ""}`}><span>Detailed symptoms, error messages, and reproduction steps (10–2,000 characters)</span><span>{description.length}/2,000</span></div></div>
        <AttachmentPicker files={files} onChange={setFiles} disabled={busy} />
        <div className="ticket-actions"><button className="zen-button zen-secondary" type="button" onClick={() => navigate("/tickets")}>Cancel</button><button className="zen-button zen-primary" disabled={busy || refs.state !== "ready" || !refs.categories.length || !refs.relatedSystems.length} type="submit">{busy && <span className="zen-spinner ticket-inline-spinner" aria-hidden="true" />}{busy ? "Submitting..." : "Submit Ticket"}</button></div>
      </>}
    </form>
  </section>;
}
