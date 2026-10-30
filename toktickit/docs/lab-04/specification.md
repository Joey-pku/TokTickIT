# Lab 4 Sprint Engineering Specification

**Status:** Implementation-ready engineering contract based on the official *SE Lab 4* handout.

**Document authority:** Handout requirements are marked **Handout**; implementation choices resolved by this contract are marked **Decision**.

## 1. Sprint Goal

Complete TokTickIT's service-desk workflow by adding assignable and auditable Actions Taken, enforcing formal resolution rules, and providing concise role dashboards while preserving and hardening every approved Lab 1–3 capability.

## 2. Stakeholder Request

IT Staff need to plan, assign, record, and update actual work beneath a Ticket even when the worker differs from the primary Ticket Owner. Requesters need transparent read-only action history for their own Tickets. Each role needs a concise dashboard that leads back to authoritative Ticket views, and staff—not requester advisory intent—must control formal resolution.

## 3. Scope

### 3.1 Included

- Actions Taken with create time, description, result, automatic performer, assignee, follow-up flag/note, attachment notes, lifecycle status, editing, and audit revisions.
- Full eight-state Ticket transition enforcement and an action-based resolution gate.
- Requester, IT Staff, and Administrator dashboard behavior with exact calculations and drill-downs.
- Non-destructive Prisma migration, legacy behavior, deterministic idempotent seed increments, concurrency protection, and final regression hardening.
- Responsive and accessible Zen Green UI extensions.

### 3.2 Excluded

SLA/escalation engines, external notifications, inventory/purchasing/costing, timesheet/payroll, approval/signature workflows, advanced BI/export warehouses, multi-tenancy, production cloud operations, action file uploads (Attachment Notes reference existing Ticket attachments), and unrelated product redesign.

## 4. Functional Requirements

### 4.1 Actions Taken

| ID | Requirement | Source |
|---|---|---|
| FR-L4-ACT-01 | A Ticket shall contain zero or more Actions Taken; legacy Tickets with none remain valid. | Handout |
| FR-L4-ACT-02 | An Action shall expose server create date/time, description, result, automatic performer, active assignee, follow-up-required flag, conditional follow-up note, attachment notes, and lifecycle status. | Handout + Decision |
| FR-L4-ACT-03 | IT Staff and Administrators shall create Actions on any accessible Ticket, independent of Ticket ownership. | Handout |
| FR-L4-ACT-04 | IT Staff and Administrators shall edit permitted Action fields and move Actions through the approved action-status transitions. | Handout + Decision |
| FR-L4-ACT-05 | Assignment shall accept only an active `IT_STAFF` or `ADMINISTRATOR`; the primary Ticket Owner, Action performer, and Action assignee may be three different users. | Handout + Decision |
| FR-L4-ACT-06 | A Requester shall view every Action for their own Ticket and shall never create or modify Actions. | Handout |
| FR-L4-ACT-07 | Every Action update shall preserve an append-only audit revision containing before/after state, editor, time, and resulting version. | Decision |
| FR-L4-ACT-08 | Duplicate create submissions and stale edits shall be rejected or replayed safely without silently duplicating/overwriting work. | Handout + Decision |

### 4.2 Ticket Workflow

| ID | Requirement | Source |
|---|---|---|
| FR-L4-WF-01 | The existing eight Ticket statuses and permitted transition matrix in Section 6 shall remain authoritative. | Handout |
| FR-L4-WF-02 | Only IT Staff and Administrators shall formally transition Ticket status; the backend shall enforce role, transition, concurrency, and resolution rules atomically. | Handout + Decision |
| FR-L4-WF-03 | A Ticket may enter `RESOLVED` only when it has at least one `COMPLETED` Action with a nonblank result. | Decision |
| FR-L4-WF-04 | Requester “appears resolved” remains advisory, is limited to the Requester's own eligible Ticket, and never changes `currentStatus`. | Handout |
| FR-L4-WF-05 | Reopening shall clear requester advisory resolution and formal `resolvedAt`; cancellation shall be terminal. | Existing behavior + Decision |

### 4.3 Dashboards

