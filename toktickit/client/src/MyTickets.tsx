import { useEffect, useRef, useState } from "react";
import { listTickets, type TicketPage, type TicketQuery, type Priority } from "./ticket-api.js";
import { Badge, formatDate, Skeleton, TicketLink, useReferences } from "./TicketComponents.js";
const defaults: TicketQuery = { page: 1, pageSize: 10, sortBy: "createdAt", sortOrder: "desc" };
export function MyTickets() {
  const refs = useReferences();
  const [query, setQuery] = useState<TicketQuery>(defaults);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<TicketPage | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const controller = new AbortController(); setState("loading"); setData(null);
    listTickets(query, controller.signal).then(result => {
      if (!controller.signal.aborted) { setData(result); setState("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [query, attempt]);
  function change(patch: TicketQuery) { setQuery(previous => ({ ...previous, ...patch, page: 1 })); }
  function runSearch(value: string) { clearTimeout(timer.current); setQuery(previous => { const { search: _old, ...rest } = previous; return { ...rest, ...(value.trim() ? { search: value.trim() } : {}), page: 1 }; }); }
  function clear() { clearTimeout(timer.current); setSearch(""); setQuery(previous => ({ page: 1, pageSize: previous.pageSize, sortBy: previous.sortBy, sortOrder: previous.sortOrder })); }
  function sort(column: TicketQuery["sortBy"]) { change({ sortBy: column, sortOrder: query.sortBy === column && query.sortOrder === "asc" ? "desc" : "asc" }); }
  const filtered = !!(query.search || query.categoryId || query.requestedPriority || query.status);
  const sortHeader = (label: string, column: TicketQuery["sortBy"]) => <th aria-sort={query.sortBy === column ? query.sortOrder === "asc" ? "ascending" : "descending" : "none"}><button type="button" aria-label={`Sort by ${label}`} onClick={() => sort(column)}>{label} <span aria-hidden="true">{query.sortBy === column ? query.sortOrder === "asc" ? "▲" : "▼" : "↕"}</span></button></th>;
  const page = query.page ?? 1, totalPages = data?.pagination.totalPages ?? 0;
  const pageNumbers = Array.from(new Set([1, page - 1, page, page + 1, totalPages])).filter(n => n > 0 && n <= totalPages).sort((a, b) => a - b);
  return <section className="ticket-page">
    <div className="ticket-page-heading"><div><h1>My Tickets</h1><p>View and track all of your support requests.</p></div><TicketLink href="/tickets/new" className="zen-button zen-primary">+ Create Ticket</TicketLink></div>
    <div className="ticket-toolbar ticket-panel">
      <div className="ticket-search"><label htmlFor="search">Search tickets</label><input id="search" placeholder="Search by ticket # or summary..." value={search} onChange={e => { const value = e.target.value; setSearch(value); clearTimeout(timer.current); timer.current = setTimeout(() => runSearch(value), 300); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); runSearch(search); } }} /></div>
      <div><label htmlFor="filter-category">Category</label><select id="filter-category" value={query.categoryId ?? ""} onChange={e => change({ categoryId: e.target.value ? Number(e.target.value) : undefined })}><option value="">All Categories</option>{refs.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label htmlFor="filter-priority">Requested Priority</label><select id="filter-priority" value={query.requestedPriority ?? ""} onChange={e => change({ requestedPriority: (e.target.value || undefined) as Priority | undefined })}><option value="">All Priorities</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div>
      <div><label htmlFor="filter-status">Current Status</label><select id="filter-status" value={query.status ?? ""} onChange={e => change({ status: e.target.value ? "NEW" : undefined })}><option value="">All Statuses</option><option value="NEW">New</option></select></div>
      <button className="zen-button zen-secondary" onClick={clear}><span aria-hidden="true">↻ </span>Clear Filters</button>
    </div>
    {refs.state === "error" && <div className="zen-alert zen-error" role="alert">Unable to load categories. <button className="zen-button zen-secondary" onClick={refs.retry}>Retry</button></div>}
    <div className="ticket-mobile-sort"><label>Sort tickets by<select value={query.sortBy} onChange={e => change({ sortBy: e.target.value as TicketQuery["sortBy"] })}><option value="createdAt">Created Date</option><option value="ticketNumber">Ticket No.</option><option value="updatedAt">Last Updated</option></select></label><label>Sort direction<select value={query.sortOrder} onChange={e => change({ sortOrder: e.target.value as "asc" | "desc" })}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label></div>
    {state === "loading" && <Skeleton label="Loading tickets..." />}
    {state === "error" && <div className="ticket-panel zen-error" role="alert"><p>Unable to load tickets from the server. Please check your network connection.</p><button className="zen-button zen-secondary" onClick={() => setAttempt(value => value + 1)}>Try Again</button></div>}
    {state === "ready" && data && <>
      {!data.items.length ? <div className="ticket-panel ticket-empty"><span className="ticket-empty-icon" aria-hidden="true">{filtered ? "⌕" : "▤"}</span><h2>{filtered ? "No Matching Tickets" : "No Tickets Found"}</h2><p>{filtered ? "No tickets match your search or filter criteria. Try adjusting your filters or search term." : "You haven't submitted any support tickets yet. Create your first ticket to get started."}</p>{filtered ? <button className="zen-button zen-secondary" onClick={clear}>Clear Filters</button> : <TicketLink className="zen-button zen-primary" href="/tickets/new">+ Create Your First Ticket</TicketLink>}</div> : <>
        <div className="ticket-table-wrap"><table className="ticket-table"><thead><tr>{sortHeader("Ticket No.", "ticketNumber")}{sortHeader("Created Date", "createdAt")}<th>Summary</th><th>Category</th><th>Requested Priority</th><th>Current Status</th>{sortHeader("Last Updated", "updatedAt")}</tr></thead><tbody>{data.items.map(ticket => <tr key={ticket.id}><td><TicketLink href={`/tickets/${ticket.id}`}>{ticket.ticketNumber}</TicketLink></td><td>{formatDate(ticket.createdAt)}</td><td title={ticket.summary}>{ticket.summary.length > 45 ? `${ticket.summary.slice(0, 45)}…` : ticket.summary}</td><td>{ticket.categoryName}</td><td><Badge value={ticket.requestedPriority} /></td><td><Badge value={ticket.currentStatus} /></td><td>{formatDate(ticket.updatedAt)}</td></tr>)}</tbody></table></div>
        <div className="ticket-cards">{data.items.map(ticket => <article className="ticket-panel" key={ticket.id}><div className="ticket-card-top"><TicketLink href={`/tickets/${ticket.id}`}>{ticket.ticketNumber}</TicketLink><Badge value={ticket.currentStatus} /></div><p>{ticket.summary}</p><p className="ticket-hint">{ticket.categoryName}</p><div className="ticket-card-bottom"><Badge value={ticket.requestedPriority} /><time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time><TicketLink href={`/tickets/${ticket.id}`}>View Details →</TicketLink></div></article>)}</div>
      </>}
      <div className="ticket-pagination"><p>Showing {data.items.length ? (page - 1) * (query.pageSize ?? 10) + 1 : 0} to {data.items.length ? (page - 1) * (query.pageSize ?? 10) + data.items.length : 0} of {data.pagination.totalItems} tickets</p><label>Tickets per page<select value={query.pageSize} onChange={e => change({ pageSize: Number(e.target.value) })}>{[10, 25, 50].map(n => <option key={n}>{n}</option>)}</select></label><nav aria-label="Ticket pages"><button className="zen-button zen-secondary" disabled={page <= 1} onClick={() => setQuery(q => ({ ...q, page: page - 1 }))}>Previous</button>{pageNumbers.map(n => <button className={`zen-button ${n === page ? "zen-primary" : "zen-secondary"}`} aria-current={n === page ? "page" : undefined} aria-label={`Page ${n}`} key={n} onClick={() => setQuery(q => ({ ...q, page: n }))}>{n}</button>)}<button className="zen-button zen-secondary" disabled={page >= totalPages} onClick={() => setQuery(q => ({ ...q, page: page + 1 }))}>Next</button></nav></div>
    </>}
  </section>;
}
