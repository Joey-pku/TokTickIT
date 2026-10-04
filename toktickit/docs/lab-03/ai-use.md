# Lab 3 AI assistance record

Dates: 2026-09-19 to 2026-10-03. Antigravity, Codex and ChatGPT were used during the Lab 3 workflow. This record describes assistance supported by the repository history, working files, test artifacts and saved documentation. Precise model versions, complete prompts, contribution percentages and authorship allocations are not established by the available evidence and are not invented here.

## Instructions and student decisions

AI assistance was used to interpret the Lab 3 engineering contracts, plan implementation work, generate and revise code and tests, review behavior, run integrated verification, inspect screenshots and draft delivery documentation. The specification, API contract, UI contract and test plan remained the authoritative sources when AI suggestions conflicted with project requirements.

Important implementation decisions reflected in the completed work were:

- Replace the Lab 2 development requester selector and `x-requester-id` identity with database-backed sessions and role-based authorization.
- Store only a SHA-256 digest of each opaque session token, use an HTTP-only `SameSite=Lax` cookie, and enforce live account and role checks on every authenticated request.
- Require the `X-Requested-With: XMLHttpRequest` header and an allowed browser origin on state-changing requests as CSRF protection.
- Force seeded and newly provisioned users to change their temporary password before accessing normal application features.
- Preserve existing Lab 2 data through checked-in Prisma migrations and make canonical seeding repeatable without restoring user-edited values.
- Derive ticket requester identity from the authenticated session and return indistinguishable 404 responses for inaccessible requester resources.
- Keep public comments visible to requesters while making internal notes available only to IT Staff and Administrators.
- Implement staff assignment, IT priority and status changes as server-authorized workflows, including concurrency and resolution-reset rules.
- Protect user administration with case-insensitive email uniqueness, immediate session revocation, self-deactivation restrictions and last-administrator safeguards.
- Run database and browser tests only against named isolated test databases and temporary attachment storage, never against the development database.

These points summarize decisions visible in the contracts and implementation. They are not reconstructed quotations or a claim that every decision originated with AI.

## Assistance and validation by feature

| Feature | AI assistance | Evidence and limits |
| --- | --- | --- |
| 10: user migration and seed | Helped develop the Prisma schema and migration, canonical seed behavior, ticket-number compatibility and a guarded migration/seed verification harness. | Commit `5276cf1`; `server/scripts/test-feature10.mjs`; `API-MIG-01` and `API-SEED-01` passed for both an upgrade fixture and fresh installation. |
| 11: authentication and permissions | Helped implement session authentication, password validation/change, login throttling, CSRF protection, session-derived requester access, role checks, login UI and automated tests. | Commit `ce84c45`; authentication, authorization and password test suites; Lab 3 browser authentication and UI-quality tests. |
| 12: staff ticket workflow | Helped implement the staff queue, assignment and claim behavior, IT priority, the status transition matrix, comments, confidential notes and requester resolution indication. | Commit `30501ec`; `staff-workflow.api.test.ts`, status-transition unit tests, component tests and `staff-ticket-flow.spec.ts`. |
| 13: administrator user management | Helped implement searchable user management, account creation and editing, activation controls, temporary-password reset, session revocation and administrator safeguards. | Commit `66ad75e`; `users-admin.api.test.ts`, `UserManagement.test.tsx` and `user-administration.spec.ts`. |
| 14: integrated verification and delivery | Codex inspected the contracts and implementation, reviewed assertion coverage, ran isolated Prisma/build/Vitest/Playwright/migration checks, added screenshot-evidence automation, inspected the images and drafted factual delivery records. | Commit `dd72985`; `tests.md`, `verification.md`, `reviewer.md`, `visual-evidence.spec.ts` and artifacts under `artifacts/lab-03/`. |
| Profile dropdown and branding update | AI assistance supported the shared role profile menu, keyboard and dismissal behavior, responsive checks, reusable clock branding and updated documentation. | `UI-SHELL-01` to `UI-SHELL-05`; client suite recorded as 60 passing tests on 2026-10-03. |

The acceptance-criterion mapping in `tests.md` is the detailed source for AC-01 through AC-32. Passing integration or browser coverage is not relabeled here as separate unit-test coverage.

## Corrections to AI-assisted work

- The first screenshot-evidence test treated the Change Password control as a link, although the application exposes it as a button. The locator was corrected after the browser test failed.
- The first requester-detail evidence locator expected the ticket number inside the page heading. It was updated to match the actual accessible structure after inspection. These were test-harness errors, not product defects.
- Integrated checks preserved the retired Lab 2 development-requester test as one documented skip because Lab 3 intentionally replaces that interface with session login and role-based access. Replacement authentication and authorization coverage was verified instead of hiding the skip.
- Test and E2E setup was checked for database isolation. API tests used `toktickit_test`; browser tests used `toktickit_e2e_test`; migration checks used guarded disposable database names. No development reset or cleanup was used as a shortcut.
- Screenshot output was inspected rather than accepted only because Playwright passed. Desktop authentication, password change, requester detail, staff queue/detail, administrator management and mobile administrator views were reviewed.

These corrections demonstrate why AI-generated implementation and tests still required execution, inspection and revision.

## Execution and responsibility

Integrated verification on 2026-09-24 used Windows PowerShell, Node 24.14.0, npm 11.9.0, Prisma 5.22.0, Vitest 2.1.9, Playwright 1.63.0, Chromium and Vite 6.4.3. Prisma validation and generation passed, both production builds passed, the server suite recorded 176 passing tests with one justified legacy skip, and the final browser suite recorded 47 passing tests with no skips. The client suite later recorded 60 passing tests on 2026-10-03. Exact commands, isolation controls and remaining limitations are documented in `verification.md` and `tests.md`.

The original Lab 3 handout was not present in the workspace during integrated review, so requirements that exist only in that handout could not be verified. Chromium was the only browser used for the recorded E2E run. AI-performed review is not independent human peer review; genuine reviewer identity, findings and approval must be recorded separately in `reviewer.md`.

I remain responsible for understanding the implementation, checking that this disclosure complies with the course policy, validating the application and evidence, and submitting only work that I can explain and defend.

## My Reflection

AI helped me during Lab 3 with requirement analysis, implementation planning, code generation, test creation, debugging, review and documentation. It was especially useful for tracing security and role-based requirements across the database, API, frontend and automated tests. It also helped identify edge cases such as expired or revoked sessions, concurrent ticket claims, case-insensitive duplicate emails, resolution resets and protection of the last active administrator.

However, I learned that passing generated tests is not enough by itself. AI can misunderstand the accessible structure of the interface, create an incorrect test locator or make an assumption that is not supported by the specification. I still needed to read the contracts, inspect the code, run the application against isolated databases, review screenshots and check whether each assertion tested the intended behavior rather than merely passing.

Lab 3 also showed me why security and database changes need more careful validation than ordinary interface changes. Authentication, authorization, CSRF protection, migrations and administrator actions can affect real data or expose information when implemented incorrectly. Using separate test databases and reviewing migration behavior helped me understand how to verify these features without risking the development database.

Overall, AI made the development and verification process faster, but it did not replace my responsibility as the student. The most important lesson was to treat AI output as a draft or suggestion that must be checked against requirements and evidence. I am responsible for understanding the final system, explaining the design decisions and confirming that the submitted work behaves correctly.
