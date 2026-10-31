# Lab 4 Final Delivery Evidence and Checklist

Date: 2026-10-31

Branch under preparation: `feature/23-final-delivery`

Integration target: `lab4-staging`

## Requirements and evidence

The approved requirements and acceptance criteria are traced to the planned 78-case inventory in [`tests.md`](tests.md). The detailed high-risk scenarios expand that inventory rather than adding IDs. Implementation evidence is distributed across server unit/API/integration tests, client component tests, and cross-role Playwright journeys.

| Area | Primary evidence | Executed result |
| --- | --- | --- |
| Actions Taken, authorization, validation, idempotency, concurrency, revisions, reassignment | `server/tests/lab-04/actions.api.test.ts`, `action-rules.test.ts`, Feature 17 component/E2E coverage | Included in green backend, frontend, and browser runs below. |
| Ticket workflow, resolution gate, stale versions, rollback | `ticket-workflow.api.test.ts`, `TicketWorkflow.test.tsx`, `E2E-03` | Included in green runs. |
| Requester and Staff dashboards, snapshot/drill-down rules | Dashboard API/rule/component tests, `E2E-02`, `E2E-04` | Included in green runs. |
| Migration and non-destructive seed | `migration-seed.test.ts`, existing migration harness | Included in green backend run; E2E applied all six checked-in migrations. |
| Session, CSRF, roles, ownership, safe errors, attachments | Labs 2-4 API/security/regression tests | Included in green backend/browser runs. |
| Responsive, keyboard, focus, dialog and semantic behavior | Feature 22 component tests, Lab 3 UI-quality E2E, extended `E2E-02` | Desktop/tablet/mobile browser checks passed. Manual limitations remain below. |

## Latest verified commands and results

These are actual executions on the integrated Feature 22 base immediately before final documentation work. Feature 23 changes documentation only.

| Check | Command | Result |
| --- | --- | --- |
| Backend regression | `cd server; npm test` | 21 files passed; 207 passed, 1 intentionally skipped (208 total). |
| Backend build | `cd server; npm run build` | Passed. |
| Prisma validation | `cd server; npx prisma validate` | Schema valid. |
| Frontend regression | `cd client; npm test -- --run` | 19 files, 78 tests passed. |
| Frontend production build | `cd client; npm run build` | Passed. |
| Complete Playwright regression | application root: `npm run test:e2e` | 54 passed, 1 opt-in visual-evidence test skipped. |
| Responsive browser matrix | Same Playwright run | Requester, Staff, Administrator, dashboards, queue, detail, Actions, and dialogs exercised at desktop/tablet/mobile widths, including 375×812. |

Feature-specific detail and limitations are recorded in [`feature-21-test-report.md`](feature-21-test-report.md) and [`feature-22-ui-accessibility-review.md`](feature-22-ui-accessibility-review.md). Planned tests must not be inferred as executed solely from the inventory; the results above describe the checked-in automated suites that actually ran.

Feature 23 revalidation produced the same green frontend result and a green complete Playwright run (54 passed, 1 opt-in skip). Two backend full-suite attempts on the documentation-only branch each encountered a different timing-only failure under local resource pressure: first the five-character attachment-removal boundary exceeded its 5-second limit, then the large workflow-matrix case exceeded its 30-second limit. The attachment case passed in the next full run, and the workflow matrix passed on an immediate focused rerun in 5.8 seconds. The most recent uninterrupted green full-backend evidence remains the 207-pass Feature 22 run on the same application code; Feature 23 changes no application or test code.

## Development and collaboration record

Repository history shows the Lab 4 engineering contract and Features 15-22 integrated through feature branches and GitHub merge commits into `lab4-staging`, including PR merge commits #46 through #54. The local history supports the branch and merge sequence, but it does not prove reviewer identity, approval state, reviewer comments, or peer-review quality. Those details must be checked on GitHub before submission.

The intended workflow is:

1. Branch from the current `lab4-staging`.
2. Commit one scoped feature with green checks.
3. Push the feature branch and open a Pull Request targeting `lab4-staging`.
4. Record peer review and required check results on GitHub.
5. Merge only after review, then fast-forward the local `lab4-staging` with `git pull --ff-only origin lab4-staging`.
6. Perform final integration verification and submit from the instructor-approved branch/tag/archive.

No PR approval or final Feature 23 merge is claimed by this document.

## Final submission checklist

| Status | Item | Evidence or next action |
| --- | --- | --- |
| Complete | Approved Lab 4 Engineering Contract | `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`. |
| Complete | Actions, workflow, dashboards, security, migration/seed implementation | Integrated Feature 16-20 history and automated evidence. |
| Complete | Backend regression and build | 207 passed, 1 intentional skip; TypeScript build passed. |
| Complete | Frontend regression and build | 78 passed; production build passed. |
| Complete | Prisma schema validation | Passed. |
| Complete | Full browser regression | 54 passed; one opt-in screenshot test skipped. |
| Complete | Responsive and keyboard automation | Desktop/tablet/mobile overflow, keyboard, focus, and dialog checks passed. |
| Complete | README, installation, user, API, test, and delivery documentation | Linked from the application README. |
| Pending manual | Screen-reader and 200% zoom review | Run NVDA/VoiceOver and browser zoom checks; automated tests do not prove full WCAG compliance. |
| Pending manual | Visual/contrast approval and current screenshots | Enable the existing opt-in evidence run if required; review artifacts before submission. |
| Pending GitHub | Feature 23 PR and peer review | Open PR to `lab4-staging`; verify approvals/comments/checks on GitHub. |
| Pending integration | Merge Feature 23 and rerun final checks on integrated commit | Do not claim complete until the target branch contains this documentation. |
| Pending environment | Development database Lab 4 migrations | Read-only status on 2026-10-31 reported `20261030000000_lab4_actions_taken_foundation` and `20261030001000_lab4_action_constraints` pending on local database `toktickit`. Apply checked-in migrations only after confirming the intended target; no development migration was applied during delivery work. |
| Pending course confirmation | Required PDF, video, screenshots, archive naming, and portal upload | Confirm against the official Lab 4 handout and current course submission instructions; this repository does not establish those external requirements. |
| Not applicable | Action audit-revision screen/API | Explicitly out of Lab 4 scope; revisions are internal evidence. |

## Release limitations

- Local CORS origins and filesystem attachment storage are development/course choices, not a production deployment design.
- One visual screenshot test is intentionally gated by `CAPTURE_EVIDENCE=1`; its skip is reported, not treated as a failure.
- Automated accessibility evidence is substantial but does not establish complete WCAG 2.2 AA conformance.
- Ordinary development data is not altered by final verification or documentation work. Isolated test databases must remain separate.
