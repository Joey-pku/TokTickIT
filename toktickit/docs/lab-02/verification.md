# Part 4 verification and delivery preparation

Verified 2026-09-06 on Windows, Node **24.14.0**, PostgreSQL 18, Prisma Client 5.22.0 and Playwright 1.63.0/Chromium. This is an engineering verification record, not the final submission report/PDF or a human peer approval.

## Final results

| Execution | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Full server | 137 | 0 | 0 |
| Full client | 62 | 0 | 0 |
| Full Playwright | 20 | 0 | 0 |
| Server Part 3 | 37 | 0 | 0 |
| Client Part 3 | 14 | 0 | 0 |
| Server Part 2 | 76 | 0 | 0 |
| Client Part 2 | 25 | 0 | 0 |
| Server Part 1 | 22 | 0 | 0 |
| Client Part 1 | 20 | 0 | 0 |
| Server Lab 1 | 2 | 0 | 0 |
| Client Lab 1 | 3 | 0 | 0 |

The regression groups are subsets of the full suites, not additional unique tests. Final unique automated cases: **219 passing**. Both builds and Prisma validation passed. The full browser-driven development journey passed separately.

Machine-readable results are under [artifacts/lab-02/results](../../artifacts/lab-02/results/): `server-green.json`, `client-green.json`, `e2e-green.json`, and the eight `server/client-part1/part2/part3/lab1.json` group reports.

## Files created or modified in Part 4

Paths are relative to `toktickit/`. No Git status/history was read or changed.

Created tooling/tests:

- `package.json`, `package-lock.json`, `playwright.config.ts`.
- `e2e/support/global-setup.ts`, `e2e/support/fixtures.ts`, `e2e/support/manual-development.mjs`.
- `e2e/lab-02/requester-ticket-flow.spec.ts`.
- `e2e/lab-02/requester-error-states.spec.ts`.
- `e2e/lab-02/responsive-accessibility.spec.ts`.
- `e2e/lab-02/visual-evidence.spec.ts`.

Modified production/configuration:

- `server/package.json`, `server/package-lock.json`: start target and declared runtime; no unrelated dependency upgrades.
- `client/src/MyTickets.tsx`: immediate pagination reset while retaining request debounce.
- `client/src/CreateTicket.tsx`: report initial upload failure reason.
- `client/src/AttachmentPicker.tsx`, `Icons.tsx`, `TicketComponents.tsx`: contract icons and queue-removal presentation.
- `client/src/AttachmentSection.tsx`, `RemovalModal.tsx`: post-removal focus fallback and Strict Mode-safe trigger restoration.
- `client/src/zen-green.css`: reproduced layout, color, typography and mobile-target corrections.
- `.gitignore`: ignore transient Playwright results/reports.

Documentation/evidence:

- Modified `README.md`, `docs/lab-02/ai-use.md`, `docs/lab-02/reviewer.md`.
- Created this verification record and `artifacts/lab-02/results/` evidence.
- Created 17 selected PNGs under `artifacts/lab-02/screenshots/` (index below).
- Builds refreshed ignored `server/dist/` and `client/dist/`; Prisma generation refreshed generated client files. Dependencies/browser binaries were installed for verification.

The four frozen contract documents, existing Lab 1/Part 1/Part 2/Part 3 test files, schema and checked-in migrations were not modified in Part 4.

## RED evidence and corrections

The first new Playwright run had 17 failures caused by an ambiguous harness locator matching both the requester region and dropdown. This was corrected before drawing product conclusions; those failures are **not** claimed as product RED.

The corrected baseline, before production fixes, had **9 passed / 9 failed / 0 skipped**: [e2e-red.json](../../artifacts/lab-02/results/e2e-red.json). One grouped icon assertion reached the case timeout, so [e2e-icons-red.json](../../artifacts/lab-02/results/e2e-icons-red.json) records the complete supplemental failure at shorter assertion timeouts. [e2e-typography-focus-red.json](../../artifacts/lab-02/results/e2e-typography-focus-red.json) records three failed cases: new typography evidence and focus regressions introduced during correction.

