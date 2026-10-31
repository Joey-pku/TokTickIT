import { useEffect, useState } from "react";
import { getStaffDashboard, type StaffDashboardData } from "./dashboard-api.js";
import { Badge, formatDate, Skeleton, TicketLink } from "./TicketComponents.js";

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const priorities = ["LOW", "MEDIUM", "HIGH"] as const;
const label = (value: string) => value.toLowerCase().split("_").map(part => part[0].toUpperCase() + part.slice(1)).join(" ");

export function StaffDashboard() {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    getStaffDashboard(controller.signal).then(result => { if (!controller.signal.aborted) { setData(result); setState("ready"); } })
      .catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [attempt]);
  const refresh = () => { if (state !== "loading") { setState("loading"); setAttempt(value => value + 1); } };

  return <section className="ticket-page staff-dashboard" aria-labelledby="staff-dashboard-title">
    <div className="ticket-page-heading"><div><p className="ticket-eyebrow">Operations</p><h1 id="staff-dashboard-title">Staff Dashboard</h1><p>Current service-desk workload at a glance.</p></div><div className="dashboard-heading-actions"><button type="button" className="zen-button zen-secondary" disabled={state === "loading"} onClick={refresh}>{state === "loading" && data ? "Refreshing..." : "Refresh"}</button><TicketLink href="/staff/queue" className="zen-button zen-primary">Open Queue</TicketLink></div></div>
    {state === "loading" && !data && <Skeleton label="Loading staff dashboard..." />}
    {state === "error" && <div className="zen-alert zen-error" role="alert">Unable to load the staff dashboard. {data && "Showing the last successful data."} <button type="button" className="zen-button zen-secondary" onClick={refresh}>Try Again</button></div>}
    {data && <>
      <div className="dashboard-metrics" aria-label="Operational Ticket summary">
        <TicketLink href={data.drillDown.unassignedActive} className="dashboard-metric ticket-panel" aria-label={`${data.metrics.unassignedActive} active unassigned Tickets`}><span>Active unassigned</span><strong>{data.metrics.unassignedActive}</strong><small>Open filtered queue →</small></TicketLink>
        <TicketLink href={data.drillDown.ownedByMeActive} className="dashboard-metric ticket-panel" aria-label={`${data.metrics.ownedByMeActive} active Tickets owned by me`}><span>Owned by me</span><strong>{data.metrics.ownedByMeActive}</strong><small>Open my active Tickets →</small></TicketLink>
      </div>
      <div className="dashboard-summary-grid">
        <section className="ticket-panel dashboard-summary" aria-labelledby="status-summary"><h2 id="status-summary">Tickets by status</h2><div>{statuses.map(status => <TicketLink key={status} href={`/staff/queue?status=${status}`}><span>{label(status)}</span><strong>{data.byStatus[status]}</strong></TicketLink>)}</div></section>
        <section className="ticket-panel dashboard-summary" aria-labelledby="priority-summary"><h2 id="priority-summary">Active IT priority</h2><div>{priorities.map(priority => <TicketLink key={priority} href={`/staff/queue?view=active&itPriority=${priority}`}><span>{label(priority)}</span><strong>{data.activeByPriority[priority]}</strong></TicketLink>)}</div></section>
      </div>
      <section className="ticket-panel dashboard-section" aria-labelledby="recent-urgent"><header><h2 id="recent-urgent">Recent urgent Tickets</h2><TicketLink href={data.drillDown.recentUrgent}>View all</TicketLink></header>{data.recentUrgent.length ? <div className="dashboard-list">{data.recentUrgent.map(ticket => <article className="dashboard-ticket" key={ticket.id}><div><TicketLink href={ticket.href}>{ticket.ticketNumber}</TicketLink><p>{ticket.summary}</p></div><Badge value={ticket.currentStatus}/><Badge value={ticket.itPriority}/><time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt)}</time></article>)}</div> : <p className="dashboard-empty">No active high-priority Tickets.</p>}</section>
      <section className="ticket-panel dashboard-section" aria-labelledby="current-actions"><header><h2 id="current-actions">My current Actions</h2></header>{data.myCurrentActions.length ? <div className="dashboard-list">{data.myCurrentActions.map(action => <article className="dashboard-ticket dashboard-action" key={action.id}><div><TicketLink href={action.href}>{action.ticketNumber}</TicketLink><p>{action.description}</p></div><Badge value={action.status}/><time dateTime={action.updatedAt}>{formatDate(action.updatedAt)}</time></article>)}</div> : <p className="dashboard-empty">No current Actions assigned to you.</p>}</section>
    </>}
  </section>;
}
