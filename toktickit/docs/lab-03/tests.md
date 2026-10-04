# Lab 3 verification and traceability

## Profile dropdown and clock-brand update (2026-10-03)

- `UI-SHELL-01` covers the shared Requester, IT Staff, and Administrator dropdown plus authenticated name/role rendering.
- `UI-SHELL-02,03` cover the existing Change Password and Logout actions and action dismissal.
- `UI-SHELL-04,05` cover outside-click dismissal, Arrow Down keyboard opening, Escape dismissal, and trigger focus restoration.
- The isolated visual-evidence setup captures the open menu at desktop and 375×812 mobile widths; both captures include the reusable clock branding and explicitly check mobile horizontal overflow.

Verification date: 2026-09-24. Results in this file are from Feature 14 and include its uncommitted evidence-test and documentation changes. A passing test is cited only where its assertions exercise the stated behavior.

## Acceptance-criterion traceability

| AC | Implementation | Assertion evidence | Result / gap |
| --- | --- | --- | --- |
| AC-01 | `server/src/auth.ts`, login UI | `AUTH-LOGIN-04`; `UI-AUTH-01`; `E2E-AUTH-01` | Passed |
| AC-02 | Login credential and active-account checks | `AUTH-LOGIN-02`, `03`, `05`; `UI-AUTH-02` | Passed |
| AC-03 | Per-email failed-login limiter | `AUTH-LOGIN-06` | Passed |
| AC-04 | Mandatory-change middleware and route | `MCP-01`–`03`; `UI-GATE-01`, `03`; `E2E-AUTH-02` | Passed |
| AC-05 | Unicode/byte password validator and change endpoint | `UNIT-PWD-01`–`09`; `AUTH-CHPW-01`–`05`; `UI-GATE-01,02` | Passed |
| AC-06 | Session lookup/expiry and `/auth/me` | `AUTH-ME-02`, `03`; `UI-SHELL-01` | Passed; shared role profile menu displays authenticated name and role; exact expired boundary is set by the API fixture |
| AC-07 | Session deletion/replacement and cookie clearing | `AUTH-LOGOUT-01`, `02`; `AUTH-CHPW-06`; `UI-SHELL-02,03`; `E2E-AUTH-01,03` | Passed |
| AC-08 | Global CSRF/origin middleware | `CSRF-01`, `02`, `02b`, `02c`, `03`; Lab 2 mutation tests | Passed, including precedence and multipart requests |
| AC-09 | Session-derived ticket requester | `AUTHZ-OWN-02`; `API-TCK-001–006` | Passed; forged `requesterId` is rejected, not trusted |
| AC-10 | Requester-scoped list query | `API-LST-001–024` | Passed |
| AC-11 | Ownership-aware ticket/attachment lookups | `AUTHZ-OWN-01`; `API-DTL-003,004`; `API-ATT-011,012`; `E2E-003,004` | Passed with indistinguishable 404s |
| AC-12 | Comment API and React text rendering | `API-COM-01–04`; `E2E-FAIL-01`; `E2E-TEXT-01` | Passed, including failed-submit recovery and literal HTML-like text |
| AC-13 | Requester resolution endpoint/UI | `API-STAT-06`; `E2E-STAFF-02` | Passed |
| AC-14 | Transactional resolution idempotency | `API-STAT-07,11` | Passed for repeated and concurrent calls |
| AC-15 | Resolution reset transaction | `API-STAT-08`; `API-COM-03` | Passed for reopen and requester comment |
| AC-16 | Resolution role/owner/status checks | `API-STAT-09,12,13` | Passed |
| AC-17 | Internal-note information hiding | `API-NOTE-01,02`; requester component test | Passed with 404 and no requester DOM |
| AC-18 | Staff/admin notes API and staff UI | `API-NOTE-03–05`; `UI-NOTE-01`; `E2E-STAFF-01`; `E2E-TEXT-01` | Passed |
| AC-19 | Staff queue query/sort/filter/pagination | `API-QUEUE-01–04`; `UI-QUEUE-01–03`; `E2E-STAFF-01`; responsive suite | Passed with `id DESC` tie-breaking |
| AC-20 | Atomic claim and NEW-to-OPEN update | `API-STAFF-01`; `E2E-STAFF-01` | Passed, including competing claims |
| AC-21 | Owner eligibility validation | `API-STAFF-02` | Passed |
| AC-22 | Active unassignment/historical preservation/reopen cleanup | `API-STAFF-10,14`; `API-ADM-04,08`; assignment/deactivation serialization test | Passed |
| AC-23 | Independent IT priority | `API-STAFF-03`; `E2E-STAFF-01` | Passed |
| AC-24 | Eight-state transition matrix and no-op | `UNIT-STAT-01–03`; `API-STAFF-04,05`; `E2E-STAFF-01,02` | Passed |
| AC-25 | Admin list/search/role filter | `API-ADM-01`; `UI-ADM-01`; `E2E-ADM-01` | Passed |
| AC-26 | Admin provisioning and forced change | `API-ADM-02,03,09`; `UI-ADM-02`; `E2E-ADM-01` | Passed, including concurrent case-insensitive duplicate attempts |
| AC-27 | Admin edit and collision handling | `API-ADM-04`; `UI-ADM-03`; `E2E-FAIL-01` | Passed |
| AC-28 | Password reset and session revocation | `API-ADM-07`; `UI-ADM-04`; `E2E-ADM-02` | Passed |
| AC-29 | Self/last-admin safeguards | `API-ADM-05,06`; `E2E-ADM-01`; dialog accessibility test | Passed; concurrent last-admin operations are serialized |
| AC-30 | Live RBAC/account enforcement | `AUTHZ-01`–`03`; authorization API suite; deactivation session checks | Passed |
| AC-31 | Data-preserving migration | `server/scripts/test-feature10.mjs` (`API-MIG-01`) | Passed upgrade fixture: IDs, relationships, timestamps, attachment metadata and bytes preserved |
| AC-32 | Seed rerun invariance | `server/scripts/test-feature10.mjs` (`API-SEED-01`) | Passed fresh install and rerun after edited users/tickets/comments/notes |

