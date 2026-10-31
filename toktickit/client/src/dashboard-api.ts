import { apiFetch, ApiCallError } from "./api.js";

export interface DashboardUpdatedTicket {
  id: number; ticketNumber: string; summary: string; currentStatus: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH"; updatedAt: string; href: string;
}
export interface DashboardResolvedTicket {
  id: number; ticketNumber: string; summary: string; currentStatus: "RESOLVED" | "CLOSED";
  resolvedAt: string; href: string;
}
export interface RequesterDashboardData {
  metrics: { active: number; waitingForRequester: number };
  recentlyUpdated: DashboardUpdatedTicket[];
  recentlyResolved: DashboardResolvedTicket[];
  drillDown: { active: string; waitingForRequester: string; recentlyUpdated: string; recentlyResolved: string };
}
export interface StaffDashboardData {
  metrics: { unassignedActive: number; ownedByMeActive: number };
  byStatus: Record<"NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED", number>;
  activeByPriority: Record<"LOW" | "MEDIUM" | "HIGH", number>;
  recentUrgent: Array<{ id: number; ticketNumber: string; summary: string; currentStatus: string; itPriority: "HIGH"; ownerId: number | null; updatedAt: string; href: string }>;
  myCurrentActions: Array<{ id: number; ticketId: number; ticketNumber: string; description: string; status: "PLANNED" | "IN_PROGRESS"; updatedAt: string; href: string }>;
  drillDown: { unassignedActive: string; ownedByMeActive: string; recentUrgent: string };
}

export async function getRequesterDashboard(signal?: AbortSignal): Promise<RequesterDashboardData> {
  const response = await apiFetch("/api/dashboard/requester", { signal });
  const body = await response.json();
  if (!response.ok) throw new ApiCallError(response.status, body.error);
  return body;
}

export async function getStaffDashboard(signal?: AbortSignal): Promise<StaffDashboardData> {
  const response = await apiFetch("/api/dashboard/staff", { signal });
  const body = await response.json();
  if (!response.ok) throw new ApiCallError(response.status, body.error);
  return body;
}
