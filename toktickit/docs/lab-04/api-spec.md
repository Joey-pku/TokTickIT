# Lab 4 REST API Specification

**Status:** Implementation-ready companion to `specification.md`.

## 1. Shared Conventions

- Base path `/api`; JSON camelCase; timestamps are UTC ISO-8601; IDs are positive 32-bit integers.
- Existing opaque session cookie and mandatory-password-change enforcement remain. All mutations require existing CSRF protection.
- Explicit roles are `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`; “staff/admin” below means the latter two.
- Unknown fields, wrong content type, malformed IDs, and invalid field combinations return `400 VALIDATION_ERROR` with the existing `{ error: { code, message, fields? } }` envelope.
- Cross-owner requester probes return `404 TICKET_NOT_FOUND`. Authenticated but disallowed roles return `403 FORBIDDEN` where non-disclosure is not required.
- List ordering is stable and all dashboard queries execute in one repeatable-read transaction.

## 2. Endpoint Summary

| Method | URL | Roles | Change |
|---|---|---|---|
| `GET` | `/tickets/:ticketId/actions` | Owning Requester, IT Staff, Administrator | New |
| `POST` | `/tickets/:ticketId/actions` | IT Staff, Administrator | New |
| `PATCH` | `/tickets/:ticketId/actions/:actionId` | IT Staff, Administrator | New |
| `GET` | `/action-assignees` | IT Staff, Administrator | New |
| `PATCH` | `/staff/tickets/:ticketId/status` | IT Staff, Administrator | Modified |
| `GET` | `/dashboard/requester` | Requester | New |
| `GET` | `/dashboard/staff` | IT Staff, Administrator | New |
| `GET` | `/tickets` | Requester | Modified query options only |
| `GET` | `/staff/tickets` | IT Staff, Administrator | Modified role/query options |

## 3. Action Representation

```json
{
  "id": 41,
  "ticketId": 17,
  "performedById": 8,
  "performedByName": "Narin Support",
  "assignedToId": 9,
  "assignedToName": "Mali Admin",
  "description": "Replace damaged network cable",
  "result": "Connection restored",
  "followUpRequired": true,
  "followUpNote": "Confirm stability tomorrow",
  "attachmentNotes": "See cable-before.jpg in Ticket attachments",
  "status": "COMPLETED",
  "version": 3,
  "createdAt": "2026-10-29T04:30:00.000Z",
  "updatedAt": "2026-10-29T05:10:00.000Z"
}
```

Requester responses use this shape because the handout requires all Actions to be visible; audit revision snapshots are never included. Performer is the authenticated creator and cannot be client-written. Assignee is the active user responsible for the Action and may differ from performer and Ticket owner. `assignedToId` and `assignedToName` are `null` only after deactivation/demotion cleanup and remain null until the reassignment-only recovery succeeds.

## 4. Actions Taken Endpoints

### 4.1 `GET /api/tickets/:ticketId/actions`

Returns all Actions ordered `createdAt ASC, id ASC`.

