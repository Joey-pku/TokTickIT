# Lab 4 Test Design and Requirements Traceability

**Status:** Planned; Lab 4 implementation and tests do not yet exist.

**Contract sources:** `specification.md`, `api-spec.md`, and `ui-spec.md` in this directory. This document does not alter their product requirements.

## 1. Test Strategy

### 1.1 Objectives and Scope

Testing shall prove Actions Taken, Ticket workflow, dashboards, migration/seed behavior, authorization, concurrency, responsive/accessibility behavior, and Labs 1–3 regression. Coverage combines:

- **Unit:** pure validation, Action/Ticket transition functions, metric predicates.
- **API/integration:** Express routes through Supertest against isolated PostgreSQL; database state is asserted before and after failures.
- **UI component:** React Testing Library, user-event, jsdom, and mocked API boundaries.
- **End-to-end:** Playwright against isolated seeded services for role workflows, navigation, safe failure, and screenshots.
- **Security/reliability:** session, CSRF, role/ownership isolation, idempotency, optimistic concurrency, atomic rollback, and safe errors.
- **Migration/seed:** deploy onto a Lab 3-shaped database, preservation/backfill/integrity checks, and non-destructive reruns.
- **Regression:** existing Lab 1–3 Vitest and Playwright suites plus focused Lab 4 compatibility scenarios.

### 1.2 Tools and Environment

| Layer | Existing tool/environment | Planned Lab 4 location |
|---|---|---|
| Server unit/API | Vitest, Supertest, Prisma, PostgreSQL; serial files via `server/vitest.config.ts` | `server/tests/lab-04/*.test.ts` |
| Client component | Vitest, React Testing Library, user-event, jsdom | `client/tests/lab-04/*.test.tsx` |
| E2E | Playwright, isolated `toktickit_e2e_test`, one worker, seeded roles | `e2e/lab-04/*.spec.ts` |
| Migration/seed | Prisma migrate deploy/seed plus direct Prisma assertions | `server/tests/lab-04/migration-seed.test.ts` and setup script evidence |
| Manual/visual | Desktop, tablet, 375×812 mobile; keyboard and screen reader semantics | `artifacts/lab-04/` |

The current Playwright `testMatch` includes only Lab 2 and Lab 3; implementation must explicitly include `e2e/lab-04/**/*.spec.ts`. API tests remain fail-closed unless `TEST_DATABASE_URL` names a database ending `_test`. E2E uses a separate database and temporary attachment directory.

### 1.3 Test Data and Fixtures

- Active Requester A and B, active IT Staff A and B, active Administrator, inactive staff, and demoted Requester formerly assigned to an Action.
- Tickets across all eight statuses, all priorities, two requesters, owned/unassigned states, and owner distinct from Action performer and assignee.
- Tickets with zero, one, and multiple Actions; all four Action statuses; follow-up true/false; null/non-null Attachment Notes; version conflicts.
- Deterministic timestamps and IDs sufficient to prove tie-breaking, top-five limits, UTC behavior, zero metrics, and ownership isolation.
- A Lab 3 database snapshot containing users, Tickets, attachments, comments, notes, resolved/closed Tickets, and no Actions.

Fixtures must create data through supported helpers or scoped Prisma setup, reset only the isolated test database, and never depend on execution order.

### 1.4 Execution and Evidence

Automated evidence consists of console output, JSON Playwright report, targeted database assertions, and retained failure traces. E2E captures readable desktop/tablet/mobile screenshots for major Lab 4 states. Planned tests are not marked passing until the named file exists and its command succeeds on the tested commit.

## 2. Requirements Traceability Matrix

Every one of the 23 functional requirements and 23 acceptance criteria is covered below.

