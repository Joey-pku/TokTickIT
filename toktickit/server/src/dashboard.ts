import { Router } from "express";
import { requireAuth, requireRole } from "./auth.js";
import { getPrisma } from "./prisma.js";
import { sendError } from "./errors.js";
import { activeTicketStatuses, resolvedTicketStatuses } from "./dashboard-rules.js";

export const dashboard = Router();
dashboard.use(requireAuth);

const updatedSelect = { id: true, ticketNumber: true, summary: true, currentStatus: true, requestedPriority: true, updatedAt: true } as const;
const resolvedSelect = { id: true, ticketNumber: true, summary: true, currentStatus: true, resolvedAt: true } as const;

dashboard.get("/requester", requireRole("REQUESTER"), async (_req, res) => {
  try {
    const requesterId = res.locals.userId;
    const result = await getPrisma().$transaction(async tx => {
      const owned = { requesterId } as const;
      const [active, waitingForRequester, recentlyUpdated, recentlyResolved] = await Promise.all([
        tx.ticket.count({ where: { ...owned, currentStatus: { in: [...activeTicketStatuses] } } }),
        tx.ticket.count({ where: { ...owned, currentStatus: "WAITING_FOR_REQUESTER" } }),
        tx.ticket.findMany({ where: owned, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: updatedSelect }),
        tx.ticket.findMany({ where: { ...owned, currentStatus: { in: [...resolvedTicketStatuses] }, resolvedAt: { not: null } }, orderBy: [{ resolvedAt: "desc" }, { id: "desc" }], take: 5, select: resolvedSelect }),
      ]);
      return { active, waitingForRequester, recentlyUpdated, recentlyResolved };
    }, { isolationLevel: "RepeatableRead" });
    res.json({
      metrics: { active: result.active, waitingForRequester: result.waitingForRequester },
      recentlyUpdated: result.recentlyUpdated.map(ticket => ({ ...ticket, href: `/tickets/${ticket.id}` })),
      recentlyResolved: result.recentlyResolved.map(ticket => ({ ...ticket, href: `/tickets/${ticket.id}` })),
      drillDown: {
        active: "/tickets?view=active",
        waitingForRequester: "/tickets?status=WAITING_FOR_REQUESTER",
        recentlyUpdated: "/tickets?sortBy=updatedAt&sortOrder=desc",
        recentlyResolved: "/tickets?view=resolved",
      },
    });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});

const allStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const allPriorities = ["LOW", "MEDIUM", "HIGH"] as const;

dashboard.get("/staff", requireRole("IT_STAFF"), async (_req, res) => {
  try {
    const userId = res.locals.userId;
    const result = await getPrisma().$transaction(async tx => {
      const active = { currentStatus: { in: [...activeTicketStatuses] } };
      const [unassignedActive, ownedByMeActive, statusCounts, priorityCounts, recentUrgent, myCurrentActions] = await Promise.all([
        tx.ticket.count({ where: { ...active, ownerId: null } }),
        tx.ticket.count({ where: { ...active, ownerId: userId } }),
        Promise.all(allStatuses.map(status => tx.ticket.count({ where: { currentStatus: status } }))),
        Promise.all(allPriorities.map(itPriority => tx.ticket.count({ where: { ...active, itPriority } }))),
        tx.ticket.findMany({ where: { ...active, itPriority: "HIGH" }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, ticketNumber: true, summary: true, currentStatus: true, itPriority: true, ownerId: true, updatedAt: true } }),
        tx.ticketAction.findMany({ where: { assignedToId: userId, status: { in: ["PLANNED", "IN_PROGRESS"] } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, ticketId: true, description: true, status: true, updatedAt: true, ticket: { select: { ticketNumber: true } } } }),
      ]);
      const byStatus = Object.fromEntries(allStatuses.map((status, index) => [status, statusCounts[index]]));
      const activeByPriority = Object.fromEntries(allPriorities.map((priority, index) => [priority, priorityCounts[index]]));
      return { unassignedActive, ownedByMeActive, byStatus, activeByPriority, recentUrgent, myCurrentActions };
    }, { isolationLevel: "RepeatableRead" });
    res.json({
      metrics: { unassignedActive: result.unassignedActive, ownedByMeActive: result.ownedByMeActive },
      byStatus: result.byStatus,
      activeByPriority: result.activeByPriority,
      recentUrgent: result.recentUrgent.map(ticket => ({ ...ticket, href: `/staff/tickets/${ticket.id}` })),
      myCurrentActions: result.myCurrentActions.map(({ ticket, ...action }) => ({ ...action, ticketNumber: ticket.ticketNumber, href: `/staff/tickets/${action.ticketId}#action-${action.id}` })),
      drillDown: { unassignedActive: "/staff/queue?view=active&ownerId=unassigned", ownedByMeActive: "/staff/queue?view=active&ownerId=me", recentUrgent: "/staff/queue?view=active&itPriority=HIGH" },
    });
  } catch { sendError(res, "INTERNAL_ERROR"); }
});
