import { vi } from "vitest";
import * as reference from "../../src/api.js";
import * as tickets from "../../src/ticket-api.js";
import type { Ticket, ListedTicket, TicketDetail, TicketPage } from "../../src/ticket-api.js";

export const created: Ticket = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  summary: "VPN connection failed",
  description: "The VPN cannot connect after the password reset.",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "NEW",
  requesterResolved: false,
  requesterResolvedAt: null,
  requesterId: 1,
  ownerId: null,
  categoryId: 2,
  relatedSystemId: 1,
  createdAt: "2026-05-12T09:14:00.000Z",
  updatedAt: "2026-05-12T09:14:00.000Z",
};

export const listed: ListedTicket = {
  id: created.id,
  ticketNumber: created.ticketNumber,
  summary: created.summary,
  requestedPriority: created.requestedPriority,
  itPriority: created.itPriority,
  currentStatus: created.currentStatus,
  requesterResolved: created.requesterResolved,
  requesterResolvedAt: created.requesterResolvedAt,
  categoryId: 2,
  categoryName: "Hardware",
  relatedSystemId: 1,
  relatedSystemName: "VPN",
  createdAt: created.createdAt,
  updatedAt: created.updatedAt,
};

export const detail: TicketDetail = {
  ...created,
  requesterName: "Jennifer Anderson",
  categoryName: "Hardware",
  relatedSystemName: "VPN",
  attachments: [],
  comments: [],
};

export const page: TicketPage = {
  items: [listed],
  pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
};

export function mocks(path: string) {
  vi.restoreAllMocks(); localStorage.clear();
  window.history.replaceState({}, "", path);
  // Provide a mock user instead of development requesters
  vi.spyOn(reference, "getMe").mockResolvedValue({ id: 1, name: "Jennifer Anderson", email: "jen@example.com", role: "REQUESTER", isActive: true, mustChangePassword: false });
  vi.spyOn(reference, "getCategories").mockResolvedValue([{ id: 2, name: "Hardware" }, { id: 3, name: "Software" }]);
  vi.spyOn(reference, "getRelatedSystems").mockResolvedValue([{ id: 1, name: "VPN" }]);
  vi.spyOn(reference, "logout").mockResolvedValue(undefined);
  vi.spyOn(tickets, "createTicket").mockResolvedValue(created);
  vi.spyOn(tickets, "listTickets").mockResolvedValue(page);
  vi.spyOn(tickets, "getTicket").mockResolvedValue(detail);
}