| Requirement ID | Acceptance Criterion ID(s) | Test Case ID(s) | Level | Expected behavior |
|---|---|---|---|---|
| FR-L4-ACT-01 | AC-L4-01, AC-L4-18, AC-L4-19 | API-ACT-01, API-ACT-02, MIG-01, MIG-04, MIG-05 | API, migration | Zero/one/many Actions work; migration and seed preserve data. |
| FR-L4-ACT-02 | AC-L4-01, AC-L4-02 | UT-ACT-01, UT-ACT-02, API-ACT-01, API-ACT-03, API-ACT-04 | Unit, API | Complete fields and exact validation rules are enforced. |
| FR-L4-ACT-03 | AC-L4-01, AC-L4-04 | API-ACT-01, API-ACT-06, SEC-03 | API, security | Staff/admin may create regardless of Ticket ownership. |
| FR-L4-ACT-04 | AC-L4-01, AC-L4-06, AC-L4-07 | UT-ACT-03, API-ACT-07, API-ACT-08, API-ACT-09 | Unit, API | Valid edits/transitions succeed; terminal/invalid edits do not. |
| FR-L4-ACT-05 | AC-L4-01, AC-L4-04, AC-L4-05 | API-ACT-05, API-ACT-06, API-ACT-10, API-ACT-11 | API | Eligibility, role separation, and reassignment-only recovery hold. |
| FR-L4-ACT-06 | AC-L4-03 | API-ACT-02, API-ACT-12, SEC-02, UI-06 | API, UI, security | Owning Requester sees all current Actions read-only; others do not. |
| FR-L4-ACT-07 | AC-L4-05, AC-L4-06 | API-ACT-07, API-ACT-10, API-ACT-13 | API, DB | Each accepted edit appends one immutable internal revision. |
| FR-L4-ACT-08 | AC-L4-01, AC-L4-08, AC-L4-09 | API-ACT-14, API-ACT-15, API-ACT-16, REL-01, REL-02 | API, reliability | Retry is idempotent and stale edits never overwrite. |
| FR-L4-WF-01 | AC-L4-10 | UT-WF-01, API-WF-01, API-WF-02 | Unit, API | Every allowed transition succeeds and every other pair fails. |
| FR-L4-WF-02 | AC-L4-10, AC-L4-11, AC-L4-13 | API-WF-01, API-WF-03, API-WF-04, REL-03 | API, reliability | Staff/admin-only atomic, versioned workflow is authoritative. |
| FR-L4-WF-03 | AC-L4-11 | API-WF-05, API-WF-06, API-WF-07 | API | Resolution requires a completed Action with nonblank result. |
| FR-L4-WF-04 | AC-L4-12 | API-WF-08, SEC-02, E2E-03 | API, E2E | Requester advisory intent never formally resolves a Ticket. |
| FR-L4-WF-05 | AC-L4-12 | API-WF-09, API-WF-10 | API | Reopen clears resolution fields; cancellation is terminal. |
| FR-L4-RD-01 | AC-L4-14 | API-RD-01, API-RD-02, SEC-04 | API, security | Dashboard derives only authenticated Requester data. |
| FR-L4-RD-02 | AC-L4-14, AC-L4-19 | API-RD-01, API-RD-03, API-RD-04, MIG-05 | API, seed | Exact counts, top five, ordering, zero/empty behavior match contract. |
| FR-L4-RD-03 | AC-L4-14, AC-L4-16 | API-RD-05, UI-01, E2E-04 | API, UI, E2E | Links and filters reach owned list/detail views. |
| FR-L4-SD-01 | AC-L4-15, AC-L4-17 | API-SD-01, API-SD-05, SEC-04 | API, security | Staff/admin responses match; Requester is forbidden. |
| FR-L4-SD-02 | AC-L4-15, AC-L4-19 | API-SD-01, API-SD-02, API-SD-03, API-SD-04, MIG-05 | API, seed | All operational metrics/lists are exact, stable, and bounded. |
| FR-L4-SD-03 | AC-L4-15, AC-L4-16 | API-SD-06, UI-02, E2E-04, REL-05 | API, UI, E2E | Snapshot values and drill-downs are consistent. |
| FR-L4-HARD-01 | AC-L4-02, AC-L4-07, AC-L4-09, AC-L4-20 | UI-03, UI-04, UI-05, REL-04, E2E-01 | UI, reliability, E2E | Required feedback preserves input and avoids duplicate work. |
| FR-L4-HARD-02 | AC-L4-03, AC-L4-17, AC-L4-21 | SEC-01–06 | Security/API | Session, CSRF, role, ownership, validation, and safe errors hold. |
| FR-L4-HARD-03 | AC-L4-18, AC-L4-23 | MIG-01, REG-01–06, E2E-05 | Migration, regression | Labs 1–3 data and behavior remain operational. |
| FR-L4-HARD-04 | AC-L4-22 | UI-07, UI-08, E2E-02 | UI, E2E/manual | Zen Green, keyboard, semantics, responsive layout, and no overflow pass. |

