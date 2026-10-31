# Implemented API Reference

This is a delivery index of implemented routes. The approved request/response fields, validation boundaries, transition matrices, concurrency rules, and error semantics remain normative in [`api-spec.md`](api-spec.md) and [`specification.md`](specification.md).

## Conventions

- Base URL in development: `http://localhost:3000`.
- JSON mutation requests require `X-Requested-With: XMLHttpRequest`; allowed browser origins are also checked. Multipart attachment upload uses the same mutation metadata.
- Authentication uses an opaque HTTP-only `toktickit_session` cookie. The database stores only its SHA-256 digest.
- `requireRole("IT_STAFF")` permits active IT Staff and Administrators. Requester resources derive identity from the session, never a client-provided requester ID.
- Normal JSON errors use `{ "error": { "code": "...", "message": "...", "fields"?: { ... } } }`.
- Common statuses: `400 VALIDATION_ERROR`, `401 AUTHENTICATION_REQUIRED`, `403 FORBIDDEN` or `CSRF_REJECTED`, non-disclosing `404 TICKET_NOT_FOUND`, `409` workflow/Action conflicts, `413/415` attachment errors, `429` login throttling, and safe `500 INTERNAL_ERROR`.

## Public reference and authentication

| Method and endpoint | Access | Request | Success |
| --- | --- | --- | --- |
| `GET /api/health` | Public | None | Service status object. |
| `GET /api/categories` | Public | None | `{ items: [{ id, name }] }`. |
| `GET /api/related-systems` | Public | None | Active systems as `{ items }`. |
| `POST /api/auth/login` | Public + mutation metadata | `{ email, password }` | Session cookie and `{ user }`; may return `429`. |
| `POST /api/auth/logout` | Signed in, including password-change gate | No body | Clears current session. |
| `GET /api/auth/me` | Signed in, including password-change gate | None | `{ user }`. |
| `POST /api/auth/change-password` | Signed in, including password-change gate | `{ currentPassword, newPassword, confirmPassword }` | Updates password, clears the forced-change gate, and revokes other sessions. |

## Requester Tickets, comments, and advisory resolution

| Method and endpoint | Access | Request | Success |
| --- | --- | --- | --- |
| `POST /api/tickets` | Requester | Category/system IDs, requested priority, summary, description | `201` Ticket DTO with server Ticket number/status/timestamps. |
| `GET /api/tickets` | Requester | Search/filter/sort/pagination query | Owned `{ items, pagination }`. |
| `GET /api/tickets/:ticketId` | Owning Requester | Path ID | Owned Ticket Detail; other/missing is safe `404`. |
| `POST /api/tickets/:ticketId/appear-resolved` | Owning Requester | No body | Idempotent advisory timestamp; does not change Ticket status. |
| `GET /api/tickets/:ticketId/comments` | Owning Requester or Staff/Admin | Path ID | Public comments. |
| `POST /api/tickets/:ticketId/comments` | Owning Requester or Staff/Admin | `{ content }` | `201` public comment. |
| `GET /api/tickets/:ticketId/internal-notes` | Staff/Admin | Path ID | Confidential notes. |
| `POST /api/tickets/:ticketId/internal-notes` | Staff/Admin | `{ content }` | `201` confidential note. |

## Attachments

| Method and endpoint | Access | Request | Success |
| --- | --- | --- | --- |
| `POST /api/tickets/:ticketId/attachments` | Owning Requester or Staff/Admin | Multipart `file`; five-active-file limit and approved type/size rules | `201` attachment metadata. |
| `GET /api/attachments/:attachmentId` | Authorized Ticket reader | Path ID | Active/removed metadata according to role and contract. |
| `GET /api/attachments/:attachmentId/download` | Authorized active-file reader | Path ID | Original bytes with safe content headers. |
| `PATCH /api/attachments/:attachmentId/remove` | Authorized owner/Staff operation | `{ reason }` | Soft-removal audit metadata. |

## Actions Taken

| Method and endpoint | Access | Request | Success |
| --- | --- | --- | --- |
| `GET /api/tickets/:ticketId/actions` | Owning Requester or Staff/Admin | Path ID | `{ items }`, ordered by creation and ID. |
| `POST /api/tickets/:ticketId/actions` | Staff/Admin | `idempotencyKey`, assignee, description, result/follow-up/notes/status fields | `201` new Action; identical replay is `200` with `Idempotent-Replay: true`. |
| `PATCH /api/tickets/:ticketId/actions/:actionId` | Staff/Admin | Current `version` plus permitted editable fields | Updated Action and incremented version. |
| `GET /api/action-assignees` | Staff/Admin | None | Active IT Staff/Administrator choices. |

Action creation rejects reuse of an idempotency key with a different canonical payload. Updates use optimistic concurrency and return `STALE_ACTION` for an old version. System-unassigned nonterminal Actions accept only current `version` plus one eligible `assignedToId`; all other edits remain blocked until reassignment. Terminal Actions are read-only. No audit-revision read endpoint exists.

## Staff Ticket operations

| Method and endpoint | Access | Request | Success |
| --- | --- | --- | --- |
| `GET /api/staff/tickets` | Staff/Admin | Search/filter/sort/pagination query | Operational `{ items, pagination }`. |
| `GET /api/staff/users` | Staff/Admin | None | Eligible owner choices. |
| `GET /api/staff/tickets/:ticketId` | Staff/Admin | Path ID | Staff Ticket Detail including comments, notes, attachments, and workflow version. |
| `PATCH /api/staff/tickets/:ticketId/assign` | Staff/Admin | `{ ownerId }` (`null` unassigns) | Updated ownership. |
| `PATCH /api/staff/tickets/:ticketId/priority` | Staff/Admin | `{ itPriority }` | Updated IT priority. |
| `PATCH /api/staff/tickets/:ticketId/status` | Staff/Admin | `{ status, workflowVersion }` | Updated workflow state and incremented version. |

Status requests reject stale versions before overwriting newer work. A transition to `RESOLVED` requires a related `COMPLETED` Action with trimmed nonblank Result and is committed atomically with resolution metadata.

## Dashboards

| Method and endpoint | Access | Request | Success |
| --- | --- | --- | --- |
| `GET /api/dashboard/requester` | Requester | None; identity is session-derived | Owned metrics, top-five recent lists, and drill-down URLs. |
| `GET /api/dashboard/staff` | Staff/Admin | None; identity is session-derived | Operational metrics/summaries, recent urgent Tickets, current assigned Actions, and drill-down URLs. |

Dashboard payloads include every contracted metric key, return zero/empty values explicitly, and are calculated in one repeatable-read snapshot.

## Administrator User Management

| Method and endpoint | Access | Request | Success |
| --- | --- | --- | --- |
| `GET /api/admin/users` | Administrator | Search/role/sort/pagination query | `{ items, pagination }`. |
| `POST /api/admin/users` | Administrator | Name, email, department, role, active state, initial password | `201 { user }`, forced password change enabled. |
| `PATCH /api/admin/users/:userId` | Administrator | Editable account fields | `{ user }`; enforces administrator safeguards and assignment cleanup. |
| `POST /api/admin/users/:userId/reset-password` | Administrator | `{ initialPassword }` | Resets password, enables forced change, revokes sessions. |

Deactivation/demotion clears active Ticket ownership and nonterminal Action assignments in the same transaction without deleting Ticket, Action, performer, or revision history.
