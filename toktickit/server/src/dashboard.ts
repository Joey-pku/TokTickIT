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
