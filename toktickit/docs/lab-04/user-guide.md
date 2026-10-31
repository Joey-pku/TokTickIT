# TokTickIT User Guide

## Signing in and navigation

Open the client and sign in with an active account. An account using an initial or reset password is sent to **Change Password** before protected pages are available. The profile menu provides Change Password and Logout. Navigation is role-dependent; entering an unauthorized client route redirects to the role's dashboard, while the API independently enforces authorization.

## Requester workflows

The Requester default route is `/dashboard`.

### Dashboard

- **Active Tickets** and **Waiting for you** cards show owned counts and open filtered **My Tickets** views.
- **Recently updated** and **Recently resolved** contain up to five owned Tickets and link to Ticket Detail.
- Empty lists show explicit messages; **Try Again** retries a failed dashboard request.

### Create and find Tickets

1. Choose **Create Ticket** (`/tickets/new`).
2. Select Category and Related System, choose Requested Priority, and enter Ticket Summary and Description.
3. Optionally select up to five supported attachments, then submit. The server assigns the `TKT-YYYY-NNNNNN` number and initial workflow values.
4. Use **My Tickets** (`/tickets`) to search, filter, sort, change page size, or open an owned Ticket.

### Ticket Detail, attachments, comments, and Actions

- Ticket data is read-only after creation.
- Upload additional supported attachments while capacity remains. Download active files. Removal requires a reason and keeps audit metadata.
- Public comments are visible to the Requester and Staff. Confidential Internal Notes are never included in the Requester view.
- **Actions Taken** displays every current Action on the owned Ticket, including performer, assignee, result, follow-up, notes, status, and timestamps. Requesters cannot add or edit Actions.
- On an eligible Ticket, **Problem Appears Resolved** records a Requester advisory for Staff; it does not formally change Ticket status. Staff still perform the controlled `RESOLVED` transition.

Cross-owner Ticket and Action requests use non-disclosing not-found behavior.

## IT Staff workflows

The Staff default route is `/staff/dashboard`.

### Dashboard and Ticket Queue

- The dashboard shows active unassigned and owned-by-me counts, all eight status counts, active IT-priority counts, five recent urgent Tickets, and five current Actions assigned to the signed-in user.
- Cards and summary rows open matching filters in **Ticket Queue** (`/staff/queue`). Action items link to the Ticket and Action fragment.
- The queue supports search, status, category, requested priority, IT priority, owner, sorting, and pagination. Mobile layouts use labelled Ticket cards rather than hiding required information.

### Ticket operations

Open `/staff/tickets/:ticketId` from the queue.

- **Assigned Owner:** assign to an eligible Staff/Administrator, claim the Ticket, or leave it unassigned.
- **IT Priority:** set Low, Medium, or High independently from the Requester's requested priority.
- **Change status:** choose only an allowed next state, then select **Update Status**. Stale workflow versions require reviewing the latest Ticket before retrying.
- Add Public Comments for the Requester or Confidential Internal Notes for internal work.
- A Requester's “appears resolved” indication is advisory and is shown separately from formal Ticket status.

The eight Ticket statuses are `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`. The UI offers only transitions allowed by the approved matrix. Formal resolution requires at least one completed Action with a nonblank Result. `CLOSED` follows `RESOLVED`; a closed Ticket can be reopened.

### Actions Taken

1. In Ticket Detail, choose **Add Action**.
2. Select an eligible active IT Staff/Administrator assignee and enter Action Description. Result, Follow-Up Required, Follow-up Note, and Attachment Notes follow the displayed validation.
3. Record as Planned or In Progress. The signed-in creator is the immutable performer.
4. Use **View / Edit** to update permitted fields and move `PLANNED` to `IN_PROGRESS`, `COMPLETED`, or `CANCELLED`; `IN_PROGRESS` can move to `COMPLETED` or `CANCELLED`.
5. Completing requires a nonblank Result. Cancellation asks for confirmation. Completed and cancelled Actions are read-only.

If account deactivation or demotion leaves a nonterminal Action unassigned, the UI exposes reassignment only. Reassign it before any other edit or completion. Stale edits preserve the draft and offer **Review latest** or **Discard my draft**. Audit revisions are internal evidence and have no normal UI screen.

## Administrator workflows

Administrators use `/staff/dashboard`, the Staff Ticket Queue, Ticket Detail, workflow, and Actions with the same operational rules as IT Staff.

### User Management

Open **User Management** (`/admin/users`).

- Search users or filter by role.
- **Create User:** enter name, email, optional department, role, active state, and a compliant initial password. The new user must change that password at first sign-in.
- **Edit:** update profile, role, or active state. Server safeguards prevent invalid last-administrator or self-deactivation outcomes.
- **Reset Password:** set a compliant temporary password. Existing sessions for that user are revoked and a password change is required.

Deactivating or demoting a Staff/Administrator also performs the approved cleanup: active Ticket ownership is cleared and their nonterminal Action assignments become unassigned without deleting history. Administrator permissions do not bypass Ticket or Action lifecycle rules.

## Error and accessibility behavior

Loading, empty, validation, success, network failure, and stale-version states are displayed without exposing raw server internals. Recoverable forms preserve entered values. All primary workflows are keyboard-operable with visible focus; dialogs support Escape and restore focus where specified. Automated checks cover responsive layouts, but users should report assistive-technology or zoom issues with the browser, viewport, role, route, and reproduction steps.
