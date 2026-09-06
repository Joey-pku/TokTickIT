CREATE TABLE "TicketNumberCounter" (
    "year" INTEGER NOT NULL PRIMARY KEY,
    "lastValue" INTEGER NOT NULL CHECK ("lastValue" BETWEEN 1 AND 999999)
);

-- Preserve numbering when upgrading a database containing valid ticket numbers.
INSERT INTO "TicketNumberCounter" ("year", "lastValue")
SELECT substring("ticketNumber" from 5 for 4)::integer,
       max(substring("ticketNumber" from 10 for 6)::integer)
FROM "Ticket"
WHERE "ticketNumber" ~ '^TKT-[0-9]{4}-[0-9]{6}$'
  AND substring("ticketNumber" from 10 for 6)::integer > 0
GROUP BY substring("ticketNumber" from 5 for 4)::integer;
