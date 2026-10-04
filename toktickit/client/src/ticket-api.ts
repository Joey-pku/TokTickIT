import { apiFetch, ApiCallError } from "./api.js";
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export interface CreateTicketBody { categoryId: number; relatedSystemId: number; requestedPriority: Priority; summary: string; description: string }
export interface Ticket extends CreateTicketBody { id: number; ticketNumber: string; itPriority: Priority; currentStatus: string; requesterResolved: boolean; requesterResolvedAt: string | null; requesterId: number; ownerId: number | null; createdAt: string; updatedAt: string }
export interface ListedTicket extends Omit<Ticket, "description" | "requesterId" | "ownerId"> { categoryName: string; relatedSystemName: string }
export interface Comment { id: number; ticketId: number; authorId: number; authorName: string; authorRole: string; content: string; createdAt: string }
export interface TicketDetail extends Ticket { requesterName: string; categoryName: string; relatedSystemName: string; attachments: { id: number; originalFileName: string; mimeType: string; fileSizeBytes: number; isRemoved: boolean; removedAt: string | null; removalReason: string | null; createdAt: string }[]; comments: Comment[] }
export interface TicketPage { items: ListedTicket[]; pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } }
export interface TicketQuery { search?: string; categoryId?: number; requestedPriority?: Priority; status?: string; sortBy?: "createdAt" | "ticketNumber" | "updatedAt"; sortOrder?: "asc" | "desc"; page?: number; pageSize?: number }
export { ApiCallError as TicketApiError };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  const body = await response.json();
  if (!response.ok) throw new ApiCallError(response.status, body.error);
  return body;
}
export const createTicket = (body: CreateTicketBody, signal?: AbortSignal) => request<Ticket>("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
export function listTickets(query: TicketQuery, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value));
  return request<TicketPage>(`/api/tickets?${params}`, { signal });
}
export const getTicket = (id: number, signal?: AbortSignal) => request<TicketDetail>(`/api/tickets/${id}`, { signal });
export const postComment = (ticketId: number, content: string, signal?: AbortSignal) => request<Comment>(`/api/tickets/${ticketId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }), signal });
export const appearResolved = (ticketId: number, signal?: AbortSignal) => request<{ id: number; ticketNumber: string; requesterResolved: boolean; requesterResolvedAt: string | null; currentStatus: string; message: string }>(`/api/tickets/${ticketId}/appear-resolved`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal });
