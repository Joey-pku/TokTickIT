-- Database-level safeguards for Action and workflow invariants. These checks
-- complement API validation and do not modify existing valid rows.
BEGIN;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_workflowVersion_check" CHECK ("workflowVersion" >= 1);

ALTER TABLE "TicketAction"
  ADD CONSTRAINT "TicketAction_version_check" CHECK ("version" >= 1),
  ADD CONSTRAINT "TicketAction_description_check" CHECK (char_length(btrim("description")) BETWEEN 1 AND 2000),
  ADD CONSTRAINT "TicketAction_result_check" CHECK (
    char_length("result") <= 2000 AND
    ("status" <> 'COMPLETED' OR char_length(btrim("result")) >= 1)
  ),
  ADD CONSTRAINT "TicketAction_followUp_check" CHECK (
    ("followUpRequired" = true AND "followUpNote" IS NOT NULL AND char_length(btrim("followUpNote")) BETWEEN 1 AND 2000)
    OR ("followUpRequired" = false AND "followUpNote" IS NULL)
  ),
  ADD CONSTRAINT "TicketAction_attachmentNotes_check" CHECK (
    "attachmentNotes" IS NULL OR char_length(btrim("attachmentNotes")) BETWEEN 1 AND 2000
  );

COMMIT;
