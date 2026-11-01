import { apiJson } from "./api.js";

export type ActionStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface TicketAction {
  id: number;
  ticketId: number;
  performedById: number;
  performedByName: string;
  assignedToId: number | null;
  assignedToName: string | null;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  status: ActionStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActionAssignee {
  id: number;
  name: string;
  role: "IT_STAFF" | "ADMINISTRATOR";
}

export interface ActionValues {
  assignedToId: number;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  status: ActionStatus;
}

export interface CreateActionBody extends ActionValues { idempotencyKey: string }
export type UpdateActionBody = { version: number } & Partial<ActionValues>;

const json = (method: "POST" | "PATCH", body: object) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const listTicketActions = (ticketId: number, signal?: AbortSignal) =>
  apiJson<{ items: TicketAction[] }>(`/api/tickets/${ticketId}/actions`, { signal });

export const listActionAssignees = (signal?: AbortSignal) =>
  apiJson<{ items: ActionAssignee[] }>("/api/action-assignees", { signal });

export const createTicketAction = (ticketId: number, body: CreateActionBody) =>
  apiJson<TicketAction>(`/api/tickets/${ticketId}/actions`, json("POST", body));

export const updateTicketAction = (ticketId: number, actionId: number, body: UpdateActionBody) =>
  apiJson<TicketAction>(`/api/tickets/${ticketId}/actions/${actionId}`, json("PATCH", body));
