import { apiJson } from "./api.js";
import type { Comment, Priority, TicketDetail } from "./ticket-api.js";

export type TicketStatus = "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";
export interface StaffTicket { id: number; ticketNumber: string; summary: string; requesterId: number; requesterName: string; categoryId: number; categoryName: string; requestedPriority: Priority; itPriority: Priority; currentStatus: TicketStatus; ownerId: number | null; ownerName: string | null; requesterResolved: boolean; requesterResolvedAt: string | null; createdAt: string; updatedAt: string }
export interface StaffTicketPage { items: StaffTicket[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }
export interface InternalNote extends Comment {}
export interface StaffTicketDetail extends TicketDetail { requesterEmail: string; ownerName: string | null; internalNotes: InternalNote[] }
export interface StaffUser { id: number; name: string; role: "IT_STAFF" | "ADMINISTRATOR" }
export interface StaffQuery { search?: string; categoryId?: number; status?: string; itPriority?: Priority; requestedPriority?: Priority; ownerId?: number | "unassigned" | "me"; sortBy?: string; sortOrder?: "asc" | "desc"; page?: number; pageSize?: number }

export function listStaffTickets(query: StaffQuery, signal?: AbortSignal) { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value)); return apiJson<StaffTicketPage>(`/api/staff/tickets?${params}`, { signal }); }
export const getStaffTicket = (id: number, signal?: AbortSignal) => apiJson<StaffTicketDetail>(`/api/staff/tickets/${id}`, { signal });
export const getStaffUsers = () => apiJson<{ items: StaffUser[] }>("/api/staff/users");
const patch = <T>(path: string, body: object) => apiJson<T>(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const assignTicket = (id: number, ownerId: number | null) => patch(`/api/staff/tickets/${id}/assign`, { ownerId });
export const updateItPriority = (id: number, itPriority: Priority) => patch(`/api/staff/tickets/${id}/priority`, { itPriority });
export const updateTicketStatus = (id: number, status: TicketStatus) => patch(`/api/staff/tickets/${id}/status`, { status });
export const postInternalNote = (id: number, content: string) => apiJson<InternalNote>(`/api/tickets/${id}/internal-notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