| ID | Requirement | Source |
|---|---|---|
| FR-L4-RD-01 | An authenticated Requester dashboard shall contain only the authenticated Requester's Ticket metrics and lists. | Handout |
| FR-L4-RD-02 | The Requester dashboard shall show active count, waiting-for-requester count, five recently updated Tickets, and five recently resolved Tickets using Section 7 calculations. | Handout + Decision |
| FR-L4-RD-03 | Requester dashboard items shall drill into existing `/tickets` list/detail routes without duplicating My Tickets. | Handout + Decision |
| FR-L4-SD-01 | IT Staff and Administrators shall share the staff dashboard; no account-count extension is included. | Handout + Decision |
| FR-L4-SD-02 | The staff dashboard shall show active unassigned count, active owned-by-me count, status summary, active IT-priority summary, five recent urgent Tickets, and five current-user Actions. | Handout + Decision |
| FR-L4-SD-03 | Dashboard values shall be computed server-side from one consistent snapshot and expose defined drill-down destinations. | Handout |

### 4.4 Hardening

| ID | Requirement | Source |
|---|---|---|
| FR-L4-HARD-01 | New interfaces shall provide loading, empty, validation, forbidden, not-found, conflict, success, and safe-failure feedback while preserving recoverable form input. | Handout |
| FR-L4-HARD-02 | New reads/writes shall enforce session, role, ownership, and CSRF rules on the backend and use the existing safe error envelope. | Handout |
| FR-L4-HARD-03 | All approved Lab 1–3 authentication, requester, staff, administrator, attachment, comment, and note behavior shall regress successfully. | Handout |
| FR-L4-HARD-04 | Lab 4 screens shall preserve Zen Green, responsive behavior, keyboard operation, semantic labeling, visible focus, non-color cues, and zero horizontal page overflow. | Handout |

## 5. Business Rules

| ID | Rule | Source |
|---|---|---|
| BR-L4-01 | An Action belongs to exactly one Ticket; a Ticket may have many Actions. | Handout |
| BR-L4-02 | Ticket Owner coordinates the Ticket, but Action performer and assignee may differ from that Owner and each other. | Handout + Decision |
| BR-L4-03 | `performedById` is automatically the authenticated creator and is immutable; `assignedToId` identifies the active user responsible for the Action and is editable. | Decision |
| BR-L4-04 | Description is trimmed 1–2000 characters. Result is 0–2000 while planned/in progress and required (1–2000) when completed. Attachment notes are optional, trimmed, maximum 2000. | Decision |
| BR-L4-05 | `followUpRequired` is Boolean. Follow-up note is required and 1–2000 characters when true; it must be `null` when false. | Handout + Decision |
| BR-L4-06 | `createdAt` is server-generated and immutable. `updatedAt` is server-generated on edits. API timestamps are UTC ISO-8601 and UI display uses the user's locale. | Handout + Decision |
| BR-L4-07 | Action status transitions are `PLANNED → IN_PROGRESS|COMPLETED|CANCELLED` and `IN_PROGRESS → COMPLETED|CANCELLED`; terminal Actions cannot be edited. | Decision |
| BR-L4-08 | Assignment rejects missing, inactive, or Requester assignees. Deactivating/demoting a user sets `assignedToId = null` on their nonterminal Actions in the same transaction. While such an Action is unassigned, staff/admin may submit a reassignment-only edit containing the current `version` and one eligible `assignedToId`; description, result, follow-up, attachment-note, and status changes in that request are rejected. No other edit or completion is allowed until reassignment succeeds. | Decision |
| BR-L4-09 | Creating an Action requires a unique client `idempotencyKey`; replay with identical payload returns the original Action, while reuse with different payload returns `409 IDEMPOTENCY_CONFLICT`. | Decision |
| BR-L4-10 | Each edit requires the current integer `version`; a mismatch returns `409 STALE_ACTION` and changes nothing. Every accepted edit increments version and appends one revision. | Handout + Decision |
| BR-L4-11 | Stable Action ordering is `createdAt ASC, id ASC`; edits do not reorder history. | Decision |
| BR-L4-12 | Requesters see all Action current-state records on owned Tickets. Audit revisions are internal persistence/test evidence only: Lab 4 defines no revision-read API or UI for any role. Cross-owner probes return `404 TICKET_NOT_FOUND`. | Handout + Decision |
| BR-L4-13 | Ticket status changes require current `workflowVersion`; accepted changes atomically validate and increment it. Mismatch returns `409 STALE_TICKET`. Requiring this field intentionally changes the Lab 3 PATCH request contract, so every existing frontend caller and automated test must be updated while retaining all intended Lab 3 transition behavior. | Handout + Decision |
| BR-L4-14 | A transition to `RESOLVED` requires one `COMPLETED` Action with nonblank result. `CLOSED` is reachable only from `RESOLVED`, so it inherits the gate. | Decision |
| BR-L4-15 | Reopening clears `requesterResolved`, `requesterResolvedAt`, and `resolvedAt`; transitioning to `RESOLVED` sets `resolvedAt`; closing preserves it. | Decision |
| BR-L4-16 | Active Ticket statuses are `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, and `REOPENED`. | Decision |
| BR-L4-17 | Dashboard “recent” lists use `updatedAt DESC, id DESC`, except recently resolved uses `resolvedAt DESC, id DESC`; list limit is five. | Decision |
| BR-L4-18 | Dashboard date/time boundaries use stored UTC instants. No rolling-day filter is used, avoiding locale-boundary ambiguity. | Decision |
| BR-L4-19 | Zero metrics return numeric `0`; lists return `[]`; cards remain visible and disabled/non-linked where no useful drill-down exists. | Decision |
| BR-L4-20 | Dashboard snapshot queries use a repeatable-read transaction. Client-supplied requester/current-user IDs are forbidden. | Decision |

### 5.1 Authorization Matrix

| Capability | Requester | IT Staff | Administrator |
|---|---:|---:|---:|
| View requester dashboard | Own data | No | No |
| View staff dashboard | No | Yes | Yes |
| View Actions | All on owned Tickets | All Tickets | All Tickets |
| Create/edit/assign/transition Actions | No | All Tickets | All Tickets |
| Read Action audit revisions through Lab 4 API/UI | No | No | No |
| Formally transition Ticket | No | Yes | Yes |
| Indicate “appears resolved” | Own eligible Ticket | No | No |
| Manage users | No | No | Existing Administrator behavior |

Every permission is enforced by backend query/role checks. UI visibility is supplementary, never authorization.

## 6. Ticket and Action Transition Matrices

Only authenticated `IT_STAFF` and `ADMINISTRATOR` may request formal Ticket transitions.

| Current Ticket status | Permitted next status |
|---|---|
| `NEW` | `OPEN`, `IN_PROGRESS`, `CANCELLED` |
| `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` |
| `IN_PROGRESS` | `OPEN`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` |
| `WAITING_FOR_REQUESTER` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED` |
| `RESOLVED` | `CLOSED`, `REOPENED` |
| `CLOSED` | `REOPENED` |
| `REOPENED` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED` |
| `CANCELLED` | None |

