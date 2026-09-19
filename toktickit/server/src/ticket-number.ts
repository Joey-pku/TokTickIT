import type { Prisma } from "@prisma/client";

/** Allocate the next number while holding PostgreSQL's row lock until the caller's transaction commits. */
export async function allocateTicketNumber(tx: Prisma.TransactionClient, now: Date): Promise<string> {
  const year = now.getUTCFullYear();
  const [counter] = await tx.$queryRaw<{ lastValue: number }[]>`
    INSERT INTO "TicketNumberCounter" ("year", "lastValue") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE
      SET "lastValue" = "TicketNumberCounter"."lastValue" + 1
    RETURNING "lastValue"`;
  return `TKT-${year}-${String(counter.lastValue).padStart(6, "0")}`;
}

/** Raise counters to existing valid numbers without ever resetting or decreasing them. */
export async function reconcileTicketNumberCounters(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO "TicketNumberCounter" ("year", "lastValue")
    SELECT substring("ticketNumber" from 5 for 4)::integer,
           max(substring("ticketNumber" from 10 for 6)::integer)
    FROM "Ticket"
    WHERE "ticketNumber" ~ '^TKT-[0-9]{4}-[0-9]{6}$'
      AND substring("ticketNumber" from 10 for 6)::integer BETWEEN 1 AND 999999
    GROUP BY substring("ticketNumber" from 5 for 4)::integer
    ON CONFLICT ("year") DO UPDATE
      SET "lastValue" = GREATEST("TicketNumberCounter"."lastValue", EXCLUDED."lastValue")`;
}
