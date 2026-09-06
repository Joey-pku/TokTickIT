import { useEffect, type ReactNode } from "react";
import App from "./App.js";
import { AppShell } from "./AppShell.js";
import { RequesterProvider, useRequester } from "./RequesterContext.js";
import { RequesterSelector } from "./RequesterSelector.js";
import { navigate, usePathname } from "./navigation.js";
import { readRequesterId } from "./requester-storage.js";
import { CreateTicket } from "./CreateTicket.js";
import { MyTickets } from "./MyTickets.js";
import { RequesterTicketDetail } from "./RequesterTicketDetail.js";

// Keying the scoped subtree by identity discards future local requester caches
// immediately on switching.
export function RequesterGuard({ children }: { children: ReactNode }) {
  const { requester, state } = useRequester();
  useEffect(() => {
    if (readRequesterId() === null || (state === "ready" && !requester)) navigate("/select-requester", true);
  }, [state, requester]);
  if (state !== "ready" || !requester) return <RequesterSelector />;
  return <div key={requester.id}>{children}</div>;
}
function RequesterRoutes() {
  const path = usePathname();
  return <AppShell>{path === "/select-requester"
    ? <RequesterSelector />
    : <RequesterGuard>{path === "/tickets/new" ? <CreateTicket /> : /^\/tickets\/[^/]+$/.test(path) ? <RequesterTicketDetail key={path} id={Number(path.split("/")[2])} /> : <MyTickets />}</RequesterGuard>}
  </AppShell>;
}
export function RequesterApp() {
  const path = usePathname();
  if (path === "/") return <><App /><p className="text-center"><a href="/select-requester" onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate("/select-requester"); } }}>Select Development Requester</a></p></>;
  return <RequesterProvider><RequesterRoutes /></RequesterProvider>;
}