Same-state Ticket requests are idempotent only when `workflowVersion` matches. Invalid transitions return `409 INVALID_STATUS_TRANSITION`; resolution without qualifying work returns `409 ACTION_REQUIRED`; stale requests return `409 STALE_TICKET`. All checks and the update occur in one transaction.

| Current Action status | Permitted next status |
|---|---|
| `PLANNED` | `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `IN_PROGRESS` | `COMPLETED`, `CANCELLED` |
| `COMPLETED` | None |
| `CANCELLED` | None |

## 7. Dashboard Calculations and Drill-downs

### 7.1 Requester

Every query includes `requesterId = session.userId`.

| Metric/list | Exact calculation | Drill-down |
|---|---|---|
| Active Tickets | Count statuses in BR-L4-16. | `/tickets?view=active` (extend existing My Tickets query contract). |
| Waiting for Requester | Count `WAITING_FOR_REQUESTER`. | `/tickets?status=WAITING_FOR_REQUESTER`. |
| Recently updated | Top five all owned Tickets by BR-L4-17. | Each item `/tickets/:ticketId`; “View all” `/tickets?sortBy=updatedAt&sortOrder=desc`. |
| Recently resolved | Top five owned `RESOLVED` or `CLOSED` Tickets with nonnull `resolvedAt`. | Each item `/tickets/:ticketId`; “View all” `/tickets?view=resolved`. |

### 7.2 IT Staff and Administrator

| Metric/list | Exact calculation | Drill-down |
|---|---|---|
| Unassigned | Active Tickets with `ownerId = null`. | `/staff/queue?view=active&ownerId=unassigned`. |
| Owned by me | Active Tickets with `ownerId = session.userId`. | `/staff/queue?view=active&ownerId=me`. |
| By status | Count all Tickets grouped across all eight statuses. | `/staff/queue?status={status}`. |
| By IT priority | Count active Tickets grouped `LOW|MEDIUM|HIGH`. | `/staff/queue?view=active&itPriority={priority}`. |
| Recent urgent | Top five active `itPriority=HIGH` Tickets by BR-L4-17. | Each item `/staff/tickets/:ticketId`; “View all” `/staff/queue?view=active&itPriority=HIGH`. |
| My current Actions | Top five nonterminal Actions with `assignedToId=session.userId`, ordered `updatedAt DESC, id DESC`. | Each item `/staff/tickets/:ticketId#action-{id}`. |

