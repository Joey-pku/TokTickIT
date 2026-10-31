import { useEffect, useState, type ReactNode } from "react";
import { getRequesterDashboard, type RequesterDashboardData } from "./dashboard-api.js";
import { Badge, formatDate, Skeleton, TicketLink } from "./TicketComponents.js";

export function RequesterDashboard() {
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    getRequesterDashboard(controller.signal).then(result => {
      if (!controller.signal.aborted) { setData(result); setState("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [attempt]);

  return <section className="ticket-page requester-dashboard" aria-labelledby="dashboard-title">
    <div className="ticket-page-heading"><div><h1 id="dashboard-title">Dashboard</h1><p>Your support Tickets at a glance.</p></div><TicketLink href="/tickets/new" className="zen-button zen-primary">+ New Ticket</TicketLink></div>
    {state === "loading" && <Skeleton label="Loading dashboard..." />}
    {state === "error" && <div className="ticket-panel zen-error" role="alert"><p>Unable to load your dashboard. Please check your connection and try again.</p><button type="button" className="zen-button zen-secondary" onClick={() => setAttempt(value => value + 1)}>Try Again</button></div>}
    {state === "ready" && data && <>
      <div className="dashboard-metrics" aria-label="Ticket summary">
        <TicketLink href={data.drillDown.active} className="dashboard-metric ticket-panel" aria-label={`${data.metrics.active} active Tickets`}><span>Active Tickets</span><strong>{data.metrics.active}</strong><small>View active Tickets →</small></TicketLink>
        <TicketLink href={data.drillDown.waitingForRequester} className="dashboard-metric ticket-panel" aria-label={`${data.metrics.waitingForRequester} Tickets waiting for you`}><span>Waiting for you</span><strong>{data.metrics.waitingForRequester}</strong><small>View Tickets needing attention →</small></TicketLink>
      </div>
      <DashboardSection title="Recently updated" viewAll={data.drillDown.recentlyUpdated} empty="No recently updated Tickets.">
        {data.recentlyUpdated.map(ticket => <article className="dashboard-ticket" key={ticket.id}>
          <div><TicketLink href={ticket.href}>{ticket.ticketNumber}</TicketLink><p>{ticket.summary}</p></div>
          <Badge value={ticket.currentStatus} /><Badge value={ticket.requestedPriority} />
          <time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt)}</time>
        </article>)}
      </DashboardSection>
      <DashboardSection title="Recently resolved" viewAll={data.drillDown.recentlyResolved} empty="No recently resolved Tickets.">
        {data.recentlyResolved.map(ticket => <article className="dashboard-ticket" key={ticket.id}>
          <div><TicketLink href={ticket.href}>{ticket.ticketNumber}</TicketLink><p>{ticket.summary}</p></div>
          <Badge value={ticket.currentStatus} />
          <time dateTime={ticket.resolvedAt}>{formatDate(ticket.resolvedAt)}</time>
        </article>)}
      </DashboardSection>
    </>}
  </section>;
}

function DashboardSection({ title, viewAll, empty, children }: { title: string; viewAll: string; empty: string; children: ReactNode }) {
  const hasItems = Array.isArray(children) && children.length > 0;
  return <section className="ticket-panel dashboard-section" aria-labelledby={`dashboard-${title.replaceAll(" ", "-").toLowerCase()}`}>
    <header><h2 id={`dashboard-${title.replaceAll(" ", "-").toLowerCase()}`}>{title}</h2><TicketLink href={viewAll}>View all</TicketLink></header>
    {hasItems ? <div className="dashboard-list">{children}</div> : <p className="dashboard-empty">{empty}</p>}
  </section>;
}