## 3. Planned Test Inventory

There are **78 unique planned test cases**. IDs below are normative; implementation may parameterize scenarios without reducing their asserted coverage.

### 3.1 Unit Tests (6)

| ID | Planned assertion |
|---|---|
| UT-ACT-01 | Exact text-field boundaries: trimmed description 1–2000; result 0–2000 for `PLANNED`/`IN_PROGRESS` but trimmed 1–2000 for `COMPLETED`; follow-up note trimmed 1–2000 only when required and otherwise null; Attachment Notes omitted/null or trimmed 1–2000. Test each applicable 0/whitespace-only, 1, 2000, and 2001 boundary without treating every field identically. |
| UT-ACT-02 | Follow-up truth table: note required iff `followUpRequired=true`; false normalizes note to null. |
| UT-ACT-03 | Complete four-state Action transition matrix and terminal detection. |
| UT-ACT-04 | Active-assignee predicate accepts active staff/admin only. |
| UT-WF-01 | Complete eight-state Ticket transition matrix, including same-state contract behavior. |
| UT-WF-02 | Dashboard active/resolved status predicates and stable comparator/tie-break rules. |

### 3.2 Actions Taken API Tests (16)

| ID | Planned assertion |
|---|---|
| API-ACT-01 | Valid staff/admin creation returns `201`, version 1, server performer/time, and exact persisted fields. |
| API-ACT-02 | Listing returns zero/one/many current Actions in `createdAt ASC, id ASC`. |
| API-ACT-03 | Missing, wrong-type, unknown, and malformed fields return `400 VALIDATION_ERROR` and no row. |
| API-ACT-04 | API boundary matrix enforces description 1–2000; nonterminal result 0–2000; completed result 1–2000; follow-up note 1–2000 iff required and null/omitted otherwise; Attachment Notes null/omitted or 1–2000; required Boolean, valid UUID, eligible positive assignee ID, allowed creation status, and exact-body rules. |
| API-ACT-05 | Missing/inactive/Requester assignees return `409 INELIGIBLE_ASSIGNEE`; active staff/admin succeed. |
| API-ACT-06 | Ticket owner, performer, and assignee may be three users; nonowner staff/admin can create. |
| API-ACT-07 | Valid edit/reassignment increments version and changes only supplied permitted fields. |
| API-ACT-08 | Every valid Action transition succeeds with correct terminal representation. |
| API-ACT-09 | Invalid transition or terminal edit returns conflict and leaves row/version unchanged. |
| API-ACT-10 | Deactivation/demotion unassigns nonterminal work; reassignment-only patch succeeds and is audited. |
| API-ACT-11 | Unassigned Action rejects combined-field reassignment and all content/status/completion edits. |
| API-ACT-12 | Owning Requester lists all current Actions; other Requester gets safe `404`; Requester writes get `403`. |
| API-ACT-13 | Accepted edit creates exactly one correct immutable internal revision; no revision-read route exists. |
| API-ACT-14 | Same idempotency key/same canonical payload replays `200` with one database row. |
| API-ACT-15 | Same key/different payload returns `409 IDEMPOTENCY_CONFLICT` without mutation. |
| API-ACT-16 | Stale version returns `409 STALE_ACTION` and preserves the winning edit/revision. |

### 3.3 Ticket Workflow API Tests (10)

| ID | Planned assertion |
|---|---|
| API-WF-01 | Parameterized test accepts every permitted Ticket transition for IT Staff and Administrator using the current `workflowVersion`; every edge to `RESOLVED` includes a related `COMPLETED` Action with trimmed nonblank result, and same-state requests verify idempotence. |
| API-WF-02 | Parameterized test rejects every nonpermitted pair with `INVALID_STATUS_TRANSITION` using otherwise-valid role, CSRF, version, and—where relevant—qualifying Action fixtures so transition validity is isolated from other preconditions. |
| API-WF-03 | Requester cannot formally transition; missing session/CSRF fail without mutation. |
| API-WF-04 | Required current `workflowVersion` changes Lab 3 request shape; matching request preserves intended legacy behavior. |
| API-WF-05 | Resolution with zero Actions returns `409 ACTION_REQUIRED`. |
| API-WF-06 | Planned/in-progress/cancelled or blank-result completed Action does not satisfy resolution gate. |
| API-WF-07 | Completed Action with nonblank result permits resolution and sets `resolvedAt` atomically. |
| API-WF-08 | Requester advisory intent changes only advisory fields/comment and respects ownership/eligible statuses. |
| API-WF-09 | Reopen clears advisory fields and `resolvedAt`; closed preserves resolution timestamp until reopen. |
| API-WF-10 | Cancelled Ticket rejects all later transitions and retains unrelated Ticket/Action data. |