## 8. UI Specification Summary

- Add `/dashboard` for Requesters and `/staff/dashboard` for IT Staff/Administrators, with role-appropriate default navigation and active-page indication.
- Add a stable Actions Taken section to both Ticket Detail variants: full list/create/view/edit for staff/admin; complete read-only list for owning Requesters.
- Forms include assignee selection, conditional follow-up note, status controls, validation summary, retained input, conflict refresh, and duplicate-submit protection.
- Metric cards remain concise and link to verified existing detail/list routes or the documented My Tickets query extensions.
- All modes and responsive/accessibility rules are normative in `ui-spec.md`.

## 9. Data Changes

### 9.1 Proposed Prisma Models

```prisma
enum ActionStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model TicketAction {
  id               Int                    @id @default(autoincrement())
  idempotencyKey   String                 @unique @db.Uuid
  ticketId         Int
  performedById    Int
  assignedToId     Int?
  description      String                 @db.VarChar(2000)
  result           String                 @default("") @db.VarChar(2000)
  followUpRequired Boolean                @default(false)
  followUpNote     String?                @db.VarChar(2000)
  attachmentNotes  String?                @db.VarChar(2000)
  status           ActionStatus           @default(PLANNED)
  version          Int                    @default(1)
  createdAt        DateTime               @default(now())
  updatedAt        DateTime               @updatedAt
  ticket           Ticket                 @relation(fields: [ticketId], references: [id], onDelete: Restrict)
  performedBy      User                   @relation("ActionPerformer", fields: [performedById], references: [id], onDelete: Restrict)
  assignedTo       User?                  @relation("ActionAssignee", fields: [assignedToId], references: [id], onDelete: SetNull)
  revisions        TicketActionRevision[]

  @@index([ticketId, createdAt, id])
  @@index([assignedToId, status, updatedAt(sort: Desc)])
  @@index([ticketId, status])
}

model TicketActionRevision {
  id             Int          @id @default(autoincrement())
  actionId       Int
  version        Int
  editedById     Int
  beforeState    Json
  afterState     Json
  createdAt      DateTime     @default(now())
  action         TicketAction @relation(fields: [actionId], references: [id], onDelete: Restrict)
  editedBy       User         @relation("ActionRevisionEditor", fields: [editedById], references: [id], onDelete: Restrict)

  @@unique([actionId, version])
  @@index([actionId, createdAt])
}
```

The existing models gain these fields (all other Lab 3 fields remain unchanged):

```prisma
model Ticket {
  // existing fields and relations...
  workflowVersion Int            @default(1)
  resolvedAt      DateTime?
  actions         TicketAction[]
}

model User {
  // existing fields and relations...
  performedActions TicketAction[]         @relation("ActionPerformer")
  assignedActions  TicketAction[]         @relation("ActionAssignee")
  actionRevisions  TicketActionRevision[] @relation("ActionRevisionEditor")
}
```

### 9.2 Design Justification

1. **Separate assignee and performer:** preserves the handout's automatic actor while allowing planned work to be delegated independently of Ticket ownership.
2. **Current row plus revision ledger:** supports required editing and efficient reads while preserving append-only audit evidence. JSON snapshots are internal persistence and automated-test evidence; Lab 4 exposes no revision-read endpoint or interface.
3. **Integer versions:** conditional updates provide database-enforced stale-write protection without relying on timestamp precision.

### 9.3 Migration, Backfill, and Recovery

