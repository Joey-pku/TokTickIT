import { useEffect } from "react";
import { useAuth } from "./AuthContext.js";
import { AppShell } from "./AppShell.js";
import { LoginPage } from "./LoginPage.js";
import { ChangePasswordPage } from "./ChangePasswordPage.js";
import { CreateTicket } from "./CreateTicket.js";
import { MyTickets } from "./MyTickets.js";
import { RequesterTicketDetail } from "./RequesterTicketDetail.js";
import { navigate, usePathname } from "./navigation.js";

function Router() {
  const { state } = useAuth();
  const path = usePathname();

  useEffect(() => {
    if (state === "unauthenticated" && path !== "/login") navigate("/login", true);
    else if (state === "must-change-password" && path !== "/change-password") navigate("/change-password", true);
    else if (state === "authenticated" && path !== "/tickets" && path !== "/tickets/new" && !/^\/tickets\/[^/]+$/.test(path)) navigate("/tickets", true);
  }, [state, path]);

  // Loading splash
  if (state === "loading") {
    return (
      <div className="zen-auth-backdrop">
        <div className="zen-auth-card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--zen-muted)" }}>Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (state === "unauthenticated") return <LoginPage />;

  // Must change password
  if (state === "must-change-password") return <ChangePasswordPage />;

  // Authenticated — route to the right page
  return (
    <AppShell>
      {path === "/tickets/new" ? <CreateTicket /> :
       /^\/tickets\/[^/]+$/.test(path) ? <RequesterTicketDetail key={path} id={Number(path.split("/")[2])} /> :
       <MyTickets />
      }
    </AppShell>
  );
}

export function AuthApp() {
  return <Router />;
}
