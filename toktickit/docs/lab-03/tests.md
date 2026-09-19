# Lab 3 Test Plan and Traceability

> **Document Status**: Draft — Pending Review  
> **Engineering Contracts**: [`specification.md`](./specification.md), [`ui-spec.md`](./ui-spec.md), [`api-spec.md`](./api-spec.md)  
> **Execution State**: **Partial** — Feature 10 `API-MIG-01` and `API-SEED-01` passed on 2026-09-19; unrelated Lab 3 tests remain **Not Run**.

---

## 1. Test Infrastructure & Directory Structure

### 1.1 Tools and Test Stack
| Layer | Tool | Config File |
| :--- | :--- | :--- |
| **Server Unit & API Integration** | Vitest + Supertest | `server/vitest.config.ts` |
| **Client UI Components** | Vitest + React Testing Library + jsdom | `client/vite.config.ts` |
| **End-to-End (E2E)** | Playwright (Chromium) | `playwright.config.ts` |
| **Database Isolation** | PostgreSQL (`toktickit_test` / `toktickit_e2e_test`) | `server/.env.test` |

### 1.2 Test Database & Storage Isolation Strategy
- **Database Isolation**: API integration tests run against `TEST_DATABASE_URL` targeting `toktickit_test`. Normal development data is never touched or cleaned.
- **Feature 10 Isolation**: `npm.cmd run test:feature10` creates uniquely named `toktickit_feature10_*_test` databases, tracks exactly what it creates, stages historical migrations outside the repository, and cleans up only its own databases and temporary attachment directory.
- **Upload Isolation**: Attachment tests configure `UPLOAD_DIR` to a temporary test directory (e.g. `server/test-uploads/`) cleaned up in `afterAll`.
- **Seed Invariance**: Seed tests verify that repeated runs do not overwrite user-edited emails, names, passwords, or operational ticket states.
- **CSRF Test Client**: Integration test requests include `.set("X-Requested-With", "XMLHttpRequest")` and `.set("Origin", "http://localhost:5173")` to satisfy the server CSRF middleware.

### 1.3 Planned Test File Tree
```
toktickit/
├── server/tests/
│   ├── lab-01/                                  <- Historical Lab 1 tests (untouched)
│   ├── lab-02/                                  <- Lab 2 API tests (adapted to session cookies)
│   └── lab-03/
│       ├── unit/
│       │   ├── password-validation.test.ts      <- Password complexity, 72-byte UTF-8, whitespace rules
│       │   └── status-transitions.test.ts       <- 8-state transition matrix and same-status no-ops
│       ├── auth.api.test.ts                     <- Login, rate limits, CSRF, session expiry, logout replay
│       ├── authorization.api.test.ts            <- RBAC matrix, requester ownership, 404 info-hiding
│       ├── staff-queue.api.test.ts              <- Queue search, filter, sort, pagination, tie-breaking
│       ├── staff-ticket-detail.api.test.ts      <- Claim/reassign, auto-advance, priority, status, appear-resolved
│       ├── comments-notes.api.test.ts           <- Public comments & internal notes view and append
│       └── users-admin.api.test.ts              <- Admin user CRUD, safety constraints, session revocation
├── server/scripts/
│   └── test-feature10.mjs                       <- Dedicated migration and seed preservation harness
├── client/tests/
│   ├── lab-01/                                  <- Historical Lab 1 UI tests (untouched)
│   ├── lab-02/                                  <- Lab 2 UI tests
│   └── lab-03/
│       ├── AppShell.test.tsx                    <- Role-based navigation, avatar, and logout menu
│       ├── Login.test.tsx                       <- Login form, password toggle, busy state, alerts, responsive
│       ├── ChangePassword.test.tsx              <- First-login gate, complexity checklist, submit
│       ├── RequesterTicketDetail.test.tsx       <- Comments thread, "Problem Appears Resolved" button & caption
│       ├── StaffTicketQueue.test.tsx            <- Table view, search/filter controls, pagination, responsive
│       ├── StaffTicketDetail.test.tsx           <- Operational controls, comments, confidential notes
│       └── UserManagement.test.tsx              <- User list, creation modal, edit safety constraints, focus trap
└── e2e/
    ├── lab-02/                                  <- Lab 2 E2E (adapted to real login)
    └── lab-03/
        ├── authentication.spec.ts               <- Login, mandatory first-login change, logout flow
        ├── staff-ticket-flow.spec.ts            <- Staff triage, claim, priority, status progression, notes
        ├── user-administration.spec.ts          <- Admin user creation, safety rules, password reset login
        └── ui-quality.spec.ts                   <- Responsive layout, a11y focus traps, mutation failure recovery, safe text
```

