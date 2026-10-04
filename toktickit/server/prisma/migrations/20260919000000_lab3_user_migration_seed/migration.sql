-- Feature 10: preserve Lab 2 identities and data while evolving to the Lab 3 schema.
BEGIN;

-- Fail before any structural change when legacy addresses collide case-insensitively.
DO $$
DECLARE
  collisions TEXT;
BEGIN
  SELECT string_agg(quote_literal(normalized_email), ', ' ORDER BY normalized_email)
    INTO collisions
  FROM (
    SELECT lower("email") AS normalized_email
    FROM "DevelopmentRequester"
    GROUP BY lower("email")
    HAVING count(*) > 1
  ) duplicates;

  IF collisions IS NOT NULL THEN
    RAISE EXCEPTION 'Case-insensitive email collisions must be resolved before migration: %', collisions;
  END IF;
END $$;

CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

ALTER TABLE "DevelopmentRequester" RENAME TO "User";
ALTER TABLE "User" RENAME CONSTRAINT "DevelopmentRequester_pkey" TO "User_pkey";
ALTER INDEX "DevelopmentRequester_email_key" RENAME TO "User_email_key";
ALTER SEQUENCE "DevelopmentRequester_id_seq" RENAME TO "User_id_seq";

ALTER TABLE "User"
  ALTER COLUMN "department" DROP NOT NULL,
  ADD COLUMN "seedKey" TEXT,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "role" "Role" NOT NULL DEFAULT 'REQUESTER',
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- The embedded value is a bcrypt cost-10 hash of the documented local password
-- Initial123!. There is deliberately no database default for future accounts.
UPDATE "User" SET "passwordHash" = '$2b$10$bRLv4FB5W2W4yjE/sRGnkOxC6hak2oQW4J/GDtOXdG7NAtD/b3/4i';
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

UPDATE "User"
SET "seedKey" = CASE "email"
  WHEN 'jennifer.anderson@example.com' THEN 'seed:req:1'
  WHEN 'david.lee@example.com' THEN 'seed:req:2'
  WHEN 'sarah.johnson@example.com' THEN 'seed:req:3'
  WHEN 'michael.brown@example.com' THEN 'seed:req:4'
  WHEN 'alex.taylor@example.com' THEN 'seed:req:5'
END
WHERE "email" IN (
  'jennifer.anderson@example.com',
  'david.lee@example.com',
  'sarah.johnson@example.com',
  'michael.brown@example.com',
  'alex.taylor@example.com'
);

CREATE UNIQUE INDEX "User_seedKey_key" ON "User"("seedKey");
-- Prisma 5 cannot express functional indexes; this SQL-managed index enforces
-- the contract's case-insensitive email uniqueness.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User"(lower("email"));

ALTER TABLE "Ticket"
  ADD COLUMN "seedKey" TEXT,
  ADD COLUMN "ownerId" INTEGER,
  ADD COLUMN "itPriority" "RequestedPriority",
  ADD COLUMN "requesterResolved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requesterResolvedAt" TIMESTAMP(3);

UPDATE "Ticket" SET "itPriority" = "requestedPriority";
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;

-- Reconcile upward in case legacy tickets were added after the counter's
-- original migration. Existing counter values are never decreased.
INSERT INTO "TicketNumberCounter" ("year", "lastValue")
SELECT substring("ticketNumber" from 5 for 4)::integer,
       max(substring("ticketNumber" from 10 for 6)::integer)
FROM "Ticket"
WHERE "ticketNumber" ~ '^TKT-[0-9]{4}-[0-9]{6}$'
  AND substring("ticketNumber" from 10 for 6)::integer BETWEEN 1 AND 999999
GROUP BY substring("ticketNumber" from 5 for 4)::integer
ON CONFLICT ("year") DO UPDATE
SET "lastValue" = GREATEST("TicketNumberCounter"."lastValue", EXCLUDED."lastValue");

CREATE UNIQUE INDEX "Ticket_seedKey_key" ON "Ticket"("seedKey");
CREATE INDEX "Ticket_ownerId_currentStatus_idx" ON "Ticket"("ownerId", "currentStatus");
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Session" (
  "id" UUID NOT NULL,
  "token" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Comment" (
  "id" SERIAL NOT NULL,
  "seedKey" TEXT,
  "ticketId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "content" VARCHAR(2000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Comment_seedKey_key" ON "Comment"("seedKey");
CREATE INDEX "Comment_ticketId_createdAt_idx" ON "Comment"("ticketId", "createdAt");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InternalNote" (
  "id" SERIAL NOT NULL,
  "seedKey" TEXT,
  "ticketId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "content" VARCHAR(2000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InternalNote_seedKey_key" ON "InternalNote"("seedKey");
CREATE INDEX "InternalNote_ticketId_createdAt_idx" ON "InternalNote"("ticketId", "createdAt");
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
