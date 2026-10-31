# Feature 21 Final Regression Report

Date: 2026-10-31

Branch: `test/21-final-regression`

## Environment and data safety

Playwright uses the dedicated PostgreSQL database `toktickit_e2e_test`. Global setup applies migrations, compiles and runs the seed, resets only the three seeded browser-test credentials in that isolated database, and starts the compiled API plus Vite client. Test-created Tickets, Actions, Action revisions, attachments, sessions, and users are removed by the fixtures. The normal development database is not used.

The compiled seed and API entry points are used because Node 24 on the Windows runner reports `uv_os_get_passwd`/`ENOMEM` when `tsx` tries to discover its temporary user directory. This is an execution-environment limitation, not an application failure.

## Approved end-to-end coverage

| Test ID | Browser evidence | Result |
| --- | --- | --- |
| E2E-01 | Staff records and completes an Action through Ticket Detail, including assignee, description, result, status, and persisted history. | Pass |
| E2E-02 | Requester dashboard is keyboard reachable and has no horizontal document overflow at 1280×800, 768×1024, and 375×812. Existing Lab 3 coverage also checks staff/admin responsive pages and focus behavior. | Pass |
| E2E-03 | Requester reads completed Action history; staff follows the permitted OPEN → RESOLVED → CLOSED → REOPENED workflow. | Pass |
| E2E-04 | Requester active-Ticket and staff active-unassigned dashboard cards drill into the matching authorized filtered lists. | Pass |
| E2E-05 | Representative requester, staff, and administrator navigation reaches My Tickets, Ticket Queue, and User Management without page exceptions, broken navigation, or unexpected console errors. Expected 401 resource messages caused by in-flight requests during explicit logout are excluded. | Pass |

The five rows above are the approved Feature 15 IDs. Viewport parameterization expands E2E-02 into three executions; it does not create additional test IDs.

## Automated regression results

- Backend Vitest: 21 files passed; 207 tests passed; 1 intentionally skipped.
- Frontend Vitest: 19 files passed; 77 tests passed.
- Lab 2 Playwright regression: 19 tests passed in the final cross-lab run segment.
- Lab 3 plus Lab 4 Playwright: 31 passed and 1 visual-evidence test skipped before two obsolete dashboard-route/locator assertions were corrected. The corrected administrator tests then both passed, all seven Lab 4 executions except the newly added E2E-05 passed together, and the corrected E2E-05 passed on its focused rerun.
- Backend TypeScript build: pass.
- Frontend TypeScript/Vite production build: pass.
- Prisma migrations against the isolated E2E database: pass, with no pending migrations.

## Security, concurrency, and reliability evidence

The complete backend regression suite covers the approved `SEC-01`–`SEC-06` and `REL-01`–`REL-05` behaviors through authorization, Action rules/API, Ticket workflow, dashboard, migration/seed, attachment concurrency, and staff workflow suites. This includes role and ownership isolation, input validation and plain-text rendering, optimistic versions, idempotent Action creation, concurrent mutation handling, transaction rollback, resolution gating, and non-destructive seed reruns. Feature 21 adds browser-level cross-role and navigation evidence without duplicating those lower-level test IDs.

## Remaining limitations

- The optional Lab 3 screenshot-only visual-evidence test remains intentionally skipped unless its opt-in environment flag is set.
- Automated responsive checks validate document overflow and keyboard focus at the contracted viewports; final subjective visual approval still requires a human review of typography and appearance.
- The cross-lab Playwright verification completed in segments while obsolete Lab 3 post-login route expectations were corrected. Every affected segment and corrected failure was rerun successfully, but one uninterrupted post-correction invocation of all Playwright files was not recorded in this report.
