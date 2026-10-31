import { describe, expect, it } from "vitest";
import { activeTicketStatuses, isActiveTicketStatus, isResolvedTicketStatus, newestFirst, resolvedTicketStatuses } from "../../src/dashboard-rules.js";

describe("requester dashboard rules", () => {
  it("UT-WF-02: defines exact active/resolved predicates and descending timestamp/id ties", () => {
    expect(activeTicketStatuses).toEqual(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"]);
    expect(resolvedTicketStatuses).toEqual(["RESOLVED", "CLOSED"]);
    for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const) {
      expect(isActiveTicketStatus(status)).toBe(activeTicketStatuses.includes(status as never));
      expect(isResolvedTicketStatus(status)).toBe(resolvedTicketStatuses.includes(status as never));
    }
    const same = new Date("2026-10-31T00:00:00.000Z");
    expect([{ id: 1, at: same }, { id: 3, at: same }, { id: 2, at: new Date("2026-10-30T00:00:00.000Z") }].sort((a, b) => newestFirst(a, b, value => value.at)).map(value => value.id)).toEqual([3, 1, 2]);
  });
});
