import { describe, expect, it } from "vitest";
import { canTransition, ticketStatuses } from "../../../src/status-workflow.js";

describe("ticket status transition matrix", () => {
  it("UNIT-STAT-01: permits documented transitions", () => {
    for (const [from, to] of [["NEW","OPEN"],["OPEN","IN_PROGRESS"],["IN_PROGRESS","WAITING_FOR_REQUESTER"],["WAITING_FOR_REQUESTER","RESOLVED"],["RESOLVED","CLOSED"],["CLOSED","REOPENED"],["REOPENED","CANCELLED"]] as const) expect(canTransition(from, to)).toBe(true);
  });
  it("UNIT-STAT-02: CANCELLED is terminal", () => { for (const status of ticketStatuses.filter(s => s !== "CANCELLED")) expect(canTransition("CANCELLED", status)).toBe(false); });
  it("UNIT-STAT-03: every same-status submission is a no-op", () => { for (const status of ticketStatuses) expect(canTransition(status, status)).toBe(true); });
});
