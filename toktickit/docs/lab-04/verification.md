# Lab 4 integrated verification record

Verification date: **2026-11-01** (Asia/Bangkok). Integration base: `8675316` (`lab4-staging`). Final delivery is prepared on `feature/23-final-delivery`. Its original remote branch was withdrawn before merge; the revised branch is prepared for republication and peer review.

## Environment and isolation

- Windows PowerShell; Node 24.14.0; Prisma 5.22.0; Vitest 2.1.9; Playwright 1.63.0; Chromium; Vite 6.4.3.
- API tests used the guarded PostgreSQL test database configured by `TEST_DATABASE_URL`; its database name must end in `_test`.
- Playwright used only `toktickit_e2e_test`, API port 3001, client port 5174, and a `toktickit-attachments-test-e2e-*` temporary upload directory.
- The E2E setup applied all six checked-in migrations to the isolated database, seeded deterministic data, and reset only its three browser-test credentials.
- No development migration, seed, reset, or cleanup was performed. A read-only status check reported both Lab 4 migrations pending on the local development database `toktickit`.

## Results

- Prisma schema validation: passed.
- Backend TypeScript build: passed.
- Frontend TypeScript/Vite production build: passed (55 modules).
- Latest backend regression: **207 passed, 1 justified legacy skip** across 21 files.
- Frontend: **82 passed, 0 skipped** across 19 files.
- Latest complete Playwright regression: **54 passed, 1 opt-in visual-evidence test skipped** across 55 selected executions.
- Responsive browser checks passed for Requester, Staff, and Administrator pages at desktop, tablet, and mobile sizes, including 375×812. Keyboard focus, modal trapping/restoration, mobile navigation, safe text rendering, error recovery, dashboard drill-downs, Actions, and Ticket workflow journeys passed.

The revised Feature 23 includes consolidated documentation, personalized dashboard layouts, additional Requester status metrics, Staff ticket-creation navigation, and corresponding component/API/browser test updates. The latest backend suite passed uninterrupted with 207 tests passed and one legacy skip; the frontend suite passed all 82 tests. Both production builds passed.

The original documentation-only Feature 23 attempt had earlier timing failures. During those local reruns, two different backend full-suite invocations encountered timing-only failures under local resource pressure: the five-character attachment-removal boundary exceeded its 5-second limit once, and the large workflow-matrix case exceeded its 30-second limit once. The attachment case passed in the following full run; the workflow matrix passed its immediate focused rerun in 5.8 seconds. Those earlier non-green attempts remain recorded; they are distinct from the latest uninterrupted green backend run.

## Requirements and test evidence

The approved requirement and acceptance-criterion mapping is in [`tests.md`](tests.md). Its 16 detailed high-risk scenarios expand the 78-case inventory and are not additional IDs.

| Area | Automated evidence | Result |
| --- | --- | --- |
| Actions Taken validation, roles, idempotency, optimistic concurrency, audit revisions, unassignment and reassignment | `actions.api.test.ts`, `action-rules.test.ts`, `ActionsSection.test.tsx`, `E2E-01` | Passed in the recorded green suites. |
| Eight-state Ticket workflow, completed-Action resolution gate, stale versions and atomic behavior | `ticket-workflow.api.test.ts`, `TicketWorkflow.test.tsx`, `E2E-03` | Passed in the recorded green suites; focused workflow matrix rerun also passed. |
| Requester and Staff dashboards, repeatable-read snapshots, top-five lists and drill-downs | Dashboard API/rule/component tests, `E2E-02`, `E2E-04` | Passed. |
| Migration preservation and non-destructive seed reruns | `migration-seed.test.ts`, guarded E2E migration/seed setup | Passed against isolated databases. |
| Sessions, CSRF, roles, ownership isolation, safe errors, attachments and Labs 1–3 regression | Labs 1–4 API/component/browser suites, `SEC-01–06`, `REG-01–06`, `E2E-05` | Passed, subject to the one documented retired Lab 2 skip. |
| Responsive and accessibility behavior | Component semantics, Lab 3 UI-quality browser tests, extended `E2E-02` | Automated keyboard, focus, dialog, overflow and responsive checks passed. |

## Exact verification commands

From `toktickit/server/`:

```powershell
npm.cmd run test:db
npm.cmd test
npm.cmd run build
npx.cmd prisma validate
```

From `toktickit/client/`:

```powershell
npm.cmd test -- --run
npm.cmd run build
```

From `toktickit/`:

```powershell
npm.cmd run test:e2e
```

Playwright writes its JSON result and retained failure traces under ignored `test-results/`. The Lab 3 screenshot-only test remains intentionally gated by `CAPTURE_EVIDENCE=1`; no Lab 4 screenshot artifact is claimed in this record.

## Defects corrected during integrated review

- Feature 18 review added focused regression coverage for rejected workflow transitions, stale versions, and concurrent Action completion/resolution behavior.
- Feature 19 integration retained both Action revision cleanup and Feature 18 fixture behavior after resolving the shared fixture conflict.
- Feature 21 corrected obsolete Lab 3 post-login route assumptions after role dashboards became the default and made E2E seed/API execution independent of the Windows `tsx` user-directory failure.
- Feature 22 associated Action and administrator validation with their controls, improved dialog descriptions and focus restoration, normalized visible focus/button styles, and extended the 375×812 Staff/Administrator journey.

## Limitations and remaining delivery work

- Automated testing does not establish complete WCAG 2.2 AA compliance. NVDA/VoiceOver, 200% zoom, and subjective contrast/visual review remain manual.
- Chromium is the only browser used by the recorded E2E run.
- The ordinary development database still requires the two checked-in Lab 4 migrations before a final demo. Confirm the target and stop if Prisma reports drift or requests a reset.
- The Feature 23 Pull Request, peer-review comments/approvals, final `lab4-staging` integration, and any staging-to-main release remain pending and must be verified on GitHub.
- Confirm official PDF, video, screenshots, archive naming, and submission-portal requirements against the Lab 4 handout and current course instructions. No external submission requirement is invented here.
