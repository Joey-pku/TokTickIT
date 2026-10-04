import { apiJson } from "./api.js";

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
export interface ManagedUser { id: number; name: string; email: string; department: string | null; role: UserRole; isActive: boolean; mustChangePassword: boolean; createdAt: string; updatedAt: string }
export interface UserPage { items: ManagedUser[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }
export interface UserQuery { search?: string; role?: UserRole; sortBy?: string; sortOrder?: "asc" | "desc"; page?: number; pageSize?: number }
export interface UserInput { name: string; email: string; department: string | null; role: UserRole; isActive: boolean }

export function listUsers(query: UserQuery, signal?: AbortSignal) { const params = new URLSearchParams(); Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); }); return apiJson<UserPage>(`/api/admin/users?${params}`, { signal }); }
export const createUser = (input: UserInput & { initialPassword: string }) => apiJson<{ user: ManagedUser }>("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
export const updateUser = (id: number, input: UserInput) => apiJson<{ user: ManagedUser }>(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
export const resetUserPassword = (id: number, initialPassword: string) => apiJson<{ message: string }>(`/api/admin/users/${id}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initialPassword }) });
