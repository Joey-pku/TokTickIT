# Lab 4 UI Specification

**Status:** Implementation-ready companion to the Lab 4 specification and API contract.

## 1. Design and Application Shell

Extend the existing Zen Green shell, profile menu, typography, cards, tables, badges, forms, buttons, dialogs, and feedback patterns. Status, priority, privacy, and Action state always use visible text as well as color. Remove no approved Lab 1–3 navigation or screen.

| Role | Dashboard route/default | Other retained primary destinations |
|---|---|---|
| Requester | `/dashboard` | `/tickets`, `/tickets/new` |
| IT Staff | `/staff/dashboard` | `/staff/queue` |
| Administrator | `/staff/dashboard` | `/staff/queue`, `/admin/users` |

The active page is programmatically and visually indicated. Existing verified detail routes remain `/tickets/:ticketId` and `/staff/tickets/:ticketId`.

## 2. Requester Dashboard

**Route:** `/dashboard`

**Users:** authenticated Requester

**API:** `GET /api/dashboard/requester`

**Traceability:** FR-L4-RD-01–03, FR-L4-HARD-01, FR-L4-HARD-02, FR-L4-HARD-04; AC-L4-14, AC-L4-16, AC-L4-17, AC-L4-20, AC-L4-22.

```text
+------------------------------------------------------+
| Dashboard                              [New Ticket]   |
| [Active: 3 →]       [Waiting for you: 1 →]           |
|                                                      |
| Recently updated                  [View all]          |
| TKT-...  Summary  Status  Priority  Updated           |
|                                                      |
| Recently resolved                 [View all]          |
| TKT-...  Summary  Status  Resolved                    |
+------------------------------------------------------+
```

- **Active card:** count of `NEW|OPEN|IN_PROGRESS|WAITING_FOR_REQUESTER|REOPENED`; link `/tickets?view=active`.
- **Waiting card:** exact `WAITING_FOR_REQUESTER`; link `/tickets?status=WAITING_FOR_REQUESTER`.
- **Recently updated:** five owned Tickets, `updatedAt DESC, id DESC`; items link `/tickets/:id`, View all sorts My Tickets by update.
- **Recently resolved:** five owned `RESOLVED|CLOSED` Tickets, `resolvedAt DESC, id DESC`; items link to detail, View all `/tickets?view=resolved`.
- Zero-count cards remain visible with `0`. Empty lists state “No recently updated/resolved Tickets.” No foreign requester identity appears in requests or URLs.
- This page summarizes rather than reproducing My Tickets filtering/table controls.

## 3. IT Staff and Administrator Dashboard

**Route:** `/staff/dashboard`

**Users:** IT Staff and Administrator with identical operational behavior

**API:** `GET /api/dashboard/staff`

**Traceability:** FR-L4-SD-01–03, FR-L4-HARD-01, FR-L4-HARD-02, FR-L4-HARD-04; AC-L4-15–17, AC-L4-20, AC-L4-22.

```text
+------------------------------------------------------+
| Staff Dashboard                         [Open Queue]  |
| [Unassigned: 4 →] [Owned by me: 6 →]                 |
| Ticket status                 Active IT priority      |
| New 2 Open 3 ...              Low 2 Medium 5 High 3  |
|                                                      |
| Recent urgent Tickets         My current Actions     |
| TKT-... High ...              Action ... In progress |
+------------------------------------------------------+
```

- Unassigned/owned cards count active statuses and link to the existing queue with `view=active&ownerId=unassigned|me`.
- All eight status counts link to `/staff/queue?status={status}`. Active priority counts link to `/staff/queue?view=active&itPriority={priority}`.
- Recent urgent means five active `HIGH` IT-priority Tickets ordered by update; rows link to staff Ticket detail and View all to `/staff/queue?view=active&itPriority=HIGH`.
- My current Actions means five assigned-to-current-user `PLANNED|IN_PROGRESS` Actions ordered by update; each links directly to its Ticket and Action fragment.
- All cards show `0`; each empty list has a specific message. No optional account metrics are added.

## 4. Actions Taken — Staff/Administrator Ticket Detail

**Route:** existing `/staff/tickets/:ticketId`

**Users:** IT Staff and Administrator, regardless of Ticket owner

