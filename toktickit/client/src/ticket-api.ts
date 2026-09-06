import { requesterFetch } from "./api.js";
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export interface CreateTicketBody { categoryId: number; relatedSystemId: number; requestedPriority: Priority; summary: string; description: string }
export interface Ticket extends CreateTicketBody { id: number; ticketNumber: string; currentStatus: string; requesterId: number; createdAt: string; updatedAt: string }
export interface ListedTicket extends Omit<Ticket, "description" | "requesterId"> { categoryName: string; relatedSystemName: string }
export interface TicketDetail extends Ticket { requesterName: string; categoryName: string; relatedSystemName: string; attachments: { id: number; originalFileName: string; mimeType: string; fileSizeBytes: number; isRemoved: boolean; removedAt: string | null; removalReason: string | null; createdAt: string }[] }
export interface TicketPage { items: ListedTicket[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }
export interface TicketQuery { search?: string; categoryId?: number; requestedPriority?: Priority; status?: "NEW"; sortBy?: "createdAt" | "ticketNumber" | "updatedAt"; sortOrder?: "asc" | "desc"; page?: number; pageSize?: number }
export class TicketApiError extends Error {
  constructor(public status: number, public error: { code: string; message: string; fields?: Record<string, string> }) { super(error.message); }
}
async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await requesterFetch(path, init);
  const body = await response.json();
  if (!response.ok) throw new TicketApiError(response.status, body.error);
  return body;
}
export const createTicket = (body: CreateTicketBody, signal?: AbortSignal) => request<Ticket>("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
export function listTickets(query: TicketQuery, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value));
  return request<TicketPage>(`/api/tickets?${params}`, { signal });
}
export const getTicket = (id: number, signal?: AbortSignal) => request<TicketDetail>(`/api/tickets/${id}`, { signal });
