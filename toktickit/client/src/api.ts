const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export const XRW = "XMLHttpRequest";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface User {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
}
export interface Category { id: number; name: string }
export interface RelatedSystem { id: number; name: string }
export interface SystemStatus { online: boolean; categories: Category[] }
export interface ApiError { code: string; message: string; fields?: Record<string, string> }

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
async function getItems<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const response = await fetch(`${API_URL}/api/${path}`, { signal });
  if (!response.ok) throw new Error("Unable to load reference data.");
  const body: { items: T[] } = await response.json();
  return body.items;
}

export const getCategories = () => getItems<Category>("categories");
export const getRelatedSystems = () => getItems<RelatedSystem>("related-systems");

// Session-cookie–based fetch: always sends credentials + XRW header for mutations.
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    headers.set("X-Requested-With", XRW);
  }
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
}

export class ApiCallError extends Error {
  constructor(public status: number, public error: ApiError) { super(error.message); }
}

async function parseError(res: Response): Promise<never> {
  let body: { error: ApiError };
  try { body = await res.json(); } catch { throw new ApiCallError(res.status, { code: "INTERNAL_ERROR", message: "Server error." }); }
  throw new ApiCallError(res.status, body.error);
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) await parseError(res);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
export async function login(email: string, password: string): Promise<User> {
  const data = await apiJson<{ user: User }>("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<User> {
  const data = await apiJson<{ user: User }>("/api/auth/me");
  return data.user;
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<User> {
  const data = await apiJson<{ user: User; message: string }>("/api/auth/change-password", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  return data.user;
}

// ---------------------------------------------------------------------------
// Legacy — checkSystem still used by App.tsx
// ---------------------------------------------------------------------------
export async function checkSystem(): Promise<SystemStatus> {
  const healthResponse = await fetch(`${API_URL}/api/health`);
  if (!healthResponse.ok) throw new Error("Backend health check failed");
  const health = await healthResponse.json();
  if (health.status !== "ok" || health.service !== "TokTickIT API") throw new Error("Backend returned an invalid health response");
  const categories = await getCategories();
  return { online: true, categories };
}

// ---------------------------------------------------------------------------
// Legacy stubs (removed usage — kept so imports don't break during migration)
// ---------------------------------------------------------------------------
