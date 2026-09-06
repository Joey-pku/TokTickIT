# Lab 2 AI assistance record

Date: 2026-09-06. This record describes assistance visible in the working files, saved test artifacts and this conversation. It is not a claim of human peer review or a student-authored personal reflection.

## Instructions and student decisions

The user required reading `specification.md`, `ui-spec.md`, `api-spec.md` and `tests.md` before implementation, required approval of branch plans, and directed test-first development. The four contracts remained frozen during Part 4.

Important user-approved decisions were:

- Development Requester selection is only testing identity. Persist `toktickit_selected_requester_id`; use `x-requester-id` for scoped requests. Do not add authentication.
- Evolve categories to the finalized `{ items }` response while preserving Lab 1 system-check behavior.
- Use the exact list DTO without `requesterId`; establish ownership through fixtures/database queries.
- Generate Ticket Numbers through a PostgreSQL-backed atomic strategy, not COUNT + 1.
- Keep ticket creation JSON-only. Upload initial attachments sequentially through separate single-file multipart requests. A failed upload must not undo ticket creation or previous successful uploads.
- Retain removal records and internal audit metadata; physical binaries may remain private. Removed downloads return 404.
- Prevent duplicate creation by disabling Submit with a busy state; disabling every form field is not a new requirement.
- Keep Part 4 verification-first: reproduce contract violations before making minimal fixes. No Git operations, later-scope features or final PDF generation.

These are summaries of actual instructions, not reconstructed quotations or invented prompts.

## Assistance and validation by part

| Part | AI assistance | Evidence and limits |
| --- | --- | --- |
| 1: requester foundation | Schema/reference seed, requester context, selection/persistence, shell and regression coverage | Current foundation tests pass: 22 server and 20 client. No separate Part 1 RED artifact was found in the workspace; none is invented here. |
| 2: ticket workflow | API validation/DTOs, PostgreSQL numbering, requester isolation, list/detail/create UI and tests | Workspace `part2-*-red.json`, `part2-*-green.json`, and `part2-verification.md`. Current Part 2 regressions: 76 server, 25 client. |
| 3: attachments | Upload validation/storage, ownership, audited soft removal, sequential initial uploads, retry/error behavior and tests | Workspace `part3-*-red.json` and `part3-*-green.json`. Current Part 3 regressions: 37 server, 14 client. |
| 4: verification | Playwright setup, browser journeys, responsive checks, visual inspection, defect reproduction/fixes, runtime and development checks | `artifacts/lab-02/results/`, selected screenshots, and `verification.md`. Human review and student reflection remain pending. |

Numbering/trim validation is exercised through integration tests against PostgreSQL; this record does not relabel that coverage as separate unit tests.

## Corrections to AI-generated work

- An initial browser selector matched both the requester region and its dropdown. It was corrected to a combobox locator. That harness failure is not product RED evidence.
- The corrected baseline reproduced missing upload-failure reasons, delayed page reset, incorrect grid/colors/icons, tablet toolbar placement, undersized mobile links and lost focus after removal.
- An attempted focus fix introduced a React Strict Mode regression. Browser checks caught both initial-focus and cancel-restoration behavior; the final implementation preserves the original trigger and falls back to the attachments heading only if the trigger disappears.
- Browser checks reproduced typography differences before those values were corrected.
- Full-page captures during smooth scrolling misplaced the sticky header in evidence. The capture procedure now scrolls instantly to the top; modal evidence captures the viewport. Product layout was not changed to conceal a screenshot artifact.
- E2E preparation was separated from the API setup script so a fresh checkout cannot accidentally write E2E configuration into `server/.env.test`.
- Prisma client generation encountered a Windows DLL lock while a process was using the engine. Generation was rerun successfully after the E2E processes stopped. Migration application itself succeeded without reset.

## Execution and responsibility

Final verification ran on Node 24.14.0. Installed dependencies declare Node >=22; Node 22 was not execution-tested. Current results and exact commands are documented separately in `verification.md`.

The AI used local file inspection, terminal commands, Prisma/PostgreSQL, Vitest, Playwright and direct screenshot inspection. Existing development processes were identified before reuse; only the separately launched smoke-test process tree was stopped. No Git operations were performed.

The student remains responsible for understanding the implementation, inspecting changes, validating the evidence, providing genuine peer-review records and submitting their own reflection. **Student reflection: pending student input.** No personal learning claim, reviewer identity, approval or PR link has been fabricated.