### 3.4 Dashboard API Tests (11)

| ID | Planned assertion |
|---|---|
| API-RD-01 | Requester active/waiting counts match exact statuses for only session Requester. |
| API-RD-02 | Cross-requester Tickets never affect metrics or lists. |
| API-RD-03 | Recently updated/resolved use correct fields, descending order, ID tie-break, and limit five. |
| API-RD-04 | Zero metrics return `0`; empty lists return `[]`; UTC values are unchanged. |
| API-RD-05 | Requester hrefs are authorized; paginating each drill-down to exhaustion yields the complete expected filtered dataset, while each dashboard top-five list equals only the first five records of that same ordering (not the entire paginated dataset). |
| API-SD-01 | Staff unassigned/owned-by-me active counts and all eight status counts are exact. |
| API-SD-02 | Active priority counts and top-five recent urgent list are exact and stable. |
| API-SD-03 | My current Actions includes only current user's assigned planned/in-progress Actions. |
| API-SD-04 | Staff zero/empty response contains all metric keys and empty arrays. |
| API-SD-05 | Administrator response equals staff operational calculation; Requester gets `403`. |
| API-SD-06 | Repeatable-read snapshot is coherent; metric-card counts equal drill-down `totalItems`, all pages together equal the complete filtered dataset, and recent top-five summaries equal only the first five records under the contract ordering. Item-only Action links resolve to the authorized Ticket/fragment rather than implying a nonexistent full Action-list drill-down. |

### 3.5 Security and Authorization Tests (6)

| ID | Planned assertion |
|---|---|
| SEC-01 | Every new endpoint rejects unauthenticated access; every mutation rejects absent/invalid CSRF. |
| SEC-02 | Requester role matrix: own Action read/advisory only; cross-owner reads are non-disclosing; writes forbidden. |
| SEC-03 | IT Staff and Administrator can perform contracted Action/workflow operations independent of Ticket owner. |
| SEC-04 | Dashboard role matrix and session-derived identity prevent requester/current-user spoofing. |
| SEC-05 | Unknown fields, injection-like text, malformed IDs, and unsupported content type receive safe validation. |
| SEC-06 | Error envelopes expose no SQL, stack, password/session token, internal revision snapshot, or protected record data. |

### 3.6 Concurrency and Reliability Tests (5)

| ID | Planned assertion |
|---|---|
| REL-01 | Two simultaneous identical creates result in one Action and replay-safe responses. |
| REL-02 | Same idempotency key with racing different payloads yields one winner and one conflict. |
| REL-03 | Two matching Ticket-version transitions yield one winner; loser receives `STALE_TICKET`. |
| REL-04 | Injected DB failure rolls back Action/edit revision/status transaction completely; retry is safe. |
| REL-05 | Dashboard repeatable-read snapshot cannot combine counts/lists from different concurrent states. |

### 3.7 Migration and Seed Tests (5)

| ID | Planned assertion |
|---|---|
| MIG-01 | Deploy migration onto Lab 3 fixture; all users/Tickets/attachments/comments/notes and relationships remain. |
| MIG-02 | New FK, unique, enum, version/default, and indexes exist; invalid/orphan records are rejected. |
| MIG-03 | Legacy resolved/closed Tickets backfill `resolvedAt=updatedAt`, workflow version 1; others remain null. |
| MIG-04 | Legacy Tickets with zero Actions remain readable and dashboard-compatible; future resolution gate applies correctly. |
| MIG-05 | Seed rerun inserts missing deterministic records, creates no duplicates, and never overwrites modified accounts/Tickets/Actions; datasets cover zero/nonzero metrics and zero/one/many Actions. |

### 3.8 UI Component Tests (8)

