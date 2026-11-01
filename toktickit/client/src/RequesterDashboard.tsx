import { useEffect, useState, type ReactNode } from "react";
import { getRequesterDashboard, type RequesterDashboardData } from "./dashboard-api.js";
import { Badge, formatDate, Skeleton, TicketLink } from "./TicketComponents.js";

export function RequesterDashboard({ displayName }: { displayName?: string }) {
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

  const name = displayName?.trim() || "there";
  return <section className="ticket-page requester-dashboard" aria-labelledby="dashboard-title">
    <div className="ticket-page-heading dashboard-welcome"><div><h1 id="dashboard-title">Welcome, {name}!</h1><p>Here's the latest on your requests.</p></div><TicketLink href="/tickets/new" className="zen-button zen-primary">+ New Ticket</TicketLink></div>
    {state === "loading" && <Skeleton label="Loading dashboard..." />}
    {state === "error" && <div className="ticket-panel zen-error" role="alert"><p>Unable to load your dashboard. Please check your connection and try again.</p><button type="button" className="zen-button zen-secondary" onClick={() => setAttempt(value => value + 1)}>Try Again</button></div>}
    {state === "ready" && data && <>
      <div className="dashboard-metrics dashboard-metrics-requester" aria-label="Ticket summary">
        <Metric label="My Open Tickets" value={data.metrics.active} href={data.drillDown.active} />
        <Metric label="In Progress" value={data.metrics.inProgress} href="/tickets?status=IN_PROGRESS" />
        <Metric label="Resolved" value={data.metrics.resolved} href="/tickets?status=RESOLVED" />
        <Metric label="Closed" value={data.metrics.closed} href="/tickets?status=CLOSED" />
      </div>
      <TicketLink href={data.drillDown.waitingForRequester} className="dashboard-attention ticket-panel" aria-label={`${data.metrics.waitingForRequester} Tickets waiting for you`}><span><strong>{data.metrics.waitingForRequester}</strong> Waiting for you</span><small>View Tickets needing attention →</small></TicketLink>
      <div className="dashboard-main-grid">
        <DashboardSection title="My Recent Tickets" viewAll={data.drillDown.recentlyUpdated} empty="No recent Tickets.">
          {data.recentlyUpdated.map(ticket => <article className="dashboard-ticket" key={ticket.id}><div><TicketLink href={ticket.href}>{ticket.ticketNumber}</TicketLink><p>{ticket.summary}</p></div><Badge value={ticket.currentStatus} /><time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt)}</time></article>)}
        </DashboardSection>
        <QuickActions actions={[{ icon: "+", title: "Create Ticket", description: "Submit a new request", href: "/tickets/new" }, { icon: "▤", title: "View My Tickets", description: "Track existing requests", href: "/tickets" }]} />
      </div>
      <DashboardSection title="Recently resolved" viewAll={data.drillDown.recentlyResolved} empty="No recently resolved Tickets.">
        {data.recentlyResolved.map(ticket => <article className="dashboard-ticket" key={ticket.id}><div><TicketLink href={ticket.href}>{ticket.ticketNumber}</TicketLink><p>{ticket.summary}</p></div><Badge value={ticket.currentStatus} /><time dateTime={ticket.resolvedAt}>{formatDate(ticket.resolvedAt)}</time></article>)}
      </DashboardSection>
    </>}
  </section>;
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return <TicketLink href={href} className="dashboard-metric ticket-panel" aria-label={`${label}: ${value}`}><span>{label}</span><strong>{value}</strong><small>View all</small></TicketLink>;
}

export function QuickActions({ actions }: { actions: Array<{ icon: string; title: string; description: string; href: string }> }) {
  return <section className="ticket-panel dashboard-quick-actions" aria-labelledby="quick-actions"><h2 id="quick-actions">Quick Actions</h2><div>{actions.map(action => <TicketLink key={action.title} href={action.href}><span aria-hidden="true">{action.icon}</span><span><strong>{action.title}</strong><small>{action.description}</small></span></TicketLink>)}</div></section>;
}

function DashboardSection({ title, viewAll, empty, children }: { title: string; viewAll: string; empty: string; children: ReactNode }) {
  const hasItems = Array.isArray(children) && children.length > 0;
  const id = `dashboard-${title.replaceAll(" ", "-").toLowerCase()}`;
  return <section className="ticket-panel dashboard-section" aria-labelledby={id}><header><h2 id={id}>{title}</h2><TicketLink href={viewAll}>View all</TicketLink></header>{hasItems ? <div className="dashboard-list">{children}</div> : <p className="dashboard-empty">{empty}</p>}</section>;
}
