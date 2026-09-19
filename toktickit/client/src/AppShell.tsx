import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useAuth } from "./AuthContext.js";
import { navigate, usePathname } from "./navigation.js";
import { UserIcon } from "./Icons.js";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, requestPasswordChange } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  function follow(event: MouseEvent<HTMLAnchorElement>, destination: string) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault(); setOpen(false); navigate(destination);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  }

  return <div className="zen-app">
    <header className="zen-header">
      <a className="zen-brand" href="/" onClick={event => follow(event, "/")}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 5v7l4 2M7 13l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
        <span>TokTickIT<small>IT Service Desk</small></span>
      </a>
      <button className="zen-menu-toggle" aria-label="Toggle Navigation" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(value => !value)}>☰</button>
      {open && <button className="zen-backdrop" aria-label="Close Navigation" onClick={() => setOpen(false)} />}
      <nav id="main-navigation" className={`zen-navigation ${open ? "is-open" : ""}`} aria-label="Main navigation">
        <div className="zen-nav-links">
          {/* Requester-facing links */}
          <a href="/tickets" aria-current={path === "/tickets" ? "page" : undefined} onClick={event => follow(event, "/tickets")}>My Tickets</a>
          <a href="/tickets/new" aria-current={path === "/tickets/new" ? "page" : undefined} onClick={event => follow(event, "/tickets/new")}>Create Ticket</a>
          {user && user.role !== "REQUESTER" && <a href="/staff/queue" aria-current={path === "/staff/queue" || path.startsWith("/staff/tickets") ? "page" : undefined} onClick={event => follow(event, "/staff/queue")}>Ticket Queue</a>}
        </div>
        {user && <div className="requester-identity">
          <span className="requester-name" title={user.name}><UserIcon size={16} /> {user.name}</span>
          <span className="zen-role-badge">{user.role.replace("_", " ")}</span>
          <button className="zen-change" onClick={() => { setOpen(false); requestPasswordChange(); }}>Change password</button>
          <button className="zen-change" title="Sign out" aria-label="Sign out" onClick={() => { setOpen(false); handleLogout(); }} disabled={loggingOut}>
            <span className="change-label">{loggingOut ? "Signing out…" : "Sign out"}</span>
            <span className="change-icon" aria-hidden="true">⎋</span>
          </button>
        </div>}
      </nav>
    </header>
    <main className="zen-main">{children}</main>
    <footer className="zen-footer">TokTickIT · IT Service Desk</footer>
  </div>;
}