**APIs:** `GET|POST /api/tickets/:ticketId/actions`, `PATCH /api/tickets/:ticketId/actions/:actionId`, `GET /api/action-assignees`

**Traceability:** FR-L4-ACT-01–08, FR-L4-HARD-01, FR-L4-HARD-02, FR-L4-HARD-04; AC-L4-01–09, AC-L4-20–22.

```text
+ Actions Taken ---------------------------------------+
| [Add Action]                                         |
| Created       Description        Assignee      Status |
| 29 Oct 11:30  Replace cable      Mali          Done   |
|   Result: Connection restored    [View]               |
| 29 Oct 12:10  Monitor network    Narin         Planned|
|                                      [View / Edit]    |
+------------------------------------------------------+
```

### 4.1 List and View Mode

- Stable order is `createdAt ASC, id ASC`; edits never visually reorder history.
- Summary exposes created time, description, assignee, performer, status, result, follow-up indication, and attachment-note indication. View mode exposes all complete current-state fields. A null assignee is displayed explicitly as “Unassigned — reassignment required,” never as a blank value.
- Performer is labelled “Recorded/Performed by” and read-only. Assignee is labelled “Assigned to”; both are shown even if identical. Ticket Owner remains in the Ticket summary, avoiding role confusion.
- Empty state: “No Actions Taken have been recorded.” Requesters and staff see current Action records; only staff/admin may edit. Audit snapshots are not rendered in normal detail UI.
- Each item has `id="action-{id}"` so dashboard links can focus/scroll to it.

### 4.2 Create Mode

| Field | Control and behavior |
|---|---|
| Action Description | Required textarea, 1–2000; counter/help associated to control. |
| Assigned to | Required searchable/select list from active staff/admin endpoint. |
| Result | Optional textarea up to 2000; not required until completion. |
| Follow-Up Required? | Checkbox/switch with explicit Yes/No accessible state. |
| Follow-up Note | Conditionally shown and required 1–2000 when checked; clearing checkbox clears after confirmation if nonblank. |
| Attachment Notes | Optional textarea up to 2000 explaining which existing Ticket attachment to inspect. |
| Status | `Planned` default or `In Progress`; terminal creation unavailable. |
| Performed by / Created | Read-only explanation: current signed-in user/server time, not editable controls. |

- Generate one UUID idempotency key when create mode opens; reuse it for retries of that logical submission and generate a new one after success/cancel/reopen.
- Disable submit while pending. Repeated clicks cause one request; a network retry safely reuses the key.
- On `201/200 replay`, announce success, close/reset mode, and refresh the list. On recoverable failure, preserve entered values.

### 4.3 Edit Mode

- Populate the current Action and retain its `version`. Editable: description, assignee, result, follow-up flag/note, attachment notes, and allowed next status.
- If deactivation/demotion left `assignedToId = null`, open a restricted reassignment mode: only the assignee control and versioned **Reassign** submission are enabled. Content and status controls remain read-only, and completion is unavailable until reassignment to an eligible user succeeds. The client sends no unrelated fields in this request.
- `PLANNED` offers `IN_PROGRESS`, `COMPLETED`, `CANCELLED`; `IN_PROGRESS` offers `COMPLETED`, `CANCELLED`. Terminal Actions open view-only.
- Selecting `COMPLETED` requires nonblank Result before submit. Cancel is explicit and requires a confirmation dialog; it does not delete the Action.
- Inactive/missing assignee response keeps values, marks the assignee field, refreshes choices, and asks the user to select an eligible user.
- `STALE_ACTION` opens a conflict panel: “This Action changed since you opened it,” with **Review latest** (default) and **Discard my draft**. Never auto-overwrite or silently merge.
- Accepted edits announce success and refresh current state/version. The append-only audit revision is backend-managed internal evidence; Lab 4 provides no revision-history screen or read API.

## 5. Requester Ticket Detail — Read-only Actions

**Route:** existing `/tickets/:ticketId`

**Users:** authenticated owner only

**API:** `GET /api/tickets/:ticketId/actions`

**Traceability:** FR-L4-ACT-06, FR-L4-HARD-02, FR-L4-HARD-04; AC-L4-03, AC-L4-21, AC-L4-22.

