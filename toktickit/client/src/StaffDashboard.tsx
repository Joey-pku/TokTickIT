import { useEffect, useRef, useState } from "react";
import { getStaffDashboard, type StaffDashboardData } from "./dashboard-api.js";
import { Badge, formatDate, Skeleton, TicketLink } from "./TicketComponents.js";
import { QuickActions } from "./RequesterDashboard.js";

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const priorities = ["LOW", "MEDIUM", "HIGH"] as const;
const label = (value: string) => value.toLowerCase().split("_").map(part => part[0].toUpperCase() + part.slice(1)).join(" ");

export function StaffDashboard({ displayName }: { displayName?: string }) {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [refreshNotice, setRefreshNotice] = useState("");
  const refreshRequested = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    getStaffDashboard(controller.signal).then(result => { if (!controller.signal.aborted) { setData(result); setState("ready"); if (refreshRequested.current) { refreshRequested.current = false; setRefreshNotice("Dashboard updated."); } } })
      .catch(() => { if (!controller.signal.aborted) { refreshRequested.current = false; setState("error"); } });
    return () => controller.abort();
  }, [attempt]);
  const refresh = () => { if (state !== "loading") { refreshRequested.current = true; setRefreshNotice(""); setState("loading"); setAttempt(value => value + 1); } };
  const name = displayName?.trim() || "there";

  return <section className="ticket-page staff-dashboard" aria-labelledby="staff-dashboard-title">
    <div className="ticket-page-heading dashboard-welcome"><div><h1 id="staff-dashboard-title">Welcome back, {name}!</h1><p>Here's what's happening with your queue today.</p></div><div className="dashboard-refresh"><button type="button" className="zen-button zen-secondary" disabled={state === "loading"} onClick={refresh}>{state === "loading" && data && <span className="zen-spinner ticket-inline-spinner" aria-hidden="true" />}{state === "loading" && data ? "Refreshing..." : "Refresh"}</button><span className="dashboard-refresh-status" role="status">{refreshNotice}</span></div></div>
    {state === "loading" && !data && <Skeleton label="Loading staff dashboard..." />}
    {state === "error" && <div className="zen-alert zen-error" role="alert">Unable to load the staff dashboard. {data && "Showing the last successful data."} <button type="button" className="zen-button zen-secondary" onClick={refresh}>Try Again</button></div>}
    {data && <>
      <div className="dashboard-metrics dashboard-metrics-staff" aria-label="Operational Ticket summary">
        <PrimaryMetric label="New Tickets" value={data.byStatus.NEW} href="/staff/queue?status=NEW" />
        <PrimaryMetric label="Open Tickets" value={data.byStatus.OPEN} href="/staff/queue?status=OPEN" />
        <PrimaryMetric label="In Progress" value={data.byStatus.IN_PROGRESS} href="/staff/queue?status=IN_PROGRESS" />
        <PrimaryMetric label="Waiting for Requester" value={data.byStatus.WAITING_FOR_REQUESTER} href="/staff/queue?status=WAITING_FOR_REQUESTER" />
        <PrimaryMetric label="My Assigned Active" value={data.metrics.ownedByMeActive} href={data.drillDown.ownedByMeActive} />
      </div>
      <TicketLink href={data.drillDown.unassignedActive} className="dashboard-attention ticket-panel" aria-label={`${data.metrics.unassignedActive} active unassigned Tickets`}><span><strong>{data.metrics.unassignedActive}</strong> Active unassigned Tickets</span><small>View unassigned Tickets →</small></TicketLink>
      <div className="dashboard-main-grid">
        <section className="ticket-panel dashboard-section" aria-labelledby="recent-urgent"><header><h2 id="recent-urgent">Recent / Urgent Tickets</h2><TicketLink href={data.drillDown.recentUrgent}>View all</TicketLink></header>{data.recentUrgent.length ? <div className="dashboard-list">{data.recentUrgent.map(ticket => <article className="dashboard-ticket" key={ticket.id}><div><TicketLink href={ticket.href}>{ticket.ticketNumber}</TicketLink><p>{ticket.summary}</p></div><Badge value={ticket.currentStatus}/><Badge value={ticket.itPriority}/><time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt)}</time></article>)}</div> : <p className="dashboard-empty">No active high-priority Tickets.</p>}</section>
        <QuickActions actions={[{ icon: "+", title: "Create Ticket", description: "Open the Ticket form", href: "/tickets/new" }, { icon: "⌕", title: "Search Tickets", description: "Search the full Ticket queue", href: "/staff/queue" }, { icon: "✓", title: "My Queue", description: "View my assigned active Tickets", href: data.drillDown.ownedByMeActive }]} />
      </div>
      <section className="ticket-panel dashboard-section" aria-labelledby="current-actions"><header><h2 id="current-actions">My Current Actions Taken</h2></header>{data.myCurrentActions.length ? <div className="dashboard-list">{data.myCurrentActions.map(action => <article className="dashboard-ticket dashboard-action" key={action.id}><div><TicketLink href={action.href}>{action.ticketNumber}</TicketLink><p>{action.description}</p></div><Badge value={action.status}/><time dateTime={action.updatedAt}>{formatDate(action.updatedAt)}</time></article>)}</div> : <p className="dashboard-empty">No current Actions assigned to you.</p>}</section>
      <details className="ticket-panel dashboard-secondary-stats">
        <summary>Additional dashboard statistics</summary>
        <div className="dashboard-summary-grid">
          <section className="dashboard-summary" aria-labelledby="status-summary"><h2 id="status-summary">Tickets by status</h2><div>{statuses.map(status => <TicketLink key={status} href={`/staff/queue?status=${status}`}><span>{label(status)}</span><strong>{data.byStatus[status]}</strong></TicketLink>)}</div></section>
          <section className="dashboard-summary" aria-labelledby="priority-summary"><h2 id="priority-summary">Active IT priority</h2><div>{priorities.map(priority => <TicketLink key={priority} href={`/staff/queue?view=active&itPriority=${priority}`}><span>{label(priority)}</span><strong>{data.activeByPriority[priority]}</strong></TicketLink>)}</div></section>
        </div>
      </details>
    </>}
  </section>;
}

function PrimaryMetric({ label: metricLabel, value, href }: { label: string; value: number; href: string }) {
  return <TicketLink href={href} className="dashboard-metric ticket-panel" aria-label={`${metricLabel}: ${value}`}><span>{metricLabel}</span><strong>{value}</strong><small>View all</small></TicketLink>;
}