---

## 2. Traceability Matrices

### 2.1 AC to Test ID Traceability Matrix

| AC ID | Requirement Summary | Planned Test IDs | Target Test File | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AC-01** | Valid credentials login & session cookie establishment | `API-AUTH-01`, `UI-AUTH-01`, `E2E-AUTH-01`, `E2E-RESP-01` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/Login.test.tsx`<br>`e2e/lab-03/authentication.spec.ts`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-02** | Invalid credentials & inactive account rejection (401) | `API-AUTH-02`, `API-AUTH-03`, `UI-AUTH-02` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/Login.test.tsx` | **Not Run** |
| **AC-03** | Login rate limiting (5 failed attempts -> 429) | `API-AUTH-04` | `server/tests/lab-03/auth.api.test.ts` | **Not Run** |
| **AC-04** | Mandatory first-login password change gate | `API-AUTH-05`, `UI-GATE-01`, `E2E-AUTH-02`, `E2E-RESP-01` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/ChangePassword.test.tsx`<br>`e2e/lab-03/authentication.spec.ts`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-05** | Password complexity & boundary rules ($\ge 8$ code points, $\le 72$ bytes, non-equality) | `UNIT-PWD-01`–`UNIT-PWD-06`, `API-AUTH-06`, `API-AUTH-07`, `API-AUTH-12`, `UI-GATE-02` | `server/tests/lab-03/unit/password-validation.test.ts`<br>`server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/ChangePassword.test.tsx` | **Not Run** |
| **AC-06** | Session profile retrieval & 8-hour expiry (`now >= expiresAt`) | `API-AUTH-08`, `API-AUTH-09`, `UI-SHELL-01` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/AppShell.test.tsx` | **Not Run** |
| **AC-07** | Logout invalidation & cookie replay prevention | `API-AUTH-10`, `API-AUTH-11`, `API-AUTH-13`, `UI-SHELL-02`, `E2E-AUTH-03` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/AppShell.test.tsx`<br>`e2e/lab-03/authentication.spec.ts` | **Not Run** |
| **AC-08** | Server-enforced CSRF protection (`X-Requested-With` & Origin) | `API-CSRF-01`, `API-CSRF-02`, `API-CSRF-03` | `server/tests/lab-03/auth.api.test.ts` | **Not Run** |
| **AC-09** | Requester ownership derived strictly from session | `API-REQ-01`, `E2E-RESP-01` | `server/tests/lab-03/authorization.api.test.ts`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-10** | My Tickets scoping to authenticated user across all roles | `API-REQ-02`, `E2E-RESP-01` | `server/tests/lab-03/authorization.api.test.ts`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-11** | Requester cross-resource isolation (404 information hiding) | `API-SEC-01`, `API-SEC-02` | `server/tests/lab-03/authorization.api.test.ts` | **Not Run** |
| **AC-12** | Public Comments view and append with safe text representation | `API-COM-01`, `API-COM-02`, `API-COM-04`, `UI-COM-01`, `E2E-FAIL-01`, `E2E-TEXT-01`, `E2E-RESP-01` | `server/tests/lab-03/comments-notes.api.test.ts`<br>`client/tests/lab-03/RequesterTicketDetail.test.tsx`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-13** | Requester "Problem Appears Resolved" signal & automated comment | `API-STAT-06`, `UI-REQ-01`, `E2E-STAFF-02` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/RequesterTicketDetail.test.tsx`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` | **Not Run** |
| **AC-14** | Resolution signal idempotency and timestamp preservation | `API-STAT-07`, `API-STAT-11` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **Not Run** |
| **AC-15** | Resolution reset on reopen or manual comment submission | `API-STAT-08`, `API-COM-03` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`server/tests/lab-03/comments-notes.api.test.ts` | **Not Run** |
| **AC-16** | Resolution action errors (401 unauth, 403 non-req, 404 non-owner, 400 ineligible status) | `API-STAT-09`, `API-STAT-12`, `API-STAT-13` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **Not Run** |
| **AC-17** | Internal Notes hidden & blocked from Requesters (404) | `API-NOTE-01`, `API-NOTE-02`, `UI-SEC-01` | `server/tests/lab-03/comments-notes.api.test.ts`<br>`client/tests/lab-03/RequesterTicketDetail.test.tsx` | **Not Run** |
| **AC-18** | Staff Internal Notes view and append with safe text representation | `API-NOTE-03`, `API-NOTE-04`, `API-NOTE-05`, `UI-NOTE-01`, `E2E-TEXT-01`, `E2E-RESP-01` | `server/tests/lab-03/comments-notes.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-19** | Staff Queue search, multi-filter, sort, tie-breaker, pagination | `API-QUEUE-01`–`API-QUEUE-04`, `UI-QUEUE-01`–`UI-QUEUE-03`, `UI-RESP-01`, `E2E-STAFF-01`, `E2E-RESP-01` | `server/tests/lab-03/staff-queue.api.test.ts`<br>`client/tests/lab-03/StaffTicketQueue.test.tsx`<br>`e2e/lab-03/staff-ticket-flow.spec.ts`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-20** | Ticket claim on `NEW` status auto-advancing to `OPEN` | `API-STAFF-01`, `UI-STAFF-01`, `E2E-RESP-01` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-21** | Ineligible assignment target rejection (400) | `API-STAFF-02` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **Not Run** |
| **AC-22** | Preserved historical owner references & orphaned ticket cleanup | `API-ADM-08`, `API-STAFF-10`, `API-STAFF-14` | `server/tests/lab-03/users-admin.api.test.ts`<br>`server/tests/lab-03/staff-ticket-detail.api.test.ts` | **Not Run** |
| **AC-23** | IT Priority modification independent of Requested Priority | `API-STAFF-03`, `UI-STAFF-01`, `E2E-RESP-01` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-24** | Permitted status transitions, same-status no-ops, invalid transitions | `UNIT-STAT-01`–`UNIT-STAT-03`, `API-STAFF-04`, `API-STAFF-05`, `UI-STAFF-01`, `E2E-RESP-01` | `server/tests/lab-03/unit/status-transitions.test.ts`<br>`server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-25** | Admin user list search & single-role filtering | `API-ADM-01`, `UI-ADM-01`, `E2E-ADM-01`, `E2E-A11Y-01`, `E2E-RESP-01` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/user-administration.spec.ts`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-26** | Admin user creation, password length check & duplicate rejection | `API-ADM-02`, `API-ADM-03`, `API-ADM-09`, `UI-ADM-02`, `E2E-FAIL-01`, `E2E-A11Y-01` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-27** | Admin user editing & duplicate email check on update | `API-ADM-04`, `UI-ADM-03`, `E2E-FAIL-01`, `E2E-A11Y-01` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-28** | Admin password reset & immediate session revocation | `API-ADM-07`, `UI-ADM-04`, `E2E-ADM-02`, `E2E-A11Y-01` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/user-administration.spec.ts`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-29** | Admin safety constraints (self-deactivation, last admin) | `API-ADM-05`, `API-ADM-06`, `UI-ADM-03`, `E2E-A11Y-01` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **AC-30** | Forbidden access by role & immediate enforcement upon role demotion | `API-RBAC-01`–`API-RBAC-04`, `API-RBAC-05` | `server/tests/lab-03/authorization.api.test.ts` | **Not Run** |
| **AC-31** | Non-destructive migration data preservation | `API-MIG-01` | `server/scripts/test-feature10.mjs` | **Passed — 2026-09-19** |
| **AC-32** | Canonical seedKey invariance across reruns | `API-SEED-01` | `server/scripts/test-feature10.mjs` | **Passed — 2026-09-19** |

### 2.2 UI Specification & Non-Functional Traceability (`ui-spec.md` §§5–7)

| UI Spec Section | Specification Requirement | Planned Test IDs | Target Test File | Status |
| :--- | :--- | :--- | :--- | :--- |
| **UI-Spec §6.1, §7** | Responsive Breakpoints & Zero Page Overflow (375x812, 768x1024, 1440x900 across 8 views; tablet table container scrolling; mobile card stacking; 0px page overflow) | `UI-RESP-01`, `E2E-RESP-01` | `client/tests/lab-03/StaffTicketQueue.test.tsx`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **UI-Spec §6.2, §7** | Keyboard Navigation & Focus Management (Tab/Shift+Tab order, visible focus rings, dialog initial focus, focus trap containment, and trigger restoration) | `UI-ADM-04`, `E2E-A11Y-01` | `client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **UI-Spec §5, §7** | Mutation Failure Recovery & Input Preservation (Server error display, preservation of uncommitted textarea/form input, re-enabled submit CTA, no false positive mutation) | `E2E-FAIL-01` | `e2e/lab-03/ui-quality.spec.ts` | **Not Run** |
| **UI-Spec §4.3, §4.5, §7** | Safe Text Rendering & XSS Injection Prevention (Literal rendering of HTML/script strings in public comments and confidential internal notes; no script execution) | `API-COM-01`, `API-NOTE-03`, `E2E-TEXT-01` | `server/tests/lab-03/comments-notes.api.test.ts`<br>`e2e/lab-03/ui-quality.spec.ts` | **Not Run** |

