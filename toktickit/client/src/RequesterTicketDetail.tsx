import { useEffect, useRef, useState } from "react";
import { AttachmentSection } from "./AttachmentSection.js";
import type { Attachment } from "./attachment-api.js";
import { getTicket, TicketApiError, type TicketDetail } from "./ticket-api.js";
import { Badge, formatDate, ReadOnly, Skeleton, TicketLink } from "./TicketComponents.js";
export function RequesterTicketDetail({ id }: { id: number }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [attempt, retry] = useState(0);
  const current = useRef<AbortController>();
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
    </div><aside className="ticket-panel"><AttachmentSection ticketId={ticket.id} attachments={ticket.attachments} refresh={refresh} changed={changed} /></aside></div>}
  </section>;
}
