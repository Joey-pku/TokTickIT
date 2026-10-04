import { useEffect, useState } from "react";
import { Badge, Skeleton, TicketLink, formatDate, useReferences } from "./TicketComponents.js";
import { getStaffUsers, listStaffTickets, type StaffTicket, type StaffQuery, type StaffUser } from "./staff-api.js";

const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const priorities = ["LOW", "MEDIUM", "HIGH"];

function visiblePages(current: number, total: number) {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  return Array.from({ length: Math.min(5, total) }, (_, index) => start + index);
}

export function StaffTicketQueue() {
  const [query, setQuery] = useState<StaffQuery>({ page: 1, pageSize: 10, sortBy: "createdAt", sortOrder: "desc" });
  const [items, setItems] = useState<StaffTicket[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, retry] = useState(0);
  const { categories } = useReferences();

  useEffect(() => { getStaffUsers().then(result => setStaffUsers(result.items)).catch(() => setStaffUsers([])); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState("loading");
      listStaffTickets(query, controller.signal).then(page => {
        setItems(page.items); setTotalPages(page.pagination.totalPages); setTotalItems(page.pagination.totalItems); setState("ready");
      }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    }, query.search ? 300 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, attempt]);

  const update = (values: Partial<StaffQuery>) => setQuery(current => ({ ...current, page: 1, ...values }));
  const currentPage = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const firstItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return <section className="ticket-page staff-queue">
    <div className="ticket-page-heading"><div><p className="ticket-eyebrow">Operations</p><h1>Ticket Queue</h1><p>{totalItems} matching tickets</p></div></div>
    <div className="ticket-panel ticket-toolbar staff-toolbar">
      <label>Search tickets<input className="zen-input" placeholder="Search by ticket number, summary, or requester..." value={query.search ?? ""} onChange={event => update({ search: event.target.value })} /></label>
      <label>Status<select className="zen-input" value={query.status ?? ""} onChange={event => update({ status: event.target.value || undefined })}><option value="">All Statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Category<select className="zen-input" value={query.categoryId ?? ""} onChange={event => update({ categoryId: event.target.value ? Number(event.target.value) : undefined })}><option value="">All Categories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>Requested Priority<select className="zen-input" value={query.requestedPriority ?? ""} onChange={event => update({ requestedPriority: (event.target.value || undefined) as StaffQuery["requestedPriority"] })}><option value="">All Priorities</option>{priorities.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>IT Priority<select className="zen-input" value={query.itPriority ?? ""} onChange={event => update({ itPriority: (event.target.value || undefined) as StaffQuery["itPriority"] })}><option value="">All Priorities</option>{priorities.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Owner<select className="zen-input" value={query.ownerId ?? ""} onChange={event => update({ ownerId: event.target.value ? (Number.isNaN(Number(event.target.value)) ? event.target.value as "me" | "unassigned" : Number(event.target.value)) : undefined })}><option value="">All Tickets</option><option value="unassigned">Unassigned</option><option value="me">Assigned to Me</option>{staffUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label>Sort By<select className="zen-input" value={query.sortBy} onChange={event => update({ sortBy: event.target.value })}><option value="createdAt">Created</option><option value="updatedAt">Updated</option><option value="ticketNumber">Ticket Number</option><option value="itPriority">IT Priority</option><option value="currentStatus">Status</option></select></label>
      <label>Sort Order<select className="zen-input" value={query.sortOrder} onChange={event => update({ sortOrder: event.target.value as "asc" | "desc" })}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
    </div>
    {state === "loading" && <Skeleton label="Loading staff ticket queue..." />}
    {state === "error" && <div className="zen-alert zen-error" role="alert">Unable to load the staff ticket queue. <button onClick={() => retry(value => value + 1)}>Try Again</button></div>}
    {state === "ready" && !items.length && <div className="ticket-panel ticket-empty"><h2>No Matching Tickets</h2><p>Adjust the queue filters and try again.</p></div>}
    {state === "ready" && items.length > 0 && <>
      <div className="table-responsive" data-testid="table-scroll"><table className="ticket-table"><thead><tr><th>Ticket No.</th><th>Created Date</th><th>Requester</th><th>Summary</th><th>Category</th><th>Req Priority</th><th>IT Priority</th><th>Status</th><th>Owner</th><th>Last Updated</th></tr></thead><tbody>{items.map(ticket => <tr key={ticket.id}><td><TicketLink href={`/staff/tickets/${ticket.id}`}>{ticket.ticketNumber}</TicketLink></td><td>{formatDate(ticket.createdAt)}</td><td>{ticket.requesterName}</td><td>{ticket.summary}</td><td>{ticket.categoryName}</td><td><Badge value={ticket.requestedPriority}/></td><td><Badge value={ticket.itPriority}/></td><td><Badge value={ticket.currentStatus}/></td><td>{ticket.ownerName ?? "Unassigned"}</td><td>{formatDate(ticket.updatedAt)}</td></tr>)}</tbody></table></div>
      <div className="ticket-cards staff-cards">{items.map(ticket => <article key={ticket.id}><div className="ticket-card-top"><TicketLink href={`/staff/tickets/${ticket.id}`}>{ticket.ticketNumber}</TicketLink><Badge value={ticket.currentStatus}/></div><h2>{ticket.summary}</h2><p><strong>Category:</strong> {ticket.categoryName}</p><p><strong>IT Priority:</strong> <Badge value={ticket.itPriority}/></p><p><strong>Owner:</strong> {ticket.ownerName ?? "Unassigned"}</p><TicketLink className="zen-button zen-secondary" href={`/staff/tickets/${ticket.id}`}>View Details</TicketLink></article>)}</div>
      <div className="ticket-pagination"><p>Showing {firstItem} to {lastItem} of {totalItems} tickets</p><nav aria-label="Queue pages"><button disabled={currentPage <= 1} onClick={() => setQuery(current => ({ ...current, page: currentPage - 1 }))}>Previous</button>{visiblePages(currentPage, totalPages).map(page => <button key={page} aria-current={page === currentPage ? "page" : undefined} disabled={page === currentPage} onClick={() => setQuery(current => ({ ...current, page }))}>{page}</button>)}<button disabled={currentPage >= totalPages} onClick={() => setQuery(current => ({ ...current, page: currentPage + 1 }))}>Next</button></nav><label>Tickets per page<select className="zen-input" value={pageSize} onChange={event => update({ pageSize: Number(event.target.value) })}>{[10, 25, 50].map(size => <option key={size}>{size}</option>)}</select></label></div>
    </>}
  </section>;
}