| Reproduced issue | Minimal correction and affected verification |
| --- | --- |
| Search page remained 2 before the 300ms timer | Reset page immediately, delay the request; paused-clock check passes. |
| Desktop detail grid had 3 columns | Scope detail information to 2 columns, 1 on mobile; computed grid checks pass. |
| LOW used NEW colors; HIGH border differed | Apply the frozen palette; computed CSS checks pass. |
| Generic read-only squares | Lock/user SVGs; browser presentation checks pass. |
| Missing picker icons; neutral Discard control | Upload/type icons and red accessible queue removal; checks pass. |
| Initial upload failure omitted reason | Preserve public API reason or safe network fallback; partial-failure/retry journey passes. |
| Focus lost when removed trigger disappeared | Stable attachments heading fallback. Preserve the original trigger across Strict Mode effect setup and restore it after cancel. Initial focus, trap, Escape, cancel and successful-removal checks pass. |
| Tablet toolbar did not put search on its own row | Full-width search at 768–991; bounding-box assertions pass. |
| Mobile breadcrumb below 44px | Minimum-height ticket links; both mobile viewport checks pass. |
| Badge/section font sizes and page-title weight differed | Correct reproduced values; CSS assertions pass. |
| `npm start` referenced nonexistent output | Point to `dist/src/index.js`; built-server health/reference smoke passes. |

Removal validation styling already passed; it was not changed. No product change was made merely for alternative design preference. Full-page capture artifacts caused by sticky positioning during smooth scroll were corrected in the screenshot procedure, not by altering the product.

## E2E setup and scenarios

Real React/Vite, Express/Prisma and PostgreSQL are used. Chromium runs with one worker and **zero retries**. Database `toktickit_e2e_test` is separate from development `toktickit` and API-test `toktickit_test`. Setup applies checked-in migrations and the idempotent seed, without writing API `.env.test`. Child API/Vite processes bind 3001/5174 and fail if those ports are occupied.

Each scenario uses seeded reference identities, makes its own ticket/attachment state, and cleans only records created during that scenario in the dedicated E2E database. The suite must not share that database with concurrent work. Numbering counters are retained; assertions never hardcode a ticket number or year. Uploads live under an isolated OS temporary `toktickit-attachments-test-e2e-*` directory; teardown removes it and stops owned child processes. Development uploads are never E2E cleanup targets.

Final read-only cleanup inspection found **0 tickets, 0 attachments, and no remaining E2E upload directories**. API `.env.test` still targets `toktickit_test`; see `artifacts/lab-02/results/isolation-cleanup.json`.

| Contract IDs | Implemented behavior |
| --- | --- |
| E2E-001,002 | Guard, active selection, exact persistence key/reload, placeholders, valid JSON create, backend number/date, sequential initial uploads, My Tickets and detail |
| E2E-003,004 | Switch requester, hide prior tickets, direct unowned detail returns 404 |
| E2E-005,006 | Supplementary permitted-file upload, download name/bytes/headers, confirmation/reason, audit retention, removed download 404 |
| E2E-007 | 12 fixture tickets for real pagination, case-insensitive search, Enter, filters, clear, sorting, page size and no-results |
| E2E-008,010 | Five viewport checks, mobile navigation/cards, tablet grids/toolbars and no overflow |
| E2E-009 | Genuine zero-ticket requester empty state |
| AC-06–09,11,18,29,32 supplemental | Validation, busy Submit, preserved failed form, partial upload/retry, requester failure/Retry/stale context, safe list failure, attachment isolation and focus |
| VIS-001–015 | Selected evidence capture, focus/CSS assertions, long filenames, modal bounds/trap and breakpoint checks |

The supplementary browser upload/download scenario uses a real JPEG generated by the browser canvas, matching E2E-005. Initial-upload and evidence scenarios use PDF fixtures. The API suite covers JPEG, PNG, WEBP and PDF individually.

## Acceptance-criteria evidence map

| AC | Evidence |
| --- | --- |
| 01 | API-REQ-001–004, requester component regressions |
| 02–04 | E2E-001,003 and requester persistence/context regressions |
| 05 | E2E-001 and API-TCK-001–006 |
| 06–09 | API-TCK validation, CreateTicket component suite, browser form-failure/busy case |
| 10–11 | E2E-002, partial-upload browser case, API-ATT and CreateTicketAttachments regressions |
| 12 | API-LST isolation, E2E-003; ownership tested without adding requesterId to the list DTO |
| 13–16 | API-LST/UI-LST suites, E2E-007 and immediate-page-reset browser check |
| 17–18 | E2E-009, E2E-007 no-results, UI-LST states |
| 19–20 | API-DTL/UI-DTL suites and E2E-001,004 |
| 21–25 | API-ATT/UI-ATT boundary/type/count coverage and E2E-005 |
| 26–28 | API-ATT removal/audit/repeat-removal cases and E2E-006 |
| 29 | API attachment isolation and E2E-003/004 supplemental attachment requests |
| 30–31 | Five viewport cases, boundary checks and VIS evidence |
| 32 | Requester/form component labels, browser focus/trap/restoration and visual evidence |