- Add enum/tables/indexes and nullable `resolvedAt`; add `workflowVersion` with default `1` without dropping or rewriting existing relationships.
- Legacy Tickets receive no synthetic Actions and remain fully readable. Existing `RESOLVED`/`CLOSED` Tickets are grandfathered and backfill `resolvedAt = updatedAt`; the Action gate applies to future transitions into `RESOLVED`.
- Dashboard calculations include legacy Tickets using current status/ownership/priority; recently resolved uses the backfilled timestamp.
- Migration verification records pre/post row counts and FK/orphan checks. Recovery is restore-from-pre-migration backup or a tested compensating migration; destructive down migration is not used after production data exists.

### 9.4 Seed Contract

- Use deterministic seed keys and create-if-missing checks for accounts, Tickets, and Actions. A rerun inserts missing canonical records but never updates or resets an existing account, Ticket, or Action, even when a user has modified it; fixed Action UUID `idempotencyKey` values prevent duplicates.
- Cover Tickets with zero, one, and multiple Actions; each Action status; different owner/performer/assignee; active and inactive candidate users; all major Ticket statuses/priorities; assigned/unassigned ownership.
- Include requester/staff datasets with both zero and nonzero dashboard metrics. Seed timestamps are deterministic so ordering assertions are stable.

## 10. API Contract Summary

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/tickets/:ticketId/actions` | Role-filtered Action list: owning Requester or staff/admin. |
| `POST` | `/api/tickets/:ticketId/actions` | Staff/admin create with idempotency protection. |
| `PATCH` | `/api/tickets/:ticketId/actions/:actionId` | Staff/admin edit/reassign/transition with version check. |
| `GET` | `/api/action-assignees` | Active staff/admin assignment choices. |
| `PATCH` | `/api/staff/tickets/:ticketId/status` | Existing endpoint extended to administrators, resolution gate, and workflow version. |
| `GET` | `/api/dashboard/requester` | Authoritative requester metrics/lists. |
| `GET` | `/api/dashboard/staff` | Shared staff/administrator metrics/lists. |

Detailed shapes, validation, safe errors, and compatibility rules are normative in `api-spec.md`.

## 11. Acceptance Criteria

| ID | Observable criterion | Requirements |
|---|---|---|
| AC-L4-01 | Valid staff/admin creation stores the correct Ticket, authenticated performer, approved active assignee, fields, version 1, and one row only. | FR-L4-ACT-01, FR-L4-ACT-02, FR-L4-ACT-03, FR-L4-ACT-04, FR-L4-ACT-05, FR-L4-ACT-08 |
| AC-L4-02 | Missing/oversized/unknown fields and invalid follow-up combinations return field errors and create nothing. | FR-L4-ACT-02, FR-L4-HARD-01 |
| AC-L4-03 | Requesters see all Actions only on owned Tickets and receive no create/edit controls or write access. | FR-L4-ACT-06, FR-L4-HARD-02 |
| AC-L4-04 | Staff/admin can act on a Ticket they do not own; Ticket owner, performer, and assignee remain independently represented. | FR-L4-ACT-03, FR-L4-ACT-05 |
| AC-L4-05 | Assignment to inactive/missing/Requester users is rejected. A nonterminal Action automatically unassigned by deactivation/demotion accepts a versioned reassignment-only patch to an eligible user, rejects combined field/status changes, and rejects every other edit/completion until reassigned; successful reassignment is audited. | FR-L4-ACT-05, FR-L4-ACT-07 |
| AC-L4-06 | A valid edit updates allowed fields, increments version once, and appends an accurate immutable revision. | FR-L4-ACT-04, FR-L4-ACT-07 |
| AC-L4-07 | Invalid Action transitions and edits to terminal Actions return conflict and change nothing. | FR-L4-ACT-04, FR-L4-HARD-01 |
| AC-L4-08 | Same-key/same-payload create replay returns one Action; different payload returns idempotency conflict. | FR-L4-ACT-08 |
| AC-L4-09 | Concurrent edit using an old version returns `STALE_ACTION`, preserves newer work, and supports refresh/retry. | FR-L4-ACT-08, FR-L4-HARD-01 |
| AC-L4-10 | Each allowed Ticket transition succeeds for staff/admin; each disallowed transition fails without mutation. | FR-L4-WF-01, FR-L4-WF-02 |
| AC-L4-11 | Resolution without a completed Action/result fails; qualifying work permits atomic resolution and sets `resolvedAt`. | FR-L4-WF-02, FR-L4-WF-03 |
| AC-L4-12 | Requester advisory resolution never changes formal status; reopen clears advisory/formal resolution timestamps; cancelled is terminal. | FR-L4-WF-04, FR-L4-WF-05 |
| AC-L4-13 | A stale Ticket workflow version returns `STALE_TICKET` without overwriting a concurrent transition. | FR-L4-WF-02 |
| AC-L4-14 | Requester dashboard counts/lists exactly match Section 7 for only the authenticated Requester, including zeros and stable ordering. | FR-L4-RD-01, FR-L4-RD-02, FR-L4-RD-03 |
| AC-L4-15 | Staff/admin dashboard counts/lists exactly match Section 7, including current-user ownership/actions, zeros, and stable ordering. | FR-L4-SD-01, FR-L4-SD-02, FR-L4-SD-03 |
| AC-L4-16 | Every dashboard card/list item reaches its documented filtered list or authorized detail route. | FR-L4-RD-03, FR-L4-SD-03 |
| AC-L4-17 | A Requester is forbidden from staff dashboard data; an Administrator receives the same operational behavior as IT Staff. | FR-L4-SD-01, FR-L4-HARD-02 |
| AC-L4-18 | Migration preserves prior rows/relationships; legacy Tickets work with zero Actions and resolved timestamps are backfilled as specified. | FR-L4-ACT-01, FR-L4-HARD-03 |
| AC-L4-19 | Re-running seed inserts any missing deterministic records, produces no duplicates, does not overwrite user-modified accounts/Tickets/Actions, and demonstrates zero/one/many Actions, representative workflow/assignment, and zero/nonzero dashboards. | FR-L4-ACT-01, FR-L4-RD-02, FR-L4-SD-02 |
| AC-L4-20 | New screens exhibit all required feedback states, preserve recoverable input, and prevent accidental duplicate submission. | FR-L4-HARD-01 |
| AC-L4-21 | Session, CSRF, role, ownership, not-found, and safe error behavior is enforced server-side for every new endpoint. | FR-L4-HARD-02 |
| AC-L4-22 | Desktop, tablet, and 375px mobile checks pass keyboard, focus, label, non-color, clipping, overlap, and horizontal-overflow criteria. | FR-L4-HARD-04 |
| AC-L4-23 | Full Labs 1–3 automated and representative E2E regression passes with no broken routes or console errors. | FR-L4-HARD-03 |

## 12. Product Definition of Done

- Contract, test plan, implementation, reviewer record, AI-use record, README, and evidence are current and mutually traceable.
- Migration, rollback/recovery rehearsal, idempotent seed, unit/API/component/style/responsive/accessibility/E2E tests pass from a clean setup.
- Every AC maps to planned and final evidence; all role, ownership, concurrency, duplicate, workflow, dashboard, and regression cases pass.
- Desktop/tablet/mobile screenshots show dashboard and Actions modes with no clipping, overlap, broken focus, or overflow.
- No unfinished controls, placeholder content, secrets, console errors, unsafe errors, or unrelated features remain.
- Feature branches are reviewed and integrated through the required Lab 4 workflow; final `main` is the demonstrated source of truth.

## 13. Assumptions and Decisions

- The handout fixes fields, broad roles, all-requester visibility, dashboards, and the eight Ticket statuses; it delegates exact Action status, resolution gate, calculations, endpoints, concurrency, and model details to the student contract.
- Decisions selected here: four-state Action lifecycle; performer=creator and separate assignee; completed Action with result gates resolution; revision ledger plus versions; five-item recent lists; no optional administrator account metrics.
- Existing `/api/staff/*` currently authorizes only `IT_STAFF`; Lab 4 must explicitly admit `ADMINISTRATOR`. Generic non-requester routes must be replaced with explicit role checks.
- The required `workflowVersion` request field is a deliberate Lab 3 status-PATCH contract change. Implementation must update every existing UI caller, API/component/E2E fixture, and regression assertion without removing any previously permitted Lab 3 transition.
- Existing frontend routes are `/tickets`, `/tickets/:id`, `/staff/queue`, and `/staff/tickets/:id`. Dashboard routes are new; documented drill-downs reuse those routes, with `view=active|resolved` added to My Tickets filtering.