- Render **all** current Actions using the same stable order and complete field labels as staff view.
- Do not render Add, Edit, Assign, Complete, or Cancel controls. Never fetch a staff payload and filter client-side.
- Action loading/error remains local so the rest of Ticket detail is usable. Cross-owner navigation follows existing not-found handling.

## 6. Ticket Workflow Feedback

**API:** modified `PATCH /api/staff/tickets/:ticketId/status`.

- Staff/admin status control shows only next states from the specification matrix plus the current state as read-only context.
- Submit the displayed `workflowVersion`; disable only the active mutation controls while pending. This is a deliberate change to the Lab 3 request body, so all existing status callers and frontend/API/component/E2E tests must be updated to provide it while preserving the intended Lab 3 workflow behavior.
- Before `RESOLVED`, explain that one completed Action with a Result is required. Client guidance does not replace server enforcement.
- `ACTION_REQUIRED` leaves status unchanged and links focus to Actions Taken. `STALE_TICKET` presents latest status/version and requires deliberate retry. Invalid transition and terminal cancellation show concise conflict feedback.
- Successful transition refreshes Ticket header/status, version, timestamps, and available next transitions.
- Requester “appears resolved” retains advisory wording and never claims to resolve/close the Ticket.

## 7. Shared Feedback and Safe Failure

| State | Required behavior |
|---|---|
| Loading | Stable page/section heading, labelled progress; avoid layout jump. |
| Empty/zero | Specific explanatory text; metric cards show `0`. |
| Validation | Error summary receives focus; fields use `aria-invalid` and linked messages. |
| Forbidden | Explain lack of access without exposing protected data; provide safe role home link. |
| Not found | Existing safe Ticket not-found pattern; do not reveal cross-owner existence. |
| Conflict | Preserve draft; show latest-version recovery and never auto-overwrite. |
| Network/server | Safe message and Retry; preserve recoverable form input; no raw stack/SQL. |
| Success | `aria-live="polite"` confirmation and refreshed authoritative state. |

## 8. Responsive and Accessibility Contract

- Test desktop, tablet, and 375×812 mobile. No page-level horizontal overflow, clipped text, overlapping controls, or inaccessible dialog content.
- Dashboard card grids collapse from multi-column to one column. Tables become labelled stacked cards on narrow screens; source/keyboard order stays logical.
- Use `main`, nav, sections/headings, lists/tables, native buttons/links/inputs, visible labels, and `<time datetime>` with locale display.
- All behavior is keyboard-operable with visible focus. Dialogs label title/description, trap focus, support Escape where safe, and restore trigger focus.
- Color is never the only status/priority/action cue; Zen Green tokens meet WCAG 2.1 AA contrast.
- Dynamic loading/success/error messages use restrained live regions. Focus moves only for validation, conflict, or dialog workflows where needed.
- Touch targets and controls remain comfortably operable; zoom/reflow does not hide actions.

## 9. Screen-State and Drill-down Verification

| Surface | Required modes/states | Destination verification |
|---|---|---|
| Requester dashboard | loading, zero, populated, failure | `/tickets` filters and `/tickets/:id` |
| Staff/admin dashboard | loading, zero, populated, forbidden, failure | `/staff/queue` filters and `/staff/tickets/:id` |
| Staff Actions | list, empty, create, view, edit, completed/cancelled read-only | Action fragment on existing staff detail |
| Requester Actions | loading, empty, populated, failure, read-only | Existing owned Ticket detail only |
| Workflow | allowed, action-required, stale, invalid, success | Refreshed staff Ticket detail |

## 10. Regression and Visual Checklist

- Login/logout/password change and role navigation remain correct.
- My Tickets/create/detail, requester resolution advisory, attachments, and public comments remain correct.
- Staff queue/detail, claim/reassign, priority/status, comments/internal notes remain correct.
- Administrator user management and eligibility cleanup remain correct, now including nonterminal Action assignment cleanup.
- No broken links, placeholders, duplicate/obsolete controls, console errors, unsafe errors, or changed Zen Green conventions.
- Capture readable desktop/tablet/mobile evidence for both dashboards and Actions list/create/view/edit/validation/conflict modes.