Number generation/concurrency and trimming are covered by database/API integration tests; no separate isolated numbering unit suite is claimed. Frozen test-document counts and stale section references are not execution results. Approved DTO/categories/Submit-only decisions take precedence without editing those documents.

## Exact regression/build commands executed

From `toktickit/server/`:

```powershell
npm.cmd test -- tests/lab-02/attachments.api.test.ts --reporter=json --outputFile=../artifacts/lab-02/results/server-part3.json
npm.cmd test -- tests/lab-02/create-ticket.api.test.ts tests/lab-02/my-tickets.api.test.ts tests/lab-02/ticket-detail.api.test.ts --reporter=json --outputFile=../artifacts/lab-02/results/server-part2.json
npm.cmd test -- tests/lab-02/development-requesters.api.test.ts tests/lab-02/requester-context.test.ts tests/lab-02/seed.test.ts --reporter=json --outputFile=../artifacts/lab-02/results/server-part1.json
npm.cmd test -- tests/lab-01 --reporter=json --outputFile=../artifacts/lab-02/results/server-lab1.json
npm.cmd test -- --reporter=json --outputFile=../artifacts/lab-02/results/server-green.json
npm.cmd run build
npm.cmd exec -- prisma validate
```

From `toktickit/client/`:

```powershell
npm.cmd test -- tests/lab-02/AttachmentSection.test.tsx tests/lab-02/CreateTicketAttachments.test.tsx tests/lab-02/attachment-api.test.tsx --reporter=json --outputFile=../artifacts/lab-02/results/client-part3.json
npm.cmd test -- tests/lab-02/CreateTicket.test.tsx tests/lab-02/MyTickets.test.tsx tests/lab-02/RequesterTicketDetail.test.tsx tests/lab-02/ticket-api.test.tsx --reporter=json --outputFile=../artifacts/lab-02/results/client-part2.json
npm.cmd test -- tests/lab-02/RequesterSelector.test.tsx tests/lab-02/RequesterContext.test.tsx tests/lab-02/api.test.tsx --reporter=json --outputFile=../artifacts/lab-02/results/client-part1.json
npm.cmd test -- tests/lab-01 --reporter=json --outputFile=../artifacts/lab-02/results/client-lab1.json
npm.cmd test -- --reporter=json --outputFile=../artifacts/lab-02/results/client-green.json
npm.cmd run build
```

From `toktickit/`:

```powershell
npm.cmd install --save-dev @playwright/test
npm.cmd exec -- playwright install chromium
$env:CAPTURE_EVIDENCE='1'
$env:E2E_REPORT='artifacts/lab-02/results/e2e-green.json'
npm.cmd run test:e2e
node e2e/support/manual-development.mjs
```

The initial installation hit sandbox network permissions and succeeded with approved execution. One automatic approval-review attempt for server tests was rejected because the review service had reached a usage limit. After the user's continuation and rechecking test isolation, the command was approved and passed. No current verification is blocked by that earlier rejection.

## Development migration and manual application

Before migration, a redacted connection check and `SELECT current_database()` confirmed **localhost:5432/toktickit**. `npm.cmd exec -- prisma migrate status` reported only the two expected pending migrations. `npm.cmd run prisma:migrate` applied:

- `20260906000000_lab2_foundation`
- `20260906010000_ticket_number_counter`

No reset, destructive cleanup, new migration or schema redesign occurred. `npm.cmd run prisma:seed` succeeded. Migration-triggered generation initially encountered a Windows engine DLL lock; a later `npm.cmd exec -- prisma generate` succeeded. Final migration status reports the database up to date; Prisma validation passed.

Existing processes on 3000/5173 were identified as this workspace's tsx/Vite servers and reused. The actual development journey passed: Lab 1 system check, requester selection/reload, JSON ticket creation, backend-generated number confirmed in PostgreSQL, My Tickets, Detail, upload, byte-checked browser download, soft removal, retained metadata, removed download 404, requester switching and unowned detail 404.

