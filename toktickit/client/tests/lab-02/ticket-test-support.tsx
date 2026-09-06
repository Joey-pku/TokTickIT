import { vi } from "vitest";
import * as reference from "../../src/api.js";
import * as tickets from "../../src/ticket-api.js";
export const created = {
  id: 42, ticketNumber: "TKT-2026-000042", summary: "VPN connection failed", description: "The VPN cannot connect after the password reset.",
  requestedPriority: "MEDIUM" as const, currentStatus: "NEW" as const, requesterId: 1, categoryId: 2, relatedSystemId: 1,
  createdAt: "2026-05-12T09:14:00.000Z", updatedAt: "2026-05-12T09:14:00.000Z",
};
export const listed = {
  id: created.id, ticketNumber: created.ticketNumber, summary: created.summary, requestedPriority: created.requestedPriority,
  currentStatus: created.currentStatus, categoryId: 2, categoryName: "Hardware", relatedSystemId: 1, relatedSystemName: "VPN", createdAt: created.createdAt, updatedAt: created.updatedAt,
};
export const detail = { ...created, requesterName: "Jennifer Anderson", categoryName: "Hardware", relatedSystemName: "VPN", attachments: [] };
export const page = { items: [listed], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } };
export function mocks(path: string) {
  vi.restoreAllMocks(); localStorage.clear(); localStorage.setItem("toktickit_selected_requester_id", "1");
  window.history.replaceState({}, "", path);
  vi.spyOn(reference, "getDevelopmentRequesters").mockResolvedValue([
    { id: 1, name: "Jennifer Anderson", department: "Marketing" }, { id: 2, name: "David Lee", department: "Engineering" },
  ]);
  vi.spyOn(reference, "getCategories").mockResolvedValue([{ id: 2, name: "Hardware" }, { id: 3, name: "Software" }]);
  vi.spyOn(reference, "getRelatedSystems").mockResolvedValue([{ id: 1, name: "VPN" }]);
  vi.spyOn(tickets, "createTicket").mockResolvedValue(created);
  vi.spyOn(tickets, "listTickets").mockResolvedValue(page);
  vi.spyOn(tickets, "getTicket").mockResolvedValue(detail);
}

