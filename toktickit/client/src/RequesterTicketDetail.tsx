import { useEffect, useRef, useState } from "react";
import { AttachmentSection } from "./AttachmentSection.js";
import type { Attachment } from "./attachment-api.js";
import { appearResolved, getTicket, postComment, TicketApiError, type TicketDetail } from "./ticket-api.js";
import { Badge, formatDate, ReadOnly, Skeleton, TicketLink } from "./TicketComponents.js";
export function RequesterTicketDetail({ id }: { id: number }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [attempt, retry] = useState(0);
  const current = useRef<AbortController>();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmingResolved, setConfirmingResolved] = useState(false);
  const refreshVersion = useRef(0);
  async function refresh() {
    const signal = current.current!.signal, version = ++refreshVersion.current;
    const value = await getTicket(id, signal);
    if (!signal.aborted && version === refreshVersion.current) setTicket(value);
  }
  function changed(attachment: Attachment) {
    ++refreshVersion.current;
    setTicket(previous => previous && ({ ...previous, attachments: [...previous.attachments.filter(item => item.id !== attachment.id), attachment] }));
  }
  async function submitComment(event: React.FormEvent) {
    event.preventDefault(); if (!ticket || !comment.trim() || submitting) return;
    setSubmitting(true); setActionError("");
    try { await postComment(ticket.id, comment); setComment(""); await refresh(); }
    catch { setActionError("Unable to post comment. Your text has been preserved."); }
    finally { setSubmitting(false); }
  }
  async function confirmResolved() {
    if (!ticket || submitting) return;
    setSubmitting(true); setActionError("");
    try { await appearResolved(ticket.id); setConfirmingResolved(false); await refresh(); }
    catch { setActionError("Unable to record the resolution indication. Please try again."); }
    finally { setSubmitting(false); }
  }
  useEffect(() => {
    const controller = new AbortController(); current.current = controller; setState("loading"); setTicket(null);
    getTicket(id, controller.signal).then(value => { if (!controller.signal.aborted) { setTicket(value); setState("ready"); } })
      .catch(error => { if (!controller.signal.aborted) setState(error instanceof TicketApiError && error.status === 404 ? "missing" : "error"); });
    return () => controller.abort();
  }, [id, attempt]);
  return <section className="ticket-page"><div className="ticket-page-heading"><div><nav aria-label="Breadcrumb"><TicketLink href="/tickets">My Tickets</TicketLink> &gt; Ticket Details</nav><h1>Ticket Details</h1></div><TicketLink className="zen-button zen-secondary" href="/tickets">← Back to My Tickets</TicketLink></div>
    {state === "loading" && <Skeleton label="Loading ticket details..." />}
    {state === "missing" && <div className="ticket-panel ticket-empty"><h2>Ticket Not Found</h2><p>The requested ticket does not exist or you do not have permission to view it.</p><TicketLink className="zen-button zen-primary" href="/tickets">Return to My Tickets</TicketLink></div>}
    {state === "error" && <div role="alert" className="zen-alert zen-error">Unable to load ticket details. Please try again. <button className="zen-button zen-secondary" onClick={() => retry(value => value + 1)}>Retry</button></div>}
    {state === "ready" && ticket && <div className="ticket-detail-layout"><div className="ticket-panel">
      <div className="ticket-grid"><ReadOnly label="Ticket No.">{ticket.ticketNumber}</ReadOnly><ReadOnly label="Ticket Date">{formatDate(ticket.createdAt)}</ReadOnly><ReadOnly label="Requester">{ticket.requesterName}</ReadOnly></div>
      <div className="ticket-grid"><ReadOnly label="Category">{ticket.categoryName}</ReadOnly><ReadOnly label="Related System">{ticket.relatedSystemName}</ReadOnly><ReadOnly label="Requested Priority"><Badge value={ticket.requestedPriority} /></ReadOnly><ReadOnly label="Current Status"><Badge value={ticket.currentStatus} /></ReadOnly></div>
      <ReadOnly label="Summary"><strong>{ticket.summary}</strong></ReadOnly><div className="ticket-description"><ReadOnly label="Description">{ticket.description}</ReadOnly></div>
      {ticket.requesterResolved && <div className="zen-alert zen-success">You indicated{ticket.requesterResolvedAt ? ` on ${formatDate(ticket.requesterResolvedAt)}` : ""} that the problem appears resolved. Posting a new comment will clear this indication.</div>}
      {["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER"].includes(ticket.currentStatus) && !ticket.requesterResolved && <div className="resolution-action"><button className="zen-button zen-secondary" onClick={() => setConfirmingResolved(true)} disabled={submitting}>Problem Appears Resolved</button><p>Posting a new comment will clear this indication.</p>{confirmingResolved && <div className="zen-alert" role="dialog" aria-modal="true" aria-labelledby="resolution-confirm-title"><strong id="resolution-confirm-title">Confirm Problem Resolved?</strong><p>This will notify IT Staff that your issue appears resolved.</p><button className="zen-button zen-primary" onClick={confirmResolved} disabled={submitting}>Confirm</button><button className="zen-button zen-secondary" onClick={() => setConfirmingResolved(false)} disabled={submitting}>Cancel</button></div>}</div>}
      <section className="comments-section" data-testid="comments-section"><h2>Public Comments ({ticket.comments.length})</h2>
        <div className="comment-thread">{ticket.comments.length ? ticket.comments.map(item => <article className="comment-card" key={item.id}><header><strong>{item.authorName}</strong> <span>{item.authorRole.replace("_", " ")} · {formatDate(item.createdAt)}</span></header><p>{item.content}</p></article>) : <p>No comments yet.</p>}</div>
        <form onSubmit={submitComment}><label className="ticket-label" htmlFor="public-comment">Add Public Comment</label><textarea id="public-comment" name="comment" className="zen-input" maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} required /><button id="comment-submit" className="zen-button zen-primary" type="submit" disabled={submitting || !comment.trim()}>{submitting ? "Posting..." : "Post Comment"}</button></form>
        {actionError && <div role="alert" className="zen-alert zen-error">{actionError}</div>}
      </section>
    </div><aside className="ticket-panel"><AttachmentSection ticketId={ticket.id} attachments={ticket.attachments} refresh={refresh} changed={changed} /></aside></div>}
  </section>;
}
