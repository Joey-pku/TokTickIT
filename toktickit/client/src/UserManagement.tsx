import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ApiCallError } from "./api.js";
import { createUser, listUsers, resetUserPassword, updateUser, type ManagedUser, type UserInput, type UserQuery, type UserRole } from "./admin-api.js";
import { Skeleton } from "./TicketComponents.js";
import { useAuth } from "./AuthContext.js";

const roles: UserRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
const empty: UserInput = { name: "", email: "", department: null, role: "REQUESTER", isActive: true };
const roleLabel = (role: UserRole) => role === "IT_STAFF" ? "IT Staff" : role.charAt(0) + role.slice(1).toLowerCase();
const passwordValid = (value: string) => Array.from(value).length >= 8 && new TextEncoder().encode(value).length <= 72 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^a-zA-Z0-9\s]/.test(value);

function Modal({ title, opener, close, children }: { title: string; opener: HTMLElement | null; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current!; const focusable = () => [...root.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")];
    const focusFrame = requestAnimationFrame(() => focusable()[0]?.focus());
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const list = focusable(), first = list[0], last = list.at(-1); if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    root.addEventListener("keydown", keys); return () => { cancelAnimationFrame(focusFrame); root.removeEventListener("keydown", keys); queueMicrotask(() => opener?.focus()); };
  }, [close, opener]);
  return <div className="admin-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div ref={ref} className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title"><h2 id="admin-dialog-title">{title}</h2>{children}</div></div>;
}

function UserForm({ initial, password, busy, serverError, submit, cancel }: { initial: UserInput; password: boolean; busy: boolean; serverError: string; submit: (input: UserInput, password: string) => Promise<void>; cancel: () => void }) {
  const [form, setForm] = useState(initial), [initialPassword, setPassword] = useState("");
  const [attempted, setAttempted] = useState(false);
  const valid = form.name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && (!password || passwordValid(initialPassword));
  function send(event: FormEvent) { event.preventDefault(); setAttempted(true); if (valid) void submit({ ...form, name: form.name.trim(), email: form.email.trim(), department: form.department?.trim() || null }, initialPassword); }
  return <form onSubmit={send} className="admin-form">
    {serverError && <div className="zen-alert zen-error" role="alert">{serverError}</div>}
    <label htmlFor="admin-name">Full Name *</label><input autoFocus id="admin-name" name="name" className="zen-input" value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} aria-invalid={attempted && form.name.trim().length < 2}/>
    {attempted && form.name.trim().length < 2 && <p className="ticket-field-error">Enter at least 2 characters.</p>}
    <label htmlFor="admin-email">Email Address *</label><input id="admin-email" name="email" type="email" className="zen-input" value={form.email} onChange={event => setForm(value => ({ ...value, email: event.target.value }))}/>
    <label htmlFor="admin-department">Department</label><input id="admin-department" name="department" className="zen-input" value={form.department ?? ""} onChange={event => setForm(value => ({ ...value, department: event.target.value }))}/>
    <label htmlFor="admin-role">Role *</label><select id="admin-role" name="role" className="zen-input" value={form.role} onChange={event => setForm(value => ({ ...value, role: event.target.value as UserRole }))}>{roles.map(role => <option key={role} value={role}>{roleLabel(role)}</option>)}</select>
    <label className="admin-check"><input name="isActive" type="checkbox" checked={form.isActive} onChange={event => setForm(value => ({ ...value, isActive: event.target.checked }))}/> Active Status</label>
    {password && <><label htmlFor="admin-password">Initial Password *</label><input id="admin-password" name="initialPassword" type="password" className="zen-input" value={initialPassword} onChange={event => setPassword(event.target.value)} autoComplete="new-password"/><p className="ticket-hint">8–72 UTF-8 bytes with uppercase, lowercase, number, and symbol. User must change it on first login.</p></>}
    <div className="admin-modal-actions"><button type="button" className="zen-button zen-secondary" onClick={cancel} disabled={busy}>Cancel</button><button type="submit" className="zen-button zen-primary" disabled={busy}>{busy ? "Saving..." : initial === empty ? "Save User" : "Save Changes"}</button></div>
  </form>;
}