- **Authorization:** Requester only when `ticket.requesterId=session.userId`; staff/admin for any existing Ticket.
- **Request:** no body/query.
- **Success:** `200 OK` — `{ "items": [Action] }`; no Actions returns `items: []`.
- **Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 TICKET_NOT_FOUND`.
- **Traceability:** FR-L4-ACT-01, FR-L4-ACT-06; AC-L4-03.

### 4.2 `POST /api/tickets/:ticketId/actions`

Creates an Action; the server supplies Ticket, performer, version, and timestamps.

```json
{
  "idempotencyKey": "8ce47993-287f-4a23-aa3a-3dd60e031bf1",
  "assignedToId": 9,
  "description": "Replace damaged network cable",
  "result": "",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "See cable-before.jpg",
  "status": "PLANNED"
}
```

| Field | Rule |
|---|---|
| `idempotencyKey` | Required UUID unique to the logical submit. |
| `assignedToId` | Required active IT Staff/Administrator ID. |
| `description` | Required trimmed string, 1–2000. |
| `result` | Optional/default `""`, maximum 2000; required nonblank for `COMPLETED`. |
| `followUpRequired` | Required Boolean. |
| `followUpNote` | Required trimmed 1–2000 iff flag true; otherwise must be `null`/omitted. |
| `attachmentNotes` | Optional `null` or trimmed 1–2000; references existing Ticket attachments. |
| `status` | Optional `PLANNED` (default) or `IN_PROGRESS`; creation directly as terminal is rejected. |

- **Authorization:** staff/admin; Ticket ownership is not required.
- **Success:** `201 Created` with Action. Same key and canonical payload returns `200 OK` with the original Action and `Idempotent-Replay: true`.
- **Conflicts:** `409 IDEMPOTENCY_CONFLICT` for same key/different canonical payload; `409 INELIGIBLE_ASSIGNEE` for inactive/Requester/missing assignee.
- **Atomicity:** idempotency check, eligibility lock, and insert are one transaction.
- **Traceability:** FR-L4-ACT-01–05, FR-L4-ACT-08; AC-L4-01–02, AC-L4-04–05, AC-L4-08.

### 4.3 `PATCH /api/tickets/:ticketId/actions/:actionId`

Edits the current record while appending one audit revision.

```json
{
  "version": 2,
  "assignedToId": 9,
  "description": "Replaced damaged network cable",
  "result": "Connection restored",
  "followUpRequired": true,
  "followUpNote": "Confirm stability tomorrow",
  "attachmentNotes": "See before/after Ticket attachments",
  "status": "COMPLETED"
}
```

- **Body:** `version` is required. Any subset of remaining editable fields is allowed, but at least one must be present. Final merged state must satisfy Section 4.2 validation and the Action transition matrix. Exception for system-unassigned nonterminal Actions: the only accepted patch contains exactly `version` and one eligible `assignedToId`; combining reassignment with any content/status field returns `400 VALIDATION_ERROR`. Until that succeeds, all other edits and completion return `409 ACTION_UNASSIGNED`.
- **Immutable:** `id`, `ticketId`, `performedById`, `createdAt`, `idempotencyKey`.
- **Authorization:** staff/admin on accessible Ticket, regardless of owner/performer/assignee. Terminal Actions reject all edits.
- **Success:** `200 OK` with updated Action, incremented version.
- **Conflicts:** `409 STALE_ACTION` (version mismatch, includes `currentVersion`), `INVALID_ACTION_TRANSITION`, `TERMINAL_ACTION`, `ACTION_UNASSIGNED`, or `INELIGIBLE_ASSIGNEE`.
- **Atomicity:** lock eligibility, conditional `id+ticketId+version` update, version increment, and revision insert are one transaction. No-op canonical patch returns current representation without a revision/version change.
- **Audit:** revision stores editor ID/time and before/after snapshots as internal persistence and automated-test evidence. Lab 4 intentionally defines no revision-read endpoint or UI for Requesters, staff, or administrators.
- **Traceability:** FR-L4-ACT-04–08; AC-L4-05–07, AC-L4-09.

### 4.4 `GET /api/action-assignees`

- **Authorization:** staff/admin.
- **Success:** `200 OK` — `{ "items": [{ "id": 9, "name": "Mali Admin", "role": "ADMINISTRATOR" }] }`, active `IT_STAFF|ADMINISTRATOR` only, ordered name then ID.
- **Important:** list membership does not replace transactional eligibility recheck on create/edit.
- **Traceability:** FR-L4-ACT-05; AC-L4-05.

## 5. Ticket Workflow Endpoint

### 5.1 `PATCH /api/staff/tickets/:ticketId/status` (modified)

```json
{ "status": "RESOLVED", "workflowVersion": 4 }
```

- **Authorization change:** admit both IT Staff and Administrators; reject Requesters.
- **Lab 3 compatibility:** requiring `workflowVersion` changes the Lab 3 request body from `{ "status": ... }` to the shape above. Implementation must update every existing frontend caller and unit/API/component/E2E test or fixture to send the latest version. This concurrency addition must preserve the Lab 3 role intent, transition matrix, same-state behavior, reopening cleanup, and safe errors except where this Lab 4 contract explicitly adds administrator access and the resolution gate.
- **Validation:** exact body keys; valid status; required positive current workflow version.
- **Resolution:** `RESOLVED` requires at least one related `COMPLETED` Action with trimmed nonblank result. `CLOSED` is only from `RESOLVED`.
- **Success:** `200 OK` with existing status DTO plus `workflowVersion` and `resolvedAt`.
- **Conflicts:** `409 INVALID_STATUS_TRANSITION`, `ACTION_REQUIRED`, or `STALE_TICKET` with current version.
- **Atomicity:** Ticket/version read, transition/action gate, conditional update, advisory/timestamp clearing, and version increment occur in one transaction.
- **Same state:** matching version returns current record without increment; stale version still conflicts.
- **Traceability:** FR-L4-WF-01–05; AC-L4-10–13.

## 6. Dashboard Endpoints

### 6.1 `GET /api/dashboard/requester`

- **Authorization:** Requester only; server uses session user ID.
- **Request:** no query/body.
- **Success:** `200 OK`.

```json
{
  "metrics": { "active": 3, "waitingForRequester": 1 },
  "recentlyUpdated": [{
    "id": 17, "ticketNumber": "TKT-2026-000017", "summary": "No network connection",
    "currentStatus": "IN_PROGRESS", "requestedPriority": "HIGH",
    "updatedAt": "2026-10-29T05:10:00.000Z", "href": "/tickets/17"
  }],
  "recentlyResolved": [{
    "id": 12, "ticketNumber": "TKT-2026-000012", "summary": "Printer unavailable",
    "currentStatus": "CLOSED", "resolvedAt": "2026-10-28T08:00:00.000Z",
    "href": "/tickets/12"
  }],
  "drillDown": {
    "active": "/tickets?view=active",
    "waitingForRequester": "/tickets?status=WAITING_FOR_REQUESTER",
    "recentlyUpdated": "/tickets?sortBy=updatedAt&sortOrder=desc",
    "recentlyResolved": "/tickets?view=resolved"
  }
}
```

Calculations, statuses, order, limit five, UTC interpretation, and zero behavior are exactly Section 7.1 of `specification.md`. Every query includes authenticated requester ownership. Errors: `401`, `403`, `500`; no partial metric payload on failure.

- **Traceability:** FR-L4-RD-01–03; AC-L4-14, AC-L4-16–17.

### 6.2 `GET /api/dashboard/staff`

- **Authorization:** IT Staff and Administrator; current-user values use session ID.
- **Success:** `200 OK`.

```json
{
  "metrics": { "unassignedActive": 4, "ownedByMeActive": 6 },
  "byStatus": { "NEW": 2, "OPEN": 3, "IN_PROGRESS": 4, "WAITING_FOR_REQUESTER": 1, "RESOLVED": 2, "CLOSED": 8, "REOPENED": 0, "CANCELLED": 1 },
  "activeByPriority": { "LOW": 2, "MEDIUM": 5, "HIGH": 3 },
  "recentUrgent": [{
    "id": 17, "ticketNumber": "TKT-2026-000017", "summary": "No network connection",
    "currentStatus": "IN_PROGRESS", "itPriority": "HIGH", "ownerId": 7,
    "updatedAt": "2026-10-29T05:10:00.000Z", "href": "/staff/tickets/17"
  }],
  "myCurrentActions": [{
    "id": 41, "ticketId": 17, "ticketNumber": "TKT-2026-000017",
    "description": "Replace damaged network cable", "status": "IN_PROGRESS",
    "updatedAt": "2026-10-29T05:00:00.000Z", "href": "/staff/tickets/17#action-41"
  }],
  "drillDown": {
    "unassignedActive": "/staff/queue?view=active&ownerId=unassigned",
    "ownedByMeActive": "/staff/queue?view=active&ownerId=me",
    "recentUrgent": "/staff/queue?view=active&itPriority=HIGH"
  }
}
```

Calculations, all status/priority keys, order, limit five, UTC interpretation, zero/empty behavior, and drill-downs are exactly Section 7.2. Errors: `401`, `403`, `500`.

- **Traceability:** FR-L4-SD-01–03; AC-L4-15–17.

## 7. My Tickets Query Extension

### 7.1 `GET /api/tickets` (modified)

Retain all Lab 3 query parameters. Add mutually exclusive `view=active|resolved`:

- `active`: statuses `NEW|OPEN|IN_PROGRESS|WAITING_FOR_REQUESTER|REOPENED`.
- `resolved`: statuses `RESOLVED|CLOSED`, ordered by `resolvedAt DESC, id DESC` unless the caller explicitly supplies a compatible sort.
- Supplying both `view` and `status` returns `400 VALIDATION_ERROR`.
- Ownership remains derived from session. This supports requester dashboard drill-down without a new full-list screen.

### 7.2 `GET /api/staff/tickets` (modified)

- Admit both IT Staff and Administrators.
- Retain all Lab 3 parameters and add `view=active`, meaning the five active statuses defined in BR-L4-16.
- `view=active` may combine with `ownerId` and `itPriority`, so dashboard drill-down results exactly match their cards. Combining `view` with a contradictory explicit `status` returns `400 VALIDATION_ERROR`.
- The frontend route remains `/staff/queue`; it forwards these URL query parameters to this endpoint.

## 8. Error and Conflict Matrix

| HTTP | Code | Meaning/recovery |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Correct fields; retained UI values may be resubmitted. |
| 401 | `UNAUTHENTICATED` | Reauthenticate. |
| 403 | `FORBIDDEN` | Role lacks capability. |
| 404 | `TICKET_NOT_FOUND` / `ACTION_NOT_FOUND` | Missing or ownership-hidden resource. |
| 409 | `INELIGIBLE_ASSIGNEE` | Refresh active assignees and choose another. |
| 409 | `ACTION_UNASSIGNED` | Reassign the Action with a reassignment-only patch before editing/completing it. |
| 409 | `IDEMPOTENCY_CONFLICT` | Generate a new key only for a genuinely new logical action. |
| 409 | `STALE_ACTION` | Refetch, show conflict, and let user deliberately reapply. |
| 409 | `INVALID_ACTION_TRANSITION` / `TERMINAL_ACTION` | Refresh and follow lifecycle. |
| 409 | `INVALID_STATUS_TRANSITION` / `ACTION_REQUIRED` / `STALE_TICKET` | Refresh Ticket/work; do not overwrite. |
| 500 | `INTERNAL_ERROR` | Safe generic message; no stack/SQL leakage. |

All Labs 1–3 endpoints and response fields remain available except the documented status-request precondition and My Tickets query extension.
