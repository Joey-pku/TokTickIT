import { afterAll, describe, expect, it } from "vitest";
import { seed } from "../../prisma/seed-data.js";
import { getPrisma } from "../../src/prisma.js";

const db = getPrisma();

describe("Feature 16 migration and seed contract", () => {
  afterAll(() => db.$disconnect());

  it("MIG-02/03/04: exposes constrained Action relations and Ticket workflow defaults/backfill", async () => {
    const columns = await db.$queryRaw<Array<{ column_name: string; is_nullable: string; column_default: string | null }>>`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Ticket'
        AND column_name IN ('workflowVersion', 'resolvedAt')
      ORDER BY column_name`;
    expect(columns.map(value => value.column_name)).toEqual(["resolvedAt", "workflowVersion"]);
    expect(columns.find(value => value.column_name === "workflowVersion")).toMatchObject({ is_nullable: "NO" });

    const legacyResolved = await db.ticket.findMany({ where: { currentStatus: { in: ["RESOLVED", "CLOSED"] } }, select: { resolvedAt: true, workflowVersion: true } });
    expect(legacyResolved.every(value => value.resolvedAt !== null && value.workflowVersion === 1)).toBe(true);
    const zeroActionTicket = await db.ticket.findFirstOrThrow({ where: { seedKey: "seed:ticket:1" }, include: { actions: true } });
    expect(zeroActionTicket.actions).toEqual([]); expect(zeroActionTicket.workflowVersion).toBe(1);
  });

  it("MIG-05: creates deterministic zero/one/many Action examples without revisions", async () => {
    await seed(db);
    const tickets = await db.ticket.findMany({ where: { seedKey: { in: ["seed:ticket:1", "seed:ticket:2", "seed:ticket:3"] } }, select: { seedKey: true, actions: { select: { id: true, status: true, revisions: true } } } });
    const byKey = new Map(tickets.map(value => [value.seedKey, value.actions]));
    expect(byKey.get("seed:ticket:1")).toHaveLength(0);
    expect(byKey.get("seed:ticket:2")).toHaveLength(4);
    expect(byKey.get("seed:ticket:3")).toHaveLength(1);
    expect(new Set(tickets.flatMap(value => value.actions.map(action => action.status)))).toEqual(new Set(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]));
    expect(tickets.flatMap(value => value.actions).every(action => action.revisions.length === 0)).toBe(true);
  });

  it("MIG-05: seed reruns restore missing rows but never overwrite modified Actions", async () => {
    await seed(db);
    const key = "10000000-0000-4000-8000-000000000001";
    const original = await db.ticketAction.findUniqueOrThrow({ where: { idempotencyKey: key } });
    const modified = "User-modified seed Action must survive rerun.";
    try {
      await db.ticketAction.update({ where: { idempotencyKey: key }, data: { description: modified } });
      await db.ticketAction.delete({ where: { idempotencyKey: "10000000-0000-4000-8000-000000000004" } });
      await seed(db); await seed(db);
      expect((await db.ticketAction.findUniqueOrThrow({ where: { idempotencyKey: key } })).description).toBe(modified);
      expect(await db.ticketAction.count({ where: { idempotencyKey: { in: [
        "10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000002",
        "10000000-0000-4000-8000-000000000003", "10000000-0000-4000-8000-000000000004",
        "10000000-0000-4000-8000-000000000005",
      ] } } })).toBe(5);
    } finally {
      await db.ticketAction.update({ where: { idempotencyKey: key }, data: {
        description: original.description, result: original.result, followUpRequired: original.followUpRequired,
        followUpNote: original.followUpNote, attachmentNotes: original.attachmentNotes, status: original.status,
        assignedToId: original.assignedToId, version: original.version, createdAt: original.createdAt, updatedAt: original.updatedAt,
      } });
    }
  });
});
