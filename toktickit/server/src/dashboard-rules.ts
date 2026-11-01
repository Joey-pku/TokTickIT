export type TicketStatus = "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";

export const activeTicketStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const satisfies readonly TicketStatus[];
export const resolvedTicketStatuses = ["RESOLVED", "CLOSED"] as const satisfies readonly TicketStatus[];

export const isActiveTicketStatus = (status: TicketStatus) => activeTicketStatuses.includes(status as typeof activeTicketStatuses[number]);
export const isResolvedTicketStatus = (status: TicketStatus) => resolvedTicketStatuses.includes(status as typeof resolvedTicketStatuses[number]);
export const newestFirst = <T extends { id: number }>(left: T, right: T, field: (value: T) => Date) =>
  field(right).getTime() - field(left).getTime() || right.id - left.id;
