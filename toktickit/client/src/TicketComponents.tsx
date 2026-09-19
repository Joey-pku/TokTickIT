import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { getCategories, getRelatedSystems, type Category, type RelatedSystem } from "./api.js";
import { navigate } from "./navigation.js";
import { LockIcon, UserIcon } from "./Icons.js";
export function TicketLink({ href, children, ...props }: ComponentProps<"a"> & { href: string }) {
  return <a {...props} href={href} onClick={event => { if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(href); } }}>{children}</a>;
}
export function formatDate(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })} ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}
export const Badge = ({ value }: { value: string }) => <span className={`ticket-badge badge-${value.toLowerCase()}`}>{value.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}</span>;
export function ReadOnly({ label, children }: { label: string; children: ReactNode }) { return <div className="ticket-readonly"><span className="ticket-label">{label}</span><div>{label === "Requester" ? <UserIcon size={16} /> : <LockIcon />} {children}</div></div>; }
export function Skeleton({ label }: { label: string }) { return <div role="status" aria-live="polite"><p>{label}</p>{Array.from({ length: 5 }, (_, index) => <div className="ticket-skeleton" key={index} aria-hidden="true" />)}</div>; }
export function useReferences(systems = false) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setSystems] = useState<RelatedSystem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let current = true; setState("loading");
    Promise.all([getCategories(), systems ? getRelatedSystems() : Promise.resolve([])]).then(([c, s]) => {
      if (current) { setCategories(c); setSystems(s); setState("ready"); }
    }).catch(() => { if (current) setState("error"); });
    return () => { current = false; };
  }, [systems, attempt]);
  return { categories, relatedSystems, state, retry: () => retry(value => value + 1) };
}
