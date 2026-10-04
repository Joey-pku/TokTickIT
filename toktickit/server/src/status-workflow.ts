export const ticketStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
export type TicketStatus = typeof ticketStatuses[number];

const transitions: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "OPEN", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "OPEN", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "OPEN", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

export const isTicketStatus = (value: unknown): value is TicketStatus => typeof value === "string" && ticketStatuses.includes(value as TicketStatus);
export const canTransition = (from: TicketStatus, to: TicketStatus) => from === to || transitions[from].includes(to);
export const nextStatuses = (from: TicketStatus) => transitions[from];
