import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getDevelopmentRequesters, invalidateRequesterRequests, type DevelopmentRequester } from "./api.js";
import { readRequesterId, writeRequesterId } from "./requester-storage.js";
import { navigate } from "./navigation.js";

type LoadState = "loading" | "ready" | "error";
interface Context {
  requesters: DevelopmentRequester[];
  requester: DevelopmentRequester | null;
  state: LoadState;
  retry: () => void;
  select: (id: number) => void;
  change: () => void;
}
const RequesterContext = createContext<Context | null>(null);
export function RequesterProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState(readRequesterId);
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState("loading");
    getDevelopmentRequesters(controller.signal).then(items => {
      if (!active) return;
      setRequesters(items);
      const persisted = readRequesterId();
      if (persisted !== null && !items.some(item => String(item.id) === persisted)) {
        writeRequesterId(null);
        invalidateRequesterRequests();
        setSelectedId(null);
        navigate("/select-requester", true);
      }
      setState("ready");
    }).catch(() => { if (active) setState("error"); });
    return () => { active = false; controller.abort(); };
  }, [attempt]);
  const requester = state === "ready" ? requesters.find(item => String(item.id) === selectedId) ?? null : null;
  function select(id: number) {
    if (state !== "ready" || !requesters.some(item => item.id === id)) return;
    invalidateRequesterRequests();
    writeRequesterId(id);
    setSelectedId(String(id));
    navigate("/tickets");
  }
  function change() {
    invalidateRequesterRequests();
    writeRequesterId(null);
    setSelectedId(null);
    navigate("/select-requester");
  }
  return <RequesterContext.Provider value={{ requesters, requester, state, retry: () => setAttempt(value => value + 1), select, change }}>{children}</RequesterContext.Provider>;
}
export function useRequester(): Context {
  const context = useContext(RequesterContext);
  if (!context) throw new Error("RequesterProvider is required.");
  return context;
}
