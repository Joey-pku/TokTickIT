import { readRequesterId } from "./requester-storage.js";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface DevelopmentRequester { id: number; name: string; department: string }
export interface RelatedSystem { id: number; name: string }

async function getItems<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const response = await fetch(`${API_URL}/api/${path}`, { signal });
  if (!response.ok) throw new Error("Unable to load reference data.");
  const body: { items: T[] } = await response.json();
  return body.items;
}
export const getDevelopmentRequesters = (signal?: AbortSignal) => getItems<DevelopmentRequester>("development-requesters", signal);
export const getCategories = () => getItems<Category>("categories");
export const getRelatedSystems = () => getItems<RelatedSystem>("related-systems");

let requesterRequests = new AbortController();
export function invalidateRequesterRequests(): void {
  requesterRequests.abort();
  requesterRequests = new AbortController();
}

// Future requester-scoped endpoints use the latest testing identity. Public
// reference calls deliberately do not use this helper.
export async function requesterFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const id = readRequesterId();
  if (!id || !/^[0-9]+$/.test(id) || Number(id) <= 0 || !Number.isSafeInteger(Number(id))) {
    throw new Error("Select an active Development Requester first.");
  }
  const headers = new Headers(init.headers);
  headers.set("x-requester-id", id);
  const signal = init.signal ? AbortSignal.any([init.signal, requesterRequests.signal]) : requesterRequests.signal;
  return fetch(`${API_URL}${path}`, { ...init, headers, signal });
}

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const healthResponse = await fetch(`${API_URL}/api/health`);

  if (!healthResponse.ok) {
    throw new Error("Backend health check failed");
  }

  const health = await healthResponse.json();

  if (health.status !== "ok" || health.service !== "TokTickIT API") {
    throw new Error("Backend returned an invalid health response");
  }

  const categories = await getCategories();

  return {
    online: true,
    categories,
  };
}