| ID | Planned assertion |
|---|---|
| UI-01 | Requester dashboard renders exact cards/lists/zero/loading/error and navigates all drill-downs. |
| UI-02 | Staff/admin dashboard renders exact operational data, current Actions, role equivalence, and drill-downs. |
| UI-03 | Create form field boundaries, conditional follow-up, server errors, retained draft, and single-submit state. |
| UI-04 | Edit form shows allowed transitions, result requirement, cancellation confirmation, and terminal read-only mode. |
| UI-05 | Stale/ineligible/conflict responses preserve draft and provide specified refresh/recovery focus. |
| UI-06 | Requester Action history shows all fields read-only with no staff controls; local loading/empty/error states work. |
| UI-07 | Keyboard/focus/dialog/label/live-region/non-color semantics meet the UI contract. |
| UI-08 | Desktop/tablet/mobile class/layout assertions show stacked content and no horizontal overflow. |

### 3.9 End-to-End Tests (5)

| ID | Planned assertion |
|---|---|
| E2E-01 | Staff creates, assigns, edits, completes, and safely retries an Action; another staff member may perform work. |
| E2E-02 | Both dashboards and Action modes pass desktop/tablet/375×812 visual, keyboard, focus, and overflow checks. |
| E2E-03 | Requester sees own complete Action history and advisory resolution; staff formally resolves then closes/reopens. |
| E2E-04 | Requester/staff/admin dashboard cards and rows drill to the correct authorized filtered/detail views. |
| E2E-05 | Representative Labs 1–3 cross-role journey completes with no console errors or broken links. |

### 3.10 Regression Tests Reused (6)

| ID | Existing coverage to rerun |
|---|---|
| REG-01 | `server/tests/lab-01/health.test.ts`, `categories.test.ts`, and client Lab 1 app test. |
| REG-02 | Lab 2 create/list/detail/attachment API and component suites. |
| REG-03 | `server/tests/lab-03/auth.api.test.ts` and client login/change-password tests. |
| REG-04 | Lab 3 authorization and staff workflow API/unit/component suites, updated only where `workflowVersion` is now required. |
| REG-05 | Lab 3 administrator user-management API/component/E2E suites, extended later for Action unassignment cleanup. |
| REG-06 | Existing Lab 2–3 Playwright requester, authentication, staff, administration, UI-quality, responsive, and visual suites. |

## 4. Role-by-Operation Security Matrix

| Operation | Requester | IT Staff | Administrator | Primary tests |
|---|---|---|---|---|
| Read Actions | Own Ticket: all; other: safe 404 | All Tickets | All Tickets | API-ACT-12, SEC-02/03 |
| Create/edit/assign/transition Action | Forbidden | Allowed | Allowed | API-ACT-01/07, SEC-02/03 |
| Reassign system-unassigned Action | Forbidden | Reassignment-only | Reassignment-only | API-ACT-10/11 |
| Read audit revisions through API/UI | No capability | No capability | No capability | API-ACT-13, SEC-06 |
| Formal Ticket transition | Forbidden | Allowed | Allowed | API-WF-01/03 |
| Requester advisory resolution | Own eligible Ticket | Forbidden | Forbidden | API-WF-08 |
| Requester dashboard | Own metrics | Forbidden | Forbidden | API-RD-01/02, SEC-04 |
| Staff dashboard | Forbidden | Allowed | Allowed | API-SD-05, SEC-04 |
| Mutations without CSRF | Rejected | Rejected | Rejected | SEC-01 |

## 5. Detailed High-Risk Test Cases

The inventory above is the complete set of 78 test IDs. The 16 `TC-D01`–`TC-D16` subsections below are expanded descriptions and groupings of those existing inventory IDs; they are not 16 additional planned tests and are excluded from the 78-ID count. Remaining inventory cases follow the same fixture/assertion conventions.

### TC-D01 — Valid Action Creation (`API-ACT-01`)

- **Related:** FR-L4-ACT-01–05/08; AC-L4-01.
- **Level:** API/integration.
- **Preconditions/data:** active staff creator, different active admin assignee, Ticket owned by third user, valid CSRF/session, fresh UUID.
- **Steps:** POST the complete planned Action payload; read Action and database row.
- **Expected:** `201`; Ticket/performer/assignee are distinct and correct; version 1; server timestamps; exactly one row; no revision yet.
- **Evidence:** Vitest result plus selected database assertion output.

### TC-D02 — Conditional Validation (`API-ACT-04`)

