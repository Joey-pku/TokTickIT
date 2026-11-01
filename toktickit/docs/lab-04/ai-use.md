# Lab 4 AI assistance record

Dates: 2026-10-30 to 2026-11-01. Codex and ChatGPT were used during the Lab 4 workflow. This record describes assistance supported by the conversation, repository history, working files, automated results, and documentation. Precise model versions, contribution percentages, and human authorship allocations are not invented.

## Instructions and student decisions

AI assistance was used to revise the Engineering Contract, design traceability, implement and review Features 16–23, diagnose Git integration, run isolated verification, inspect responsive/accessibility behavior, and prepare delivery documentation. The approved specification, API contract, UI contract, and test design remained authoritative.

Important decisions retained in the final work include:

- Use four Action states with terminal completed/cancelled records and append-only internal audit revisions.
- Separate Ticket owner, Action performer, and Action assignee; permit only active Staff/Administrators as assignees.
- Allow a system-unassigned nonterminal Action to accept only a versioned reassignment-only patch before other edits resume.
- Require a completed Action with a nonblank Result before formal Ticket resolution.
- Add optimistic `workflowVersion` handling while preserving the intended Lab 3 workflow behavior.
- Calculate both dashboards server-side in repeatable-read snapshots with exact top-five ordering and authorized drill-downs.
- Keep seed reruns non-destructive and preserve existing Lab 1–3 data through checked-in migrations.
- Use isolated API/E2E databases and temporary attachment storage; never reset or clean development as a testing shortcut.
- Preserve the Zen Green design system and improve semantics, focus, dialogs, responsive cards, and mobile navigation without changing business rules.

These are summaries of student-approved requirements and implementation decisions, not claims that every decision originated with AI.

## Selected prompts by feature

| Feature | Prompt purpose (summarized) | How the result was used |
| --- | --- | --- |
| Engineering Contract | Reconcile the Lab 4 specification, API, and UI documents with the official handout; correct reassignment, workflow-version compatibility, non-destructive seed, revision visibility, Ticket-number format, and cross-document consistency. | The three contract documents were corrected without changing application code. |
| 15: test design | Validate the 78-case inventory, exact field boundaries, resolution preconditions, dashboard drill-down comparisons, traceability, and release-vs-feature completion criteria. | `tests.md` became the approved traceability and high-risk scenario source. |
| 16: Actions foundation | Implement and review Action schema/migrations/API, validation, roles, idempotency, concurrency, audit revisions, account cleanup, seed behavior, and isolated tests. | Added the backend foundation and corrected verified defects while preserving Labs 1–3. |
| 17: Actions UI | Implement the staff create/edit/reassign/view modes and Requester read-only Action history with validation, safe retry, conflict recovery, and responsive behavior. | Added Actions UI/API integration and component/browser coverage. |
| 18: Ticket workflow | Review all eight Ticket statuses, resolution gate, transactional Action/Ticket races, stale workflow versions, rollback, and Lab 2–3 regression intent. | Added focused workflow fixes/tests and verified atomic behavior. |
| 19: Requester Dashboard | Implement the scoped metrics, recent lists, drill-downs, and responsive Requester experience; resolve the staging merge conflict without losing Action cleanup. | Added the dashboard and retained both sides of the shared fixture cleanup. |
| 20: Staff Dashboard | Implement operational metrics, status/priority summaries, urgent Tickets, current Actions, drill-downs, and Staff/Admin UI. | Added server snapshot queries, client UI, and regression coverage. |
| 21: final regression | Add Playwright Lab 4 journeys, safe isolated setup, cross-lab regression, builds, and factual test evidence. | Added `E2E-01`–`E2E-05` coverage, updated obsolete Lab 3 route assumptions, and recorded results. |
| 22: UI polish | Audit all roles for visual consistency, semantics, keyboard focus, dialogs, validation, tables, and mobile overflow without altering business logic. | Improved Action/admin semantics, mobile navigation focus, shared styling, and responsive browser coverage. |
| 23: final delivery | Audit setup, README, user/API guidance, evidence, collaboration, and submission readiness without inventing results or external requirements. | Documentation was first expanded, then consolidated into the same seven-file Lab 2/3 structure at the student's request. |

## Assistance, evidence, and corrections

- AI helped inspect database/API/UI code, edit scoped files, create tests, and run Vitest, Prisma, TypeScript/Vite, and Playwright commands. Passing output was not assumed; failures were investigated and rerun.
- The Feature 19 fixture merge conflict was resolved by retaining the incoming cleanup sequence that finds Actions, deletes Action revisions, deletes Actions, then deletes Ticket dependants. Duplicate declarations and operations were avoided.
- Feature 21 initially exposed a Windows Node/`tsx` `uv_os_get_passwd` error. The isolated harness was changed to compile and run the seed/API instead of misclassifying the environment failure as an application defect.
- Existing Lab 3 E2E tests still expected pre-dashboard default routes and obsolete workflow selectors. Those tests were updated to preserve their original intent under the approved Lab 4 UI.
- A new Playwright assertion used the Testing Library matcher name `toHaveFocus`; execution caught it and it was corrected to Playwright's `toBeFocused`.
- Final Feature 23 backend reruns produced two different timeout-only failures under resource pressure. Both affected cases passed later/focused execution, and the record preserves the distinction between the green baseline and those non-green full attempts.
- The first Feature 23 documentation structure introduced six Lab 4-only report/guide files. After comparison with Labs 2 and 3, the student chose the consistent seven-file layout; useful evidence was consolidated rather than retained as extra files.

Exact execution results, database isolation, timing observations, limitations, and remaining work are documented in [`verification.md`](verification.md). Human review is documented separately in [`reviewer.md`](reviewer.md).

- Before republishing Feature 23, AI updated browser assertions for the personalized dashboard headings and My Open Tickets card. Fresh verification passed: backend 207 with one legacy skip, frontend 82, browser 54 with one opt-in skip, both production builds, and Prisma validation.

## Execution and responsibility

The final recorded environment used Windows PowerShell, Node 24.14.0, Prisma 5.22.0, Vitest 2.1.9, Playwright 1.63.0, Chromium, and Vite 6.4.3. The green evidence includes 207 backend passes with one justified legacy skip, 78 frontend passes, both production builds, Prisma validation, and 54 Playwright passes with one opt-in visual skip.

AI-assisted verification is not independent human approval or complete accessibility certification. The student remains responsible for understanding the implementation, checking course AI-use policy, confirming external submission requirements, obtaining genuine peer reviews, and submitting only work they can explain and defend.

## My Reflection

AI helped me manage the larger scope of Lab 4 by tracing requirements across the database, API, frontend, tests, and documentation. It was particularly useful for identifying edge cases involving concurrent updates, Action reassignment, the resolution gate, dashboard calculations, responsive layouts, and safe migration/test-database procedures.

The work also showed why AI output must be verified. Some generated test assumptions and locators were incorrect even when the intended product behavior was correct. Running the real tests, inspecting failures, comparing the implementation with the contracts, and distinguishing environmental timeouts from repeatable defects were necessary before accepting the result.

I learned that consistency in delivery documentation matters as well as code quality. The first final-delivery draft contained useful information but did not match the established Lab 2 and Lab 3 folder structure. Reviewing the earlier labs helped me simplify Lab 4 into the same specification, API, UI, tests, verification, reviewer, and AI-use records.

Overall, AI improved speed and coverage, but I remain responsible for the design decisions, verification evidence, reviewer records, and final submission.
