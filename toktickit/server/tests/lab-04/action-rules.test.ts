import { describe, expect, it } from "vitest";
import { canTransitionAction, isEligibleActionAssignee, validateActionValues } from "../../src/actions.js";

const base = {
  assignedToId: 1,
  description: "Inspect the affected service.",
  result: "",
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  status: "PLANNED",
};

describe("Lab 4 Action rules", () => {
  it("UT-ACT-01: applies exact per-field boundaries", () => {
    expect(validateActionValues({ ...base, description: " " }).fields.description).toBeDefined();
    expect(validateActionValues({ ...base, description: "x" }).fields).toEqual({});
    expect(validateActionValues({ ...base, description: "x".repeat(2000) }).fields).toEqual({});
    expect(validateActionValues({ ...base, description: "x".repeat(2001) }).fields.description).toBeDefined();
    expect(validateActionValues({ ...base, result: "" }).fields).toEqual({});
    expect(validateActionValues({ ...base, result: "x".repeat(2001) }).fields.result).toBeDefined();
    expect(validateActionValues({ ...base, status: "COMPLETED", result: " " }).fields.result).toBeDefined();
    expect(validateActionValues({ ...base, status: "COMPLETED", result: "x" }).fields).toEqual({});
    expect(validateActionValues({ ...base, attachmentNotes: "" }).fields.attachmentNotes).toBeDefined();
    expect(validateActionValues({ ...base, attachmentNotes: "x".repeat(2000) }).fields).toEqual({});
    expect(validateActionValues({ ...base, attachmentNotes: "x".repeat(2001) }).fields.attachmentNotes).toBeDefined();
  });

  it("UT-ACT-02: enforces the follow-up truth table", () => {
    expect(validateActionValues({ ...base, followUpRequired: true, followUpNote: null }).fields.followUpNote).toBeDefined();
    expect(validateActionValues({ ...base, followUpRequired: true, followUpNote: "x" }).fields).toEqual({});
    expect(validateActionValues({ ...base, followUpRequired: true, followUpNote: "x".repeat(2001) }).fields.followUpNote).toBeDefined();
    expect(validateActionValues({ ...base, followUpRequired: false, followUpNote: "not allowed" }).fields.followUpNote).toBeDefined();
    expect(validateActionValues({ ...base, followUpRequired: false, followUpNote: null }).values.followUpNote).toBeNull();
  });

  it("UT-ACT-03: implements the complete Action transition matrix", () => {
    const statuses = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
    const allowed = new Set(["PLANNED:IN_PROGRESS", "PLANNED:COMPLETED", "PLANNED:CANCELLED", "IN_PROGRESS:COMPLETED", "IN_PROGRESS:CANCELLED"]);
    for (const from of statuses) for (const to of statuses) expect(canTransitionAction(from, to), `${from} -> ${to}`).toBe(allowed.has(`${from}:${to}`));
  });

  it("UT-ACT-04: recognizes only active staff and administrators as eligible", () => {
    expect(isEligibleActionAssignee({ isActive: true, role: "IT_STAFF" })).toBe(true);
    expect(isEligibleActionAssignee({ isActive: true, role: "ADMINISTRATOR" })).toBe(true);
    expect(isEligibleActionAssignee({ isActive: true, role: "REQUESTER" })).toBe(false);
    expect(isEligibleActionAssignee({ isActive: false, role: "IT_STAFF" })).toBe(false);
  });
});