- **Related:** FR-L4-ACT-02; AC-L4-02.
- **Level:** unit/API boundary matrix.
- **Preconditions/data:** valid Ticket/actor; per-field cases—not one generic limit—cover description 0/whitespace/1/2000/2001, nonterminal result 0/2000/2001, completed result 0/whitespace/1/2000/2001, follow-up note conditional null/whitespace/1/2000/2001, Attachment Notes omitted/null/whitespace/1/2000/2001, Boolean type, UUID, assignee ID/eligibility, creation status, and unknown fields.
- **Steps:** submit each case in isolated transaction/fixture.
- **Expected:** exact boundary cases accepted; invalid cases return field-specific `400` and create nothing.
- **Evidence:** parameterized test output.

### TC-D03 — Unassigned Recovery (`API-ACT-10`, `API-ACT-11`)

- **Related:** FR-L4-ACT-05/07; AC-L4-05.
- **Level:** API/database.
- **Preconditions/data:** nonterminal Action assigned to staff who is deactivated/demoted.
- **Steps:** perform eligibility change; attempt completion, content edit, combined reassign/edit, invalid assignee, then versioned eligible reassignment-only patch.
- **Expected:** cleanup sets assignee null; blocked requests return contracted errors without mutation; only reassignment-only succeeds, increments version, and appends one revision.
- **Evidence:** API responses and before/after/revision database assertions.

### TC-D04 — Audit Revision (`API-ACT-13`)

- **Related:** FR-L4-ACT-07; AC-L4-06.
- **Level:** API/database/security.
- **Preconditions/data:** version-1 active Action.
- **Steps:** edit once; inspect database; probe plausible revision URLs as each role.
- **Expected:** one version-2 snapshot with correct editor/time/before/after; original revision is immutable; no revision-read endpoint/UI exists and no normal payload leaks snapshots.
- **Evidence:** DB assertions and route-response assertions.

### TC-D05 — Duplicate/Racing Create (`REL-01`, `REL-02`)

- **Related:** FR-L4-ACT-08; AC-L4-08.
- **Level:** concurrent API.
- **Preconditions/data:** fresh key; identical and differing canonical payload pairs.
- **Steps:** release two requests concurrently using a barrier.
- **Expected:** identical pair yields one `201`, one replay `200`, one row; differing pair yields one winner and one `409 IDEMPOTENCY_CONFLICT`.
- **Evidence:** responses and row count.

### TC-D06 — Stale Action Edit (`API-ACT-16`)

- **Related:** FR-L4-ACT-08; AC-L4-09.
- **Level:** API/UI component.
- **Preconditions/data:** two clients holding version 1.
- **Steps:** client A edits; client B edits version 1; UI handles conflict.
- **Expected:** A wins/version 2/revision; B gets `STALE_ACTION` and cannot overwrite; UI preserves B draft and offers latest-state review.
- **Evidence:** API/DB assertions and component interaction output.

### TC-D07 — Full Ticket Transition Matrix (`API-WF-01`, `API-WF-02`)

- **Related:** FR-L4-WF-01/02; AC-L4-10.
- **Level:** unit/API parameterized.
- **Preconditions/data:** fresh Ticket for each ordered status pair, authenticated staff/admin, valid CSRF, and current `workflowVersion`; every otherwise-permitted target `RESOLVED` fixture has a related `COMPLETED` Action with trimmed nonblank result. Invalid-pair fixtures also satisfy all unrelated preconditions so `INVALID_STATUS_TRANSITION` is the tested cause.
- **Steps:** submit all 8×8 pairs with matching version as staff and admin.
- **Expected:** exactly documented edges and same-state behavior succeed; all others conflict; no rejected request changes version/state.
- **Evidence:** named matrix cases and DB assertions.

### TC-D08 — Resolution Gate Atomicity (`API-WF-05–07`)

- **Related:** FR-L4-WF-02/03; AC-L4-11.
- **Level:** API/database.
- **Preconditions/data:** separate Tickets with zero, planned, cancelled, completed-blank, and completed-nonblank Actions.
- **Steps:** request `RESOLVED` with current workflow version.
- **Expected:** only completed-nonblank qualifies; accepted update sets status/resolvedAt/version together; rejected cases change nothing.
- **Evidence:** response and transaction-state assertions.

### TC-D09 — Stale Ticket Workflow (`REL-03`)

