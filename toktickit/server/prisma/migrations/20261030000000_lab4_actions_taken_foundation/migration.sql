-- Feature 16: add Actions Taken and workflow-version foundations without
-- replacing or deleting any Lab 1-3 data.
BEGIN;

CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

ALTER TABLE "Ticket"
  ADD COLUMN "workflowVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "resolvedAt" TIMESTAMP(3);

-- Preserve legacy resolved/closed Tickets and give dashboard ordering a
-- deterministic best-effort timestamp. Future transitions set this directly.
UPDATE "Ticket"
SET "resolvedAt" = "updatedAt"
WHERE "currentStatus" IN ('RESOLVED', 'CLOSED');

CREATE TABLE "TicketAction" (
  "id" SERIAL NOT NULL,
  "idempotencyKey" UUID NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "performedById" INTEGER NOT NULL,
  "assignedToId" INTEGER,
  "description" VARCHAR(2000) NOT NULL,
  "result" VARCHAR(2000) NOT NULL DEFAULT '',
  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "followUpNote" VARCHAR(2000),
  "attachmentNotes" VARCHAR(2000),
  "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketActionRevision" (
  "id" SERIAL NOT NULL,
  "actionId" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "editedById" INTEGER NOT NULL,
  "beforeState" JSONB NOT NULL,
  "afterState" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketActionRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketAction_idempotencyKey_key" ON "TicketAction"("idempotencyKey");
CREATE INDEX "TicketAction_ticketId_createdAt_id_idx" ON "TicketAction"("ticketId", "createdAt", "id");
CREATE INDEX "TicketAction_assignedToId_status_updatedAt_idx" ON "TicketAction"("assignedToId", "status", "updatedAt" DESC);
CREATE INDEX "TicketAction_ticketId_status_idx" ON "TicketAction"("ticketId", "status");
CREATE UNIQUE INDEX "TicketActionRevision_actionId_version_key" ON "TicketActionRevision"("actionId", "version");
CREATE INDEX "TicketActionRevision_actionId_createdAt_idx" ON "TicketActionRevision"("actionId", "createdAt");

ALTER TABLE "TicketAction" ADD CONSTRAINT "TicketAction_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAction" ADD CONSTRAINT "TicketAction_performedById_fkey"
  FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketAction" ADD CONSTRAINT "TicketAction_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketActionRevision" ADD CONSTRAINT "TicketActionRevision_actionId_fkey"
  FOREIGN KEY ("actionId") REFERENCES "TicketAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketActionRevision" ADD CONSTRAINT "TicketActionRevision_editedById_fkey"
  FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
