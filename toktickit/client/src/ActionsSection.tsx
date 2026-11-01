import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiCallError } from "./api.js";
import {
  createTicketAction, listActionAssignees, listTicketActions, updateTicketAction,
  type ActionAssignee, type ActionStatus, type ActionValues, type TicketAction,
} from "./action-api.js";
import { Badge, formatDate, Skeleton } from "./TicketComponents.js";

type Draft = {
  assignedToId: string; description: string; result: string; followUpRequired: boolean;
  followUpNote: string; attachmentNotes: string; status: ActionStatus;
};
type Mode = { kind: "create"; key: string } | { kind: "edit"; action: TicketAction } | null;

const transitions: Record<ActionStatus, ActionStatus[]> = {
  PLANNED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], CANCELLED: [],
};
const statusLabel = (value: ActionStatus) => value.toLowerCase().split("_").map(part => part[0].toUpperCase() + part.slice(1)).join(" ");
const blankDraft = (): Draft => ({ assignedToId: "", description: "", result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "", status: "PLANNED" });
const actionDraft = (action: TicketAction): Draft => ({ assignedToId: action.assignedToId?.toString() ?? "", description: action.description, result: action.result, followUpRequired: action.followUpRequired, followUpNote: action.followUpNote ?? "", attachmentNotes: action.attachmentNotes ?? "", status: action.status });
const newKey = () => crypto.randomUUID();

function validate(draft: Draft, reassignmentOnly: boolean) {
  const fields: Record<string, string> = {};
  if (!/^\d+$/.test(draft.assignedToId) || Number(draft.assignedToId) < 1) fields.assignedToId = "Select an eligible assignee.";
  if (!reassignmentOnly) {
    const description = draft.description.trim(), result = draft.result.trim(), followUp = draft.followUpNote.trim(), attachment = draft.attachmentNotes.trim();
    if (description.length < 1 || description.length > 2000) fields.description = "Description must be between 1 and 2000 characters.";
    if (result.length > 2000) fields.result = "Result must be at most 2000 characters.";
    if (draft.status === "COMPLETED" && result.length < 1) fields.result = "Result is required when completing an Action.";
    if (draft.followUpRequired && (followUp.length < 1 || followUp.length > 2000)) fields.followUpNote = "Follow-up Note must be between 1 and 2000 characters.";
    if (attachment.length > 2000) fields.attachmentNotes = "Attachment Notes must be at most 2000 characters.";
  }
  return fields;
}

function FieldError({ id, value }: { id: string; value?: string }) {
  return value ? <p id={id} className="ticket-field-error">{value}</p> : null;
}