See [manual-development.json](../../artifacts/lab-02/results/manual-development.json). The new manual record **Ticket 2 / TKT-2026-000002**, attachment 1, remains in development. Its attachment is soft-removed; the audit record and private binary may remain. No development ticket/attachment cleanup was performed.

The original `npm start` failure is preserved in `start-red.txt`. After correction, startup on 3000 encountered the existing process, so an independently launched `npm start` on **3002** verified health and four active requester records. Only that smoke-test process tree was stopped. See `start-green.txt`.

## Responsive/accessibility and screenshot index

All five tested viewports passed overflow/layout checks: **1280×800, 820×1180, 768×1024, 375×667, 375×812**. Boundary widths 767/768/991/992 passed column checks. Browser tests verify mobile card visibility, reachable navigation, measured touch targets, and modal keyboard/bounds behavior. Screenshot inspection checks readable long filenames, state distinction, column balance, error placement and focus visibility. Full-page images can be taller than their configured viewport; modal images retain the actual viewport dimensions.

All paths below are under `artifacts/lab-02/screenshots/`:

| Files | Evidence |
| --- | --- |
| `desktop-requester.png` | VIS-001,014; requester screen and testing-identity notices |
| `desktop-create-validation-focus.png` | VIS-001–004; editable/read-only distinction, errors and keyboard focus |
| `desktop-create-success.png` | VIS-015; real backend Ticket Number |
| `desktop-list.png` | VIS-005,006; LOW/MEDIUM/HIGH and NEW |
| `desktop-detail.png` | VIS-013; ticket fields, active file and expanded removed metadata |
| `desktop-removal-modal.png` | Confirmation, mandatory reason, focus |
| `tablet-ui-create.png`, `tablet-ui-list.png` | UI-prescribed 820×1180 inspection |
| `tablet-vis-create.png`, `tablet-vis-list.png`, `tablet-vis-detail.png` | VIS-010,011 at 768×1024 and tablet detail layout |
| `mobile-ui-requester.png`, `mobile-ui-detail.png`, `mobile-ui-removal-modal.png` | UI-prescribed 375×667 and usable mobile modal |
| `mobile-vis-create.png`, `mobile-vis-list.png`, `mobile-vis-detail.png` | VIS-007–009,012 at 375×812 |

Seventeen selected images cover multiple requirements each. Intermediate traces/results are ignored; no videos or duplicate per-test screenshots are included as submission evidence. Screenshots were captured from the real isolated stack, with real API-generated ticket data. Fault-injected cases are separately identified in tests and are not presented as backend success evidence.

## Delivery status, assumptions and remaining work

- Product/API/component/browser verification above is green; no remaining failed tests or builds.
- Node >=22 is the dependency-declared server requirement. Only Node 24.14.0 was execution-tested.
- Current browser verification uses Chromium. No Firefox/WebKit/device certification is claimed.
- The approved soft-removal storage strategy remains unchanged. An interrupted upload response can have an uncertain outcome; the UI directs the requester to inspect/refresh before retrying. No new idempotency guarantee is invented.
- `ai-use.md` records factual assistance and corrections; personal student reflection is explicitly pending.
- `reviewer.md` records AI/code findings; actual human peer review, identity, comments and approval remain pending.
- GitHub issue/board state, branch/PR chronology, peer-reviewed merges, and release PR evidence remain user-owned and unverified. No Git operations were performed.
- The strict course DoD's separate unit-test wording for numbering/trim is satisfied behaviorally by integration coverage here; acceptance of that test-layer distinction remains a reviewer/course decision, not an invented unit-test result.
- Final report/PDF generation is intentionally deferred. Use genuine Git/PR evidence, frozen spec references, RED/GREEN/traceability, student AI reflection and the indexed screen evidence when preparing it.
- The four frozen contracts were not edited to update stale counts/examples or execution status; this separate record supplies current results.

Recommended user-managed commit groups: (1) Playwright setup/tests and ignores; (2) reproduced UI/start/runtime corrections, with their tests; (3) README, verification/AI/review documentation and selected RED/GREEN/screenshots. Do not include dependency directories, generated builds, temporary traces, environment secrets or private development uploads. No commits, pushes or merges were performed.
