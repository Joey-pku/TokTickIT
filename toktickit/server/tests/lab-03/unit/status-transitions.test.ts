import { describe, expect, it } from "vitest";
import { canTransition, ticketStatuses } from "../../../src/status-workflow.js";

describe("ticket status transition matrix", () => {
  it("UT-WF-01: implements every allowed and rejected ordered status pair", () => {
    const allowed = new Set([
      "NEW:NEW", "NEW:OPEN", "NEW:IN_PROGRESS", "NEW:CANCELLED",
      "OPEN:OPEN", "OPEN:IN_PROGRESS", "OPEN:WAITING_FOR_REQUESTER", "OPEN:RESOLVED", "OPEN:CANCELLED",
      "IN_PROGRESS:IN_PROGRESS", "IN_PROGRESS:OPEN", "IN_PROGRESS:WAITING_FOR_REQUESTER", "IN_PROGRESS:RESOLVED", "IN_PROGRESS:CANCELLED",
      "WAITING_FOR_REQUESTER:WAITING_FOR_REQUESTER", "WAITING_FOR_REQUESTER:OPEN", "WAITING_FOR_REQUESTER:IN_PROGRESS", "WAITING_FOR_REQUESTER:RESOLVED", "WAITING_FOR_REQUESTER:CANCELLED",
      "RESOLVED:RESOLVED", "RESOLVED:CLOSED", "RESOLVED:REOPENED", "CLOSED:CLOSED", "CLOSED:REOPENED",
      "REOPENED:REOPENED", "REOPENED:OPEN", "REOPENED:IN_PROGRESS", "REOPENED:RESOLVED", "REOPENED:CANCELLED", "CANCELLED:CANCELLED",
    ]);
    for (const from of ticketStatuses) for (const to of ticketStatuses) expect(canTransition(from, to), `${from} -> ${to}`).toBe(allowed.has(`${from}:${to}`));
  });
  it("UNIT-STAT-01: permits documented transitions", () => {
    for (const [from, to] of [["NEW","OPEN"],["OPEN","IN_PROGRESS"],["IN_PROGRESS","WAITING_FOR_REQUESTER"],["WAITING_FOR_REQUESTER","RESOLVED"],["RESOLVED","CLOSED"],["CLOSED","REOPENED"],["REOPENED","CANCELLED"]] as const) expect(canTransition(from, to)).toBe(true);
  });
  it("UNIT-STAT-02: CANCELLED is terminal", () => { for (const status of ticketStatuses.filter(s => s !== "CANCELLED")) expect(canTransition("CANCELLED", status)).toBe(false); });
  it("UNIT-STAT-03: every same-status submission is a no-op", () => { for (const status of ticketStatuses) expect(canTransition(status, status)).toBe(true); });
});