- **Related:** FR-L4-WF-02; AC-L4-13.
- **Level:** concurrent API.
- **Preconditions/data:** two allowed transitions from same version.
- **Steps:** race requests.
- **Expected:** one winner; loser gets `STALE_TICKET`; final state/version is exactly the winner, without mixed timestamp/advisory state.
- **Evidence:** concurrent responses and final row.

### TC-D10 — Requester Dashboard Isolation (`API-RD-01–04`)

- **Related:** FR-L4-RD-01/02; AC-L4-14.
- **Level:** API.
- **Preconditions/data:** two requesters with deliberately overlapping status/time patterns and more than five records.
- **Steps:** fetch as each Requester and independently calculate expected values.
- **Expected:** exact owned counts, stable top five, UTC timestamps, zero/empty keys, and no foreign identifiers. For each drill-down, `totalItems` equals the metric/filter count and concatenating all pages equals the complete scoped dataset; each dashboard summary is exactly the first five items under its contract ordering.
- **Evidence:** API payload versus direct scoped aggregate assertions.

### TC-D11 — Staff Dashboard Snapshot (`API-SD-01–06`, `REL-05`)

- **Related:** FR-L4-SD-01–03; AC-L4-15/16/17.
- **Level:** API/concurrency.
- **Preconditions/data:** all statuses/priorities/owners and current Actions; controlled concurrent update.
- **Steps:** fetch as staff/admin/requester; follow hrefs; trigger update during transaction.
- **Expected:** staff/admin equivalent, Requester forbidden, and exact coherent snapshot. Metric-card values equal drill-down `totalItems`; all pages combined equal the full filtered set; recent urgent is only the first five ordered matching Tickets. Current-Action item links open the authorized Ticket fragment and are not treated as a full-list dataset.
- **Evidence:** payload/direct-query comparison and route assertions.

### TC-D12 — Non-destructive Seed Rerun (`MIG-05`)

- **Related:** FR-L4-ACT-01, RD-02, SD-02; AC-L4-19.
- **Level:** migration/seed integration.
- **Preconditions/data:** seed once; manually modify canonical account, Ticket, and Action; delete a different canonical seed Action.
- **Steps:** rerun seed twice.
- **Expected:** missing record restored once; modified records unchanged; no duplicates; demonstration datasets remain sufficient.
- **Evidence:** before/after snapshots, unique counts, seed command output.

### TC-D13 — Migration Preservation (`MIG-01–04`)

- **Related:** FR-L4-ACT-01, HARD-03; AC-L4-18.
- **Level:** migration integration.
- **Preconditions/data:** Lab 3 schema/data snapshot with attachments/comments/notes and resolved/closed/open Tickets.
- **Steps:** record counts/checksums; deploy migration; query relations/backfill; exercise legacy reads.
- **Expected:** counts/relationships preserved, no orphans, defaults/backfill correct, zero-Action legacy Tickets work.
- **Evidence:** migration output and pre/post assertion report.

### TC-D14 — UI Safe Failure and Duplicate Submit (`UI-03`, `UI-05`)

- **Related:** FR-L4-HARD-01; AC-L4-20.
- **Level:** component/E2E.
- **Preconditions/data:** filled create/edit form; delayed, validation, 409, and 500 mock responses.
- **Steps:** double-click submit; simulate each response and retry.
- **Expected:** one in-flight request, draft retained for recoverable failures, accessible error focus, idempotent retry, authoritative refresh after success.
- **Evidence:** request counts, DOM/focus assertions, E2E trace for representative failure.

### TC-D15 — Accessibility and Responsive Verification (`UI-07`, `UI-08`, `E2E-02`)

- **Related:** FR-L4-HARD-04; AC-L4-22.
- **Level:** component/E2E/manual.
- **Preconditions/data:** populated and empty dashboards plus create/edit/conflict modes.
- **Steps:** keyboard-only traversal; inspect names/roles/live regions/focus; capture desktop/tablet/mobile; measure scroll width.
- **Expected:** logical order, visible focus, labelled controls/dialogs, non-color cues, focus restoration, no clipping/overlap/horizontal overflow.
- **Evidence:** assertions, checklist, screenshots.

### TC-D16 — Labs 1–3 Regression (`REG-01–06`, `E2E-05`)