export function ActionsSection({ ticketId, editable }: { ticketId: number; editable: boolean }) {
  const [items, setItems] = useState<TicketAction[]>([]), [assignees, setAssignees] = useState<ActionAssignee[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading"), [attempt, retry] = useState(0);
  const [mode, setMode] = useState<Mode>(null), [draft, setDraft] = useState<Draft>(blankDraft);
  const [fields, setFields] = useState<Record<string, string>>({}), [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false), [stale, setStale] = useState(false), [confirmCancel, setConfirmCancel] = useState(false);
  const cancelConfirm = useRef<HTMLButtonElement>(null), cancelDialog = useRef<HTMLDivElement>(null), cancelReturnFocus = useRef<HTMLElement | null>(null);
  const staleReview = useRef<HTMLButtonElement>(null);

  async function loadActions(signal?: AbortSignal) {
    const data = await listTicketActions(ticketId, signal); setItems(data.items);
  }
  async function loadAssignees(signal?: AbortSignal) {
    if (!editable) return; const data = await listActionAssignees(signal); setAssignees(data.items);
  }
  useEffect(() => {
    const controller = new AbortController(); setState("loading");
    Promise.all([loadActions(controller.signal), loadAssignees(controller.signal)]).then(() => setState("ready")).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [ticketId, editable, attempt]);
  useEffect(() => {
    if (!confirmCancel) return;
    cancelReturnFocus.current = document.activeElement as HTMLElement;
    cancelConfirm.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setConfirmCancel(false); return; }
      if (event.key !== "Tab" || !cancelDialog.current) return;
      const controls = [...cancelDialog.current.querySelectorAll<HTMLElement>("button:not(:disabled)")];
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); cancelReturnFocus.current?.focus(); };
  }, [confirmCancel]);
  useEffect(() => { if (stale) staleReview.current?.focus(); }, [stale]);

  function openCreate() { setMode({ kind: "create", key: newKey() }); setDraft(blankDraft()); setFields({}); setMessage(""); setStale(false); }
  function openEdit(action: TicketAction) { setMode({ kind: "edit", action }); setDraft(actionDraft(action)); setFields({}); setMessage(""); setStale(false); }
  function closeForm() { if (busy) return; setMode(null); setFields({}); setMessage(""); setStale(false); setConfirmCancel(false); }
  const recovery = mode?.kind === "edit" && mode.action.assignedToId === null;
  const terminal = mode?.kind === "edit" && transitions[mode.action.status].length === 0;

  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(previous => ({ ...previous, [key]: value })); setFields(previous => ({ ...previous, [key]: "" })); }
  function toggleFollowUp(checked: boolean) {
    if (!checked && draft.followUpNote.trim() && !window.confirm("Clear the current Follow-up Note?")) return;
    setDraft(previous => ({ ...previous, followUpRequired: checked, followUpNote: checked ? previous.followUpNote : "" }));
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault(); if (!mode || busy || terminal) return;
    const validation = validate(draft, recovery); setFields(validation); setMessage(""); setStale(false);
    if (Object.keys(validation).length) return;
    if (!recovery && draft.status === "CANCELLED" && mode.kind === "edit" && mode.action.status !== "CANCELLED" && !confirmCancel) { setConfirmCancel(true); return; }
    setConfirmCancel(false); setBusy(true);
    const values: ActionValues = {
      assignedToId: Number(draft.assignedToId), description: draft.description.trim(), result: draft.result.trim(),
      followUpRequired: draft.followUpRequired, followUpNote: draft.followUpRequired ? draft.followUpNote.trim() : null,
      attachmentNotes: draft.attachmentNotes.trim() || null, status: draft.status,
    };
    try {
      if (mode.kind === "create") await createTicketAction(ticketId, { idempotencyKey: mode.key, ...values });
      else if (recovery) await updateTicketAction(ticketId, mode.action.id, { version: mode.action.version, assignedToId: values.assignedToId });
      else await updateTicketAction(ticketId, mode.action.id, { version: mode.action.version, ...values });
      const success = mode.kind === "create" ? "Action recorded successfully." : "Action updated successfully.";
      setMode(null); setMessage(success);
      try { await loadActions(); } catch { setState("error"); setMessage(`${success} The latest list could not be refreshed; use Retry Actions to load it again.`); }
    } catch (error) {
      if (error instanceof ApiCallError) {
        if (error.error.fields) setFields(error.error.fields);
        if (error.error.code === "STALE_ACTION") { setStale(true); setMessage("This Action changed since you opened it. Review the latest version before retrying."); }
        else if (error.error.code === "INELIGIBLE_ASSIGNEE") { setFields(previous => ({ ...previous, assignedToId: "This assignee is no longer eligible. Select another user." })); setMessage(error.error.message); await loadAssignees().catch(() => undefined); }
        else setMessage(error.error.message);
      } else setMessage("Unable to save the Action. Your entries are preserved; retry when the connection is available.");
    } finally { setBusy(false); }
  }

  async function reviewLatest(discard: boolean) {
    try {
      const data = await listTicketActions(ticketId); setItems(data.items);
      const latest = mode?.kind === "edit" ? data.items.find(item => item.id === mode.action.id) : undefined;
      if (discard) { if (latest && transitions[latest.status].length) openEdit(latest); else setMode(null); }
      else setMessage("Latest Action data is shown below. Your draft is still preserved in the form.");
    } catch { setMessage("Unable to refresh the latest Action. Your draft is still preserved."); }
  }

  return <section id={`actions-${ticketId}`} tabIndex={-1} className="ticket-panel actions-section" aria-labelledby={`actions-heading-${ticketId}`}>
    <div className="actions-heading"><div><h2 id={`actions-heading-${ticketId}`}>Actions Taken</h2><p>Recorded work and follow-up for this Ticket.</p></div>{editable && !mode && <button className="zen-button zen-primary" onClick={openCreate}>Add Action</button>}</div>
    {message && <div className={`zen-alert ${stale || fields.assignedToId ? "zen-error" : "ticket-success"}`} role="status" aria-live="polite">{message}</div>}
    {state === "loading" && <Skeleton label="Loading Actions Taken..." />}
    {state === "error" && <div className="zen-alert zen-error" role="alert">Unable to load Actions Taken. The rest of the Ticket is still available. <button className="zen-button zen-secondary" onClick={() => retry(value => value + 1)}>Retry Actions</button></div>}
    {state === "ready" && !items.length && <p className="actions-empty">No Actions Taken have been recorded.</p>}
    {state === "ready" && <div className="actions-list">{items.map(action => <article id={`action-${action.id}`} className="action-card" key={action.id} tabIndex={-1}>
      <header><div><h3>{action.description}</h3><p>Created {formatDate(action.createdAt)}{action.updatedAt !== action.createdAt ? ` · Updated ${formatDate(action.updatedAt)}` : ""}</p></div><Badge value={action.status}/></header>
      <dl className="action-details"><div><dt>Recorded/Performed by</dt><dd>{action.performedByName}</dd></div><div><dt>Assigned to</dt><dd>{action.assignedToName ?? "Unassigned — reassignment required"}</dd></div><div><dt>Result</dt><dd>{action.result || "Not recorded"}</dd></div><div><dt>Follow-Up Required?</dt><dd>{action.followUpRequired ? "Yes" : "No"}</dd></div>{action.followUpRequired && <div><dt>Follow-up Note</dt><dd>{action.followUpNote}</dd></div>}<div><dt>Attachment Notes</dt><dd>{action.attachmentNotes || "None"}</dd></div></dl>
      {editable && !mode && <div className="action-card-actions"><button className="zen-button zen-secondary" onClick={() => openEdit(action)}>{transitions[action.status].length ? action.assignedToId === null ? "Reassign" : "View / Edit" : "View"}</button></div>}
    </article>)}</div>}
    {mode && <form className="action-form" onSubmit={submit} noValidate aria-labelledby="action-form-title">
      <div className="actions-heading"><div><h3 id="action-form-title">{mode.kind === "create" ? "Add Action" : recovery ? "Reassign Action" : terminal ? "View Action" : "Edit Action"}</h3>{recovery && <p className="zen-alert zen-notice">This Action was unassigned after an account change. Only reassignment is available.</p>}{terminal && <p>Completed and cancelled Actions are read-only.</p>}</div></div>
      <div className="ticket-field"><label htmlFor="action-assignee">Assigned to <span className="required-marker">*</span></label><select id="action-assignee" value={draft.assignedToId} disabled={busy || terminal} aria-invalid={!!fields.assignedToId} aria-describedby={fields.assignedToId ? "action-assignee-error" : undefined} onChange={event => update("assignedToId", event.target.value)}><option value="">Select an eligible user</option>{assignees.map(person => <option value={person.id} key={person.id}>{person.name} ({statusLabel(person.role as ActionStatus)})</option>)}</select><FieldError id="action-assignee-error" value={fields.assignedToId}/></div>
      {!recovery && <><div className="ticket-field"><label htmlFor="action-description">Action Description <span className="required-marker">*</span></label><textarea id="action-description" value={draft.description} maxLength={2001} readOnly={terminal} aria-invalid={!!fields.description} aria-describedby="action-description-help" onChange={event => update("description", event.target.value)}/><div id="action-description-help" className={`ticket-hint ${fields.description ? "ticket-field-error" : ""}`}><span>{fields.description ?? "Describe the work to perform."}</span><span>{draft.description.length}/2000</span></div></div>
      <div className="ticket-field"><label htmlFor="action-result">Result</label><textarea id="action-result" value={draft.result} maxLength={2001} readOnly={terminal} aria-invalid={!!fields.result} aria-describedby="action-result-help" onChange={event => update("result", event.target.value)}/><div id="action-result-help" className={`ticket-hint ${fields.result ? "ticket-field-error" : ""}`}><span>{fields.result ?? "Required when completing an Action."}</span><span>{draft.result.length}/2000</span></div></div>
      <div className="action-check"><input id="action-follow-up" type="checkbox" checked={draft.followUpRequired} disabled={terminal} onChange={event => toggleFollowUp(event.target.checked)}/><label htmlFor="action-follow-up">Follow-Up Required? <strong>{draft.followUpRequired ? "Yes" : "No"}</strong></label></div>
      {draft.followUpRequired && <div className="ticket-field"><label htmlFor="action-follow-up-note">Follow-up Note <span className="required-marker">*</span></label><textarea id="action-follow-up-note" value={draft.followUpNote} maxLength={2001} readOnly={terminal} aria-invalid={!!fields.followUpNote} aria-describedby={fields.followUpNote ? "action-follow-up-note-error" : undefined} onChange={event => update("followUpNote", event.target.value)}/><FieldError id="action-follow-up-note-error" value={fields.followUpNote}/></div>}
      <div className="ticket-field"><label htmlFor="action-attachment-notes">Attachment Notes</label><textarea id="action-attachment-notes" value={draft.attachmentNotes} maxLength={2001} readOnly={terminal} aria-invalid={!!fields.attachmentNotes} aria-describedby={fields.attachmentNotes ? "action-attachment-notes-error" : undefined} onChange={event => update("attachmentNotes", event.target.value)}/><FieldError id="action-attachment-notes-error" value={fields.attachmentNotes}/></div>
      <div className="ticket-field"><label htmlFor="action-status">Status</label><select id="action-status" value={draft.status} disabled={busy || terminal} onChange={event => update("status", event.target.value as ActionStatus)}>{mode.kind === "create" ? ["PLANNED", "IN_PROGRESS"].map(value => <option key={value} value={value}>{statusLabel(value as ActionStatus)}</option>) : [mode.action.status, ...transitions[mode.action.status]].map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></div></>}
      {mode.kind === "create" && <p className="zen-alert zen-notice">Performed by the signed-in user. Created time is supplied by the server.</p>}
      {stale && <div className="action-conflict" role="alert"><button ref={staleReview} type="button" className="zen-button zen-primary" onClick={() => reviewLatest(false)}>Review latest</button><button type="button" className="zen-button zen-secondary" onClick={() => reviewLatest(true)}>Discard my draft</button></div>}
      <div className="ticket-actions"><button type="button" className="zen-button zen-secondary" disabled={busy} onClick={closeForm}>{terminal ? "Close" : "Cancel"}</button>{!terminal && <button className="zen-button zen-primary" disabled={busy}>{busy ? "Saving..." : recovery ? "Reassign" : mode.kind === "create" ? "Record Action" : "Save Action"}</button>}</div>
    </form>}
    {confirmCancel && <div className="action-modal-backdrop"><div ref={cancelDialog} className="action-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-action-title" aria-describedby="cancel-action-description"><h3 id="cancel-action-title">Cancel this Action?</h3><p id="cancel-action-description">The Action will remain in history and become read-only.</p><div className="ticket-actions"><button className="zen-button zen-secondary" onClick={() => setConfirmCancel(false)}>Keep Action</button><button ref={cancelConfirm} className="zen-button attachment-danger" onClick={() => submit()}>Cancel Action</button></div></div></div>}
  </section>;
}
