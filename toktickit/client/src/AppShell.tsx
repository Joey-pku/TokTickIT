import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { useAuth } from "./AuthContext.js";
import { BrandMark } from "./BrandMark.js";
import { navigate, usePathname } from "./navigation.js";
import { UserIcon } from "./Icons.js";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, requestPasswordChange } = useAuth();
  const path = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const focusFirstActionRef = useRef(false);

  useEffect(() => {
    if (profileOpen && focusFirstActionRef.current) {
      focusFirstActionRef.current = false;
      firstActionRef.current?.focus();
    }
  }, [profileOpen]);

  useEffect(() => {
    function dismissOnOutsideClick(event: PointerEvent) {
      if (profileOpen && !profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    function dismissOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setNavigationOpen(false);
      if (profileOpen) {
        setProfileOpen(false);
        profileTriggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismissOnOutsideClick);
    window.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsideClick);
      window.removeEventListener("keydown", dismissOnEscape);
    };
  }, [profileOpen]);

  function follow(event: MouseEvent<HTMLAnchorElement>, destination: string) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault(); setNavigationOpen(false); navigate(destination);
  }

  function toggleProfile(event: KeyboardEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>) {
    const shouldFocusAction = "key" in event && event.key === "ArrowDown";
    if ("key" in event && event.key !== "ArrowDown") return;
    event.preventDefault();
    focusFirstActionRef.current = shouldFocusAction;
    setProfileOpen(value => !value);
  }

  async function handleLogout() {
    setProfileOpen(false);
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  }

  return <div className="zen-app">
    <header className="zen-header">
      <a className="zen-brand" href="/" onClick={event => follow(event, "/")}>
        <BrandMark />
        <span>TokTickIT<small>IT Service Desk</small></span>
      </a>
      <button className="zen-menu-toggle" aria-label="Toggle Navigation" aria-expanded={navigationOpen} aria-controls="main-navigation" onClick={() => setNavigationOpen(value => !value)}>☰</button>
      {navigationOpen && <button className="zen-backdrop" aria-label="Close navigation" onClick={() => setNavigationOpen(false)} />}
      <nav id="main-navigation" className={`zen-navigation ${navigationOpen ? "is-open" : ""}`} aria-label="Main navigation">
        <div className="zen-nav-links">
          <a href="/tickets" aria-current={path === "/tickets" ? "page" : undefined} onClick={event => follow(event, "/tickets")}>My Tickets</a>
          <a href="/tickets/new" aria-current={path === "/tickets/new" ? "page" : undefined} onClick={event => follow(event, "/tickets/new")}>Create Ticket</a>
          {user && user.role !== "REQUESTER" && <a href="/staff/queue" aria-current={path === "/staff/queue" || path.startsWith("/staff/tickets") ? "page" : undefined} onClick={event => follow(event, "/staff/queue")}>Ticket Queue</a>}
          {user?.role === "ADMINISTRATOR" && <a href="/admin/users" aria-current={path === "/admin/users" ? "page" : undefined} onClick={event => follow(event, "/admin/users")}>User Management</a>}
        </div>
      </nav>
      {user && <div className="zen-profile" ref={profileRef}>
        <button ref={profileTriggerRef} type="button" className="zen-profile-trigger" aria-label="Open profile menu" aria-haspopup="menu" aria-expanded={profileOpen} aria-controls="profile-menu" onClick={toggleProfile} onKeyDown={toggleProfile}>
          <UserIcon size={22} />
        </button>
        {profileOpen && <div id="profile-menu" className="zen-profile-menu" role="menu" aria-label="Profile menu">
          <div className="zen-profile-summary">
            <strong title={user.name}>{user.name}</strong>
            <span className="zen-role-badge">{user.role.replace("_", " ")}</span>
          </div>
          <button ref={firstActionRef} type="button" role="menuitem" onClick={() => { setProfileOpen(false); requestPasswordChange(); }}>Change Password</button>
          <button type="button" role="menuitem" className="zen-profile-logout" onClick={() => void handleLogout()} disabled={loggingOut}>{loggingOut ? "Logging out…" : "Logout"}</button>
        </div>}
      </div>}
    </header>
    <main className="zen-main">{children}</main>
    <footer className="zen-footer">TokTickIT · IT Service Desk</footer>
  </div>;
}