- **Related:** FR-L4-HARD-03; AC-L4-23.
- **Level:** full regression.
- **Preconditions/data:** clean migrated/seeded isolated databases.
- **Steps:** run all existing suites plus representative cross-role E2E; update status callers only for required workflow version.
- **Expected:** approved legacy behavior passes; no console errors/broken links; contract change does not remove prior permitted transitions.
- **Evidence:** complete command logs and Playwright report.

## 6. Existing Automated Tests Identified for Reuse

- Server: all files under `server/tests/lab-01`, `lab-02`, and `lab-03`, especially `staff-workflow.api.test.ts`, `authorization.api.test.ts`, `users-admin.api.test.ts`, and `unit/status-transitions.test.ts`.
- Client: all files under `client/tests/lab-01`, `lab-02`, and `lab-03`, especially `StaffTicketDetail`, `StaffTicketQueue`, `UserManagement`, `RequesterTicketDetail`, and `AppShell` tests.
- E2E: Lab 2 requester/error/responsive flows and Lab 3 authentication/staff/admin/UI-quality/visual flows.
- Reuse means rerun and minimally adapt fixtures/callers for the approved `workflowVersion` request change; it does not mean claiming those tests already cover Lab 4.

## 7. Test Execution and Exit Criteria

### 7.1 Required Commands

From `toktickit` after implementation and test configuration are complete:

```powershell
cd server
npm run build
npm run test:db
npm test

cd ..\client
npm run build
npm test

cd ..
npm run test:e2e
```

Migration/seed verification additionally runs `prisma migrate deploy` and the seed command against disposable Lab 3 and clean test databases through the planned test harness. Never point these commands at development/production data.

### 7.2 Manual Verification and Evidence

- Confirm dashboard values against scoped database queries for one Requester, one staff member, and Administrator equivalence.
- Complete keyboard-only flows and the UI checklist at desktop, tablet, and 375×812.
- Capture dashboard and Actions list/create/view/edit/validation/conflict screenshots plus Playwright JSON/traces.
- Record tested commit, environment, database setup, command, result counts, failures, and artifact paths in final verification documentation.

### 7.3 Pass/Fail and Defects

- A test passes only when all expected response, UI, database, and no-side-effect assertions hold.
- Flaky retry is not a pass; reproduce and fix or record an approved blocker.
- Defects include test ID, contract reference, environment/commit, minimal reproduction, expected/actual result, severity, logs/screenshots, and retest result.

### 7.4 Feature 15 Documentation Definition of Done

Feature 15 is complete for review when:

1. This `tests.md` contains exactly 78 unique planned inventory IDs and clearly treats `TC-D01`–`TC-D16` as expansions, not additional IDs.
2. All 23 approved FRs and all 23 ACs appear in traceability with at least one planned test, using contract-exact endpoints, fields, roles, transitions, errors, calculations, and UI behavior.
3. Unit, API, security, concurrency, migration/seed, UI, E2E, and Labs 1–3 regression plans are measurable and identify intended files/tools/evidence.
4. Markdown, identifiers, counts, commands, scope statements, and cross-references pass review with no unresolved contradiction or invented product requirement.
5. Only `docs/lab-04/tests.md` is changed; no tests are implemented and no passing execution claim is made in Feature 15.

These criteria approve the test design document only. They do not declare the Lab 4 product or its future automated tests complete.

### 7.5 Final Lab 4 Test Execution and Release Exit Criteria

After later implementation, final Lab 4 product/release completion requires:

1. All 78 planned cases implemented or explicitly mapped to equivalent parameterized automated coverage; no missing FR/AC mapping.
2. All automated unit/API/component/E2E and full Labs 1–3 regression passing on the integrated commit.
3. Migration preservation, rollback/recovery rehearsal, referential integrity, and non-destructive seed rerun evidence passing.
4. No unresolved critical/high authorization, data-loss, concurrency, workflow, ownership, or accessibility defects.
5. Required manual responsive/accessibility/database-metric checks completed with readable evidence.
6. No unsafe errors, console errors, broken links, unfinished controls, or unexplained test exclusions.

## 8. Known Test-Design Notes

- No genuine product ambiguity remains in the approved contract. Action audit revisions are deliberately internal with no user-facing read endpoint.
- Lab 4 implementation/test files and Playwright Lab 4 inclusion are planned, not present at the time of this design.
- `API-SD-06` denotes the combined staff dashboard snapshot/drill-down assertion used in traceability and TC-D11.