export function UserManagement() {
  const { user: currentUser, reload } = useAuth();
  const [query, setQuery] = useState<UserQuery>({ page: 1, pageSize: 10, sortBy: "name", sortOrder: "asc" });
  const [items, setItems] = useState<ManagedUser[]>([]), [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  const [state, setState] = useState<"loading"|"ready"|"error">("loading"), [attempt, retry] = useState(0);
  const [mode, setMode] = useState<"create"|"edit"|"reset"|null>(null), [selected, setSelected] = useState<ManagedUser|null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const opener = useRef<HTMLElement|null>(null);
  const close = () => { setMode(null); setSelected(null); setError(""); };
  const open = (next: "create"|"edit"|"reset", event: React.MouseEvent<HTMLElement>, target?: ManagedUser) => { opener.current = event.currentTarget; setSelected(target ?? null); setError(""); setMode(next); };
  const refresh = () => retry(value => value + 1);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => { setState("loading"); listUsers(query, controller.signal).then(page => { setItems(page.items); setPagination(page.pagination); setState("ready"); }).catch(() => { if (!controller.signal.aborted) setState("error"); }); }, query.search ? 300 : 0); return () => { clearTimeout(timer); controller.abort(); }; }, [query, attempt]);
  const updateQuery = (values: Partial<UserQuery>) => setQuery(current => ({ ...current, page: 1, ...values }));
  async function save(input: UserInput, initialPassword: string) { setBusy(true); setError(""); try { if (mode === "create") await createUser({ ...input, initialPassword }); else if (selected) await updateUser(selected.id, input); const changedSelf = currentUser !== null && selected?.id === currentUser.id && (input.role !== currentUser.role || !input.isActive); setSuccess(mode === "create" ? "User created successfully." : "User updated successfully."); close(); if (changedSelf) reload(); else refresh(); } catch (caught) { setError(caught instanceof ApiCallError ? caught.error.message : "Unable to complete request. Please try again later."); } finally { setBusy(false); } }
  async function resetPassword(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const input = new FormData(event.currentTarget).get("initialPassword"); if (!selected || typeof input !== "string" || !passwordValid(input)) { setError("Password does not meet complexity requirements."); return; } setBusy(true); setError(""); try { await resetUserPassword(selected.id, input); setSuccess("Initial password reset successfully."); close(); refresh(); } catch (caught) { setError(caught instanceof ApiCallError ? caught.error.message : "Unable to complete request. Please try again later."); } finally { setBusy(false); } }
  return <section className="ticket-page admin-users"><div className="ticket-page-heading"><div><h1>User Management</h1><p>Manage accounts, roles, and access.</p></div><button id="open-user-dialog-create" className="zen-button zen-primary" onClick={event => open("create", event)}>+ Create User</button></div>
    {success && <div className="zen-alert zen-success" role="status">{success}</div>}
    <div className="ticket-panel ticket-toolbar admin-toolbar"><label>Search users<input className="zen-input" placeholder="Search users by name or email..." value={query.search ?? ""} onChange={event => updateQuery({ search: event.target.value })}/></label><label>Role<select className="zen-input" value={query.role ?? ""} onChange={event => updateQuery({ role: (event.target.value || undefined) as UserRole|undefined })}><option value="">All Roles</option>{roles.map(role => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label></div>
    {state === "loading" && <Skeleton label="Loading users..."/>}{state === "error" && <div className="zen-alert zen-error" role="alert">Unable to load users. <button onClick={refresh}>Try Again</button></div>}
    {state === "ready" && !items.length && <div className="ticket-panel ticket-empty"><h2>No Users Found</h2><button onClick={() => setQuery({ page: 1, pageSize: 10, sortBy: "name", sortOrder: "asc" })}>Reset Filters</button></div>}
    {state === "ready" && items.length > 0 && <><div className="table-responsive"><table className="ticket-table admin-table"><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th><th>Password</th><th>Actions</th></tr></thead><tbody>{items.map(member => <tr key={member.id}><td>{member.name}</td><td>{member.email}</td><td>{member.department ?? "—"}</td><td><span className="ticket-badge">{roleLabel(member.role)}</span></td><td><span className={`ticket-badge ${member.isActive ? "badge-low" : "badge-high"}`}>{member.isActive ? "Active" : "Inactive"}</span></td><td>{member.mustChangePassword ? "Change required" : "Current"}</td><td><div className="admin-row-actions"><button aria-label={`Edit ${member.name}`} onClick={event => open("edit", event, member)}>Edit</button><button aria-label={`Reset password for ${member.name}`} onClick={event => open("reset", event, member)}>Reset Password</button></div></td></tr>)}</tbody></table></div><div className="ticket-cards admin-cards">{items.map(member => <article key={member.id}><h2>{member.name}</h2><p>{member.email}</p><p>{roleLabel(member.role)} · {member.isActive ? "Active" : "Inactive"}</p><button onClick={event => open("edit", event, member)}>Edit</button><button onClick={event => open("reset", event, member)}>Reset Password</button></article>)}</div><div className="ticket-pagination"><p>Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} users</p><nav><button disabled={pagination.page <= 1} onClick={() => setQuery(value => ({ ...value, page: pagination.page - 1 }))}>Previous</button><button disabled={pagination.page >= pagination.totalPages} onClick={() => setQuery(value => ({ ...value, page: pagination.page + 1 }))}>Next</button></nav><label>Users per page<select value={query.pageSize} onChange={event => updateQuery({ pageSize: Number(event.target.value) })}>{[10,25,50].map(size => <option key={size}>{size}</option>)}</select></label></div></>}
    {mode === "create" && <Modal title="Create User" opener={opener.current} close={close}><UserForm initial={empty} password busy={busy} serverError={error} submit={save} cancel={close}/></Modal>}
    {mode === "edit" && selected && <Modal title="Edit User" opener={opener.current} close={close}><UserForm initial={{ name: selected.name, email: selected.email, department: selected.department, role: selected.role, isActive: selected.isActive }} password={false} busy={busy} serverError={error} submit={save} cancel={close}/></Modal>}
    {mode === "reset" && selected && <Modal title={`Reset Initial Password — ${selected.name}`} opener={opener.current} close={close}><form className="admin-form" onSubmit={resetPassword}>{error && <div className="zen-alert zen-error" role="alert">{error}</div>}<label htmlFor="reset-password">New Temporary Password *</label><input autoFocus id="reset-password" name="initialPassword" type="password" autoComplete="new-password" className="zen-input"/><p className="ticket-hint">The user will be signed out and required to change this password.</p><div className="admin-modal-actions"><button type="button" onClick={close} disabled={busy}>Cancel</button><button type="submit" disabled={busy}>{busy ? "Resetting..." : "Reset Initial Password"}</button></div></form></Modal>}
  </section>;
}