## Commands and results

Run from the stated directory in Windows PowerShell:

| Directory | Command | Result |
| --- | --- | --- |
| `server/` | `npm.cmd exec -- prisma validate` | Passed; Prisma 5.22.0 schema valid |
| `server/` | `npm.cmd exec -- prisma generate` | Passed |
| `server/` | `npm.cmd run build` | Passed |
| `client/` | `npm.cmd run build` | Passed; Vite 6.4.3, 50 modules (2026-10-04) |
| `server/` | `npm.cmd run test:db` | Passed; only `toktickit_test` migrated/seeded |
| `server/` | `npm.cmd test -- --reporter=verbose` | 14 files; 176 passed, 1 skipped |
| `client/` | `npm.cmd test` | 15 files; 60 passed, 0 skipped (2026-10-03) |
| `server/` | `npm.cmd run test:feature10` | Passed `API-MIG-01` and `API-SEED-01` |
| repository | `$env:CAPTURE_EVIDENCE='1'; $env:E2E_REPORT='artifacts/lab-03/results/e2e-final.json'; npm.cmd run test:e2e` | Final result recorded in `verification.md` |
| repository root | `git diff --check` | Final result recorded in `verification.md` |

The one server skip is `API-REQ-001–004: exposes exactly the four active requester DTOs in name order (decommissioned in Lab 3)` in `development-requesters.api.test.ts`. It covers the retired Lab 2 development-requester selector. Lab 3 replaces it with session login, `/api/auth/me`, ownership and RBAC tests above; this is not a missing Lab 3 behavior.

Automated browser checks cover the specified 375×812, 768×1024 and 1440×900 layouts, actual overflow geometry, keyboard focus/dialog containment, safe text and failure recovery. The selected screenshots were also visually inspected. The two peer reviews are recorded in `reviewer.md`; final release approval remains attached to the `lab3-staging` to `main` pull request.
