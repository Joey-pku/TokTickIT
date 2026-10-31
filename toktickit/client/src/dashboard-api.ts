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

export async function getRequesterDashboard(signal?: AbortSignal): Promise<RequesterDashboardData> {
  const response = await apiFetch("/api/dashboard/requester", { signal });
  const body = await response.json();
  if (!response.ok) throw new ApiCallError(response.status, body.error);
  return body;
}