---

## 3. Planned Test Catalog

### 3.1 Server Unit Tests

#### `server/tests/lab-03/unit/password-validation.test.ts`
- `UNIT-PWD-01`: Valid password satisfying all complexity rules returns true. [AC-05]
- `UNIT-PWD-02`: Password with length < 8 Unicode code points (`Array.from(pwd).length < 8`) is rejected. [AC-05]
- `UNIT-PWD-03`: Password exceeding 72 UTF-8 bytes (`Buffer.byteLength > 72`) is rejected. [AC-05]
- `UNIT-PWD-04`: Multibyte UTF-8 password (e.g. Thai characters or emojis) within 72 bytes accepted; exceeding 72 bytes rejected. [AC-05]
- `UNIT-PWD-05`: Password missing uppercase, lowercase, number, or special symbol is rejected. [AC-05]
- `UNIT-PWD-06`: Leading and trailing whitespace is preserved and counted in byte length (never trimmed). [AC-05]

#### `server/tests/lab-03/unit/status-transitions.test.ts`
- `UNIT-STAT-01`: Valid transitions across all 8 statuses (`NEW` -> `OPEN` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`, etc.) return true. [AC-24]
- `UNIT-STAT-02`: Transitions away from terminal state `CANCELLED` return false. [AC-24]
- `UNIT-STAT-03`: Same-status submissions (including on `CANCELLED`) return true (no-op). [AC-24]

---

### 3.2 Server API Integration Tests

#### `server/tests/lab-03/auth.api.test.ts`
- `API-AUTH-01`: Valid login with correct CSRF headers returns 200, user profile, and sets `toktickit_session` cookie. [AC-01]
- `API-AUTH-02`: Invalid password returns 401 `INVALID_CREDENTIALS`. [AC-02]
- `API-AUTH-03`: Inactive account login returns 401 `INVALID_CREDENTIALS` without leaking account existence. [AC-02]
- `API-AUTH-04`: 6th failed login attempt within 15 minutes returns 429 `TOO_MANY_REQUESTS`. [AC-03]
- `API-AUTH-05`: Constrained user (`mustChangePassword = true`) receives 403 `MUST_CHANGE_PASSWORD` on business endpoints. [AC-04]
- `API-AUTH-06`: Password change with valid current and new password succeeds, updates password hash, and issues replacement session. [AC-05]
- `API-AUTH-07`: Password change fails if new password matches current password (`PASSWORD_SAME_AS_CURRENT`). [AC-05]
- `API-AUTH-08`: `GET /api/auth/me` returns user profile for active session. [AC-06]
- `API-AUTH-09`: Session evaluated at `now >= expiresAt` (exact 8-hour boundary) returns 401 `UNAUTHENTICATED`. [AC-06]
- `API-AUTH-10`: `POST /api/auth/logout` deletes database `Session` record and clears cookie. [AC-07]
- `API-AUTH-11`: Replaying a cookie from a logged-out session returns 401 `UNAUTHENTICATED`. [AC-07]
- `API-AUTH-12`: Password change fails if current password is wrong (`INVALID_CURRENT_PASSWORD`) or confirmation mismatches. [AC-05]
- `API-AUTH-13`: Replaying old cookie after password change returns 401 `UNAUTHENTICATED`. [AC-07]
- `API-CSRF-01`: Mutating request (`POST`, `PATCH`, `DELETE`) without `X-Requested-With` header returns 403 `CSRF_PROTECTION_FAILED`. [AC-08]
- `API-CSRF-02`: Request with untrusted or `null` Origin returns 403 `CSRF_PROTECTION_FAILED`. [AC-08]
- `API-CSRF-03`: Multipart upload with `X-Requested-With` and allowed Origin succeeds. [AC-08]

#### `server/tests/lab-03/authorization.api.test.ts`
- `API-REQ-01`: `POST /api/tickets` sets `requesterId` from session ID, ignoring any body override. [AC-09]
- `API-REQ-02`: `GET /api/tickets` returns only tickets created by the authenticated user across all roles. [AC-10]
- `API-SEC-01`: Requester accessing another user's ticket returns 404 `TICKET_NOT_FOUND`. [AC-11]
- `API-SEC-02`: Requester accessing another user's attachment returns 404 `ATTACHMENT_NOT_FOUND`. [AC-11]
- `API-RBAC-01`: Requester accessing Staff Queue returns 403 `FORBIDDEN`. [AC-30]
- `API-RBAC-02`: Requester accessing Admin User Management returns 403 `FORBIDDEN`. [AC-30]
- `API-RBAC-03`: IT Staff accessing Admin User Management returns 403 `FORBIDDEN`. [AC-30]
- `API-RBAC-04`: Demoting a user's role from IT Staff to Requester immediately causes next staff API call to return 403 `FORBIDDEN`. [AC-30]
- `API-RBAC-05`: Deactivating a user immediately causes next request from active session to return 401 `UNAUTHENTICATED`. [AC-30]

#### `server/tests/lab-03/staff-queue.api.test.ts`
- `API-QUEUE-01`: Staff retrieves queue with default sort (`createdAt DESC`, secondary tie-breaker `id DESC`). [AC-19]
- `API-QUEUE-02`: Staff filters queue by status (`OPEN`, `IN_PROGRESS`), category, and owner (`unassigned`, `me`). [AC-19]
- `API-QUEUE-03`: Staff searches queue by ticket number, summary, and requester name. [AC-19]
- `API-QUEUE-04`: Invalid sort column or page size returns 400 `VALIDATION_ERROR`. [AC-19]

#### `server/tests/lab-03/staff-ticket-detail.api.test.ts`
- `API-STAFF-01`: IT Staff self-claims an unassigned ticket in status `NEW`; `ownerId` updates and status advances to `OPEN`. [AC-20]
- `API-STAFF-02`: Assigning ticket to an inactive user or user with role `REQUESTER` returns 400 `INELIGIBLE_OWNER`. [AC-21]
- `API-STAFF-03`: Updating IT Priority updates `itPriority` while leaving `requestedPriority` unchanged. [AC-23]
- `API-STAFF-04`: Permitted status transitions succeed; invalid transitions return 400 `INVALID_STATUS_TRANSITION`. [AC-24]
- `API-STAFF-05`: Submitting existing status returns 200 OK (no-op). [AC-24]
- `API-STAT-06`: Requester calls `POST /api/tickets/:id/appear-resolved`; sets `requesterResolved = true`, records timestamp, and appends automated comment. [AC-13]
- `API-STAT-07`: Repeated `appear-resolved` calls return 200 OK without creating duplicate comments or altering timestamp. [AC-14]
- `API-STAT-08`: Reopening a ticket (`status = REOPENED`) resets `requesterResolved = false` and `requesterResolvedAt = null`. [AC-15]
- `API-STAT-09`: `appear-resolved` on ineligible status (`NEW`, `REOPENED`, `RESOLVED`, `CLOSED`, `CANCELLED`) returns 400 `INVALID_STATUS_FOR_RESOLUTION`. [AC-16]
- `API-STAFF-10`: Reopening a ticket with an inactive/demoted owner clears `ownerId` to `null`. [AC-22]
- `API-STAT-11`: Concurrent repeat `appear-resolved` calls atomically create exactly one automated comment. [AC-14]
- `API-STAT-12`: `appear-resolved` called by non-Requester role returns 403 `FORBIDDEN`. [AC-16]
- `API-STAT-13`: `appear-resolved` called on another user's ticket returns 404 `TICKET_NOT_FOUND`. [AC-16]
- `API-STAFF-14`: Unassigning ticket (`ownerId: null`) and valid reassignment to another active staff succeeds. [AC-22]

#### `server/tests/lab-03/comments-notes.api.test.ts`
- `API-COM-01`: Requester posts public comment on owned ticket; returns 201 with stored raw text (no double escaping). [AC-12]
- `API-COM-02`: Staff posts public comment on any ticket. [AC-12]
- `API-COM-03`: Requester posting manual comment clears `requesterResolved` flag. [AC-15]
- `API-COM-04`: Empty, whitespace-only, or comment > 2000 characters returns 400 `VALIDATION_ERROR`. [AC-12]
- `API-NOTE-01`: Requester calling `GET /api/tickets/:id/internal-notes` returns 404 `TICKET_NOT_FOUND`. [AC-17]
- `API-NOTE-02`: Requester calling `POST /api/tickets/:id/internal-notes` returns 404 `TICKET_NOT_FOUND`. [AC-17]
- `API-NOTE-03`: Staff/Admin creates and views internal notes on any ticket. [AC-18]
- `API-NOTE-04`: Internal notes are append-only; author attribution and server timestamps are recorded. [AC-18]
- `API-NOTE-05`: Empty, whitespace-only, or note > 2000 characters returns 400 `VALIDATION_ERROR`. [AC-18]

#### `server/tests/lab-03/users-admin.api.test.ts`
- `API-ADM-01`: Admin lists users with search and role filter. [AC-25]
- `API-ADM-02`: Admin creates user with initial password; sets `mustChangePassword = true`. [AC-26]
- `API-ADM-03`: Duplicate email on create returns 409 `DUPLICATE_EMAIL`. [AC-26]
- `API-ADM-04`: Admin updates user; duplicate email on edit returns 409 `DUPLICATE_EMAIL`. [AC-27]
- `API-ADM-05`: Admin attempting to deactivate self receives 400 `CANNOT_DEACTIVATE_SELF`. [AC-29]
- `API-ADM-06`: Admin attempting to deactivate or demote the last active admin receives 400 `CANNOT_DEACTIVATE_LAST_ADMIN`. [AC-29]
- `API-ADM-07`: Admin resets initial password; sets `mustChangePassword = true` and invalidates active sessions. [AC-28]
- `API-ADM-08`: Deactivating staff unassigns active tickets (`ownerId = null`) while preserving `ownerId` on completed/terminal tickets. [AC-22]
- `API-ADM-09`: Admin creating user with invalid role value returns 400 `VALIDATION_ERROR`. [AC-26]

#### `server/scripts/test-feature10.mjs` (dedicated; excluded from ordinary Vitest discovery)
- `API-MIG-01`: Migration verification: `DevelopmentRequester` records mapped to `User` with preserved IDs, tickets, and attachments. [AC-31]
- `API-SEED-01`: Seed rerun with existing edited emails and temporary passwords preserves modifications without duplicate records. [AC-32]

Executed with `npm.cmd run test:feature10` on 2026-09-19: **Passed**. The harness also verified fresh-chain deployment, atomic rollback on case-insensitive legacy email collisions, SQL-enforced case-insensitive uniqueness, bcrypt cost 10, preserved attachment bytes, no seeded sessions, and monotonic ticket numbering.

---

### 3.3 Client UI Component Tests

#### `client/tests/lab-03/Login.test.tsx`
- `UI-AUTH-01`: Renders email, password inputs, and password visibility toggle. [AC-01]
- `UI-AUTH-02`: Displays validation errors for empty fields and error banner on 401. [AC-02]
- `UI-AUTH-03`: Submit button enters disabled busy spinner state during request. [AC-01]

#### `client/tests/lab-03/ChangePassword.test.tsx`
- `UI-GATE-01`: Constrained user is locked to change-password view. [AC-04]
- `UI-GATE-02`: Dynamic password checklist updates green checkmarks for length ($\ge 8$ code points, $\le 72$ bytes), casing, number, symbol, and difference. [AC-05]
- `UI-GATE-03`: Successful submit redirects user to role landing page. [AC-05]

#### `client/tests/lab-03/AppShell.test.tsx`
- `UI-SHELL-01`: Header renders role-tailored navigation items for Requester, Staff, and Admin. [AC-06]
- `UI-SHELL-02`: Header renders avatar initials, role badge, and Sign Out action. [AC-07]

#### `client/tests/lab-03/RequesterTicketDetail.test.tsx`
- `UI-REQ-01`: Renders "Problem Appears Resolved" button in active statuses with caption "Posting a new comment will clear this indication." [AC-13]
- `UI-COM-01`: Public Comments thread displays message history and post comment form. [AC-12]
- `UI-SEC-01`: Confidential internal notes are completely omitted from DOM. [AC-17]

#### `client/tests/lab-03/StaffTicketQueue.test.tsx`
- `UI-QUEUE-01`: Renders queue table with 8 status badges, priority badges, and owner. [AC-19]
- `UI-QUEUE-02`: Search and filter controls trigger debounced query updates. [AC-19]
- `UI-QUEUE-03`: Renders loading, empty, and no-results feedback states. [AC-19]
- `UI-RESP-01`: Component structure test verifying responsive wrapper elements on tablet viewports and stacked card layout on mobile viewports. (Does not claim to verify actual browser page overflow; references `E2E-RESP-01` for browser layout and zero-overflow verification). [AC-19, ui-spec.md §6.1]

#### `client/tests/lab-03/StaffTicketDetail.test.tsx`
- `UI-STAFF-01`: Operational bar displays Claim/Assign, IT Priority, and Status menus. [AC-20, AC-23, AC-24]
- `UI-STAFF-02`: Displays green banner when `requesterResolved = true` with timestamp. [AC-13]
- `UI-NOTE-01`: Internal notes container rendered with distinct amber confidentiality styling. [AC-18]

#### `client/tests/lab-03/UserManagement.test.tsx`
- `UI-ADM-01`: Renders user list with search, filter, and Active/Inactive badges. [AC-25]
- `UI-ADM-02`: Create User modal validates required inputs, role select, and initial password. [AC-26]
- `UI-ADM-03`: Edit modal disables self-deactivation and last admin deactivation. [AC-27, AC-29]
- `UI-ADM-04`: Reset Password trigger opens temporary password input with focus trap in modal. [AC-28, ui-spec.md §6.2]

---

### 3.4 End-to-End (E2E) Playwright Tests

#### `e2e/lab-03/authentication.spec.ts`
- `E2E-AUTH-01`: Requester logs in with valid credentials, navigates My Tickets, logs out. [AC-01, AC-07]
- `E2E-AUTH-02`: User with `mustChangePassword = true` logs in, is forced to change password, and enters app. [AC-04, AC-05]
- `E2E-AUTH-03`: Unauthenticated access to protected route redirects to `/login`. [AC-07]

#### `e2e/lab-03/staff-ticket-flow.spec.ts`
- `E2E-STAFF-01`: Staff logs in, claims `NEW` ticket in queue (auto-advancing to `OPEN`), updates IT Priority, posts Internal Note, transitions status. [AC-18, AC-19, AC-20, AC-23, AC-24]
- `E2E-STAFF-02`: Requester clicks "Problem Appears Resolved"; Staff sees alert banner and resolves ticket. [AC-13, AC-24]

#### `e2e/lab-03/user-administration.spec.ts`
- `E2E-ADM-01`: Admin creates new IT Staff account, verifies duplicate email guard, and verifies self-deactivation block. [AC-25, AC-26, AC-29]
- `E2E-ADM-02`: Admin resets password for user; user logs in with new temporary password, is prompted to change password, and succeeds. [AC-28, AC-04]

#### `e2e/lab-03/ui-quality.spec.ts`
- `E2E-RESP-01`: Check login, change password, Create Ticket, My Tickets, requester detail, staff queue, staff detail, and User Management at 375x812, 768x1024, and 1440x900. Assert no horizontal page overflow. Check tablet table scrolling stays inside its container and mobile tables use cards. [AC-19, AC-25, ui-spec.md §6.1, §7]
- `E2E-A11Y-01`: Verify keyboard navigation and visible focus. For user-management dialogs (Create User, Edit User, Reset Password), verify initial focus, Tab/Shift+Tab focus containment, and focus restoration to the opening button. [AC-25, AC-29, ui-spec.md §6.2, §7]
- `E2E-FAIL-01`: Simulate failed comment submission and failed user save. Show an error, preserve entered values, re-enable submission, and avoid displaying a successful mutation. [AC-12, AC-26, AC-27, ui-spec.md §5, §7]
- `E2E-TEXT-01`: Render public comments and internal notes containing HTML-like text. Verify literal text is displayed and no injected element or script executes. [AC-12, AC-18, ui-spec.md §4.3, §4.5, §7]

---

## 4. Lab 2 Regression Adaptation Strategy

Lab 2 tests were bound to the simulated `x-requester-id` header and client-side `localStorage`. To preserve 100% of their business logic coverage without regressions:

1. **Authentication Test Helpers (`server/tests/lab-03/auth-helper.ts`)**:
   - Provide an `authenticatedSession(email, role)` helper that provisions a `Session` record in the test database and returns the signed `Cookie` and `X-Requested-With` headers.
2. **Server API Test Adaptation**:
   - In `create-ticket.api.test.ts`, `my-tickets.api.test.ts`, `ticket-detail.api.test.ts`, and `attachments.api.test.ts`:
     - Replace `.set("x-requester-id", String(id))` with `.set("Cookie", sessionCookie).set("X-Requested-With", "XMLHttpRequest")`.
     - Retain all validation boundary tests, attachment MIME checks (JPG/PNG/WEBP/PDF), 5 MB file size limits, 5 active attachments maximum, and soft-removal audit metadata verification verbatim.
3. **Client Component Test Adaptation**:
   - Wrap components in mock `AuthContext` supplying `{ user: activeUser, isAuthenticated: true }` in place of the retired `RequesterContext`.
4. **E2E Test Adaptation**:
   - In `requester-ticket-flow.spec.ts`, replace the initial selector dropdown interaction with real UI login via `/login`.
