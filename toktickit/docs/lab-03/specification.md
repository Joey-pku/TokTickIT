# Lab 3 Sprint Engineering Specification

> **Document Status**: Draft — Pending Review  
> **Target Branch**: `docs/lab3-engineering-contract`  
> **Course Stack**: React + TypeScript + Vite (Client) / Node.js + Express + TypeScript + Prisma + PostgreSQL (Server)

---

## 1. Sprint Goal

Deliver a secure, role-authenticated increment for the TokTickIT service desk application. This sprint replaces the temporary Lab 2 Development Requester selector with real session-based authentication, first-login mandatory password change enforcement, and server-side role-based access control (RBAC) across three distinct roles: **Requester**, **IT Staff**, and **Administrator**. It introduces the first operational **IT Staff Ticket Queue** and **Ticket Detail** workflows (ticket ownership claiming and reassignment, IT Priority management, 8-state ticket lifecycle transitions, public comments, and restricted internal notes) and provides a **Minimalist Administrator User Management** screen with strict safety controls, while fully preserving the Lab 2 requester ticketing and attachment functionality through non-destructive database migration.

---

## 2. Stakeholder Request Interpretation

The IT Service Desk organization requires transitioning TokTickIT from a testing-identity simulation into a multi-role operational application.

1. **Authentication & Identity**: The temporary requester dropdown must be completely decommissioned. Users must securely authenticate using an email address and password. Any user provisioned with an initial temporary password (or whose password was reset by an Administrator) must be forced to set a new personal password before accessing any application features. Inactive accounts must be blocked from logging in.
2. **Requester Continuity**: End users (Requesters) must retain the complete functionality established in Lab 2—creating tickets, attaching permitted files, tracking their submissions in "My Tickets", inspecting ticket details, and downloading or soft-removing attachments. Their authenticated identity must automatically govern ticket ownership without client-supplied identity overrides. Requesters can also post Public Comments and signal when their reported issue appears resolved.
3. **IT Staff Operational Workflow**: Support personnel require a centralized, high-efficiency Ticket Queue to discover, triage, and manage incoming work. IT Staff need to search, filter, sort, and paginate tickets; open Ticket Detail; claim unassigned tickets or reassign them among staff; set internal IT Priority; advance tickets across 8 defined lifecycle statuses; communicate publicly with requesters via Public Comments; and record confidential Internal Notes hidden from requesters.
4. **Administrator User Management**: System administrators require a streamlined management interface to list users, search/filter by role, provision new accounts, update account details, toggle active/inactive status, and issue temporary initial passwords. Strict safety rules must prevent self-deactivation, accidental lockout of the last administrator, and email collisions. User deletion is strictly forbidden in favor of deactivation.
5. **Architectural & Visual Integrity**: Server-side enforcement must govern every protected operation—UI button visibility is merely visual guidance, not security. All new screens and controls must seamlessly inherit the Zen Green design system and meet responsive and accessibility standards.

---

## 3. Scope

### 3.1 Included Scope
- **Authentication, CSRF & Credential Security**:
  - Email and password credential validation with case-insensitive email matching.
  - Password hashing using `bcrypt` with a cost factor of 10 salt rounds.
  - Strict password validation: minimum 8 Unicode code points (measured using `Array.from(password).length >= 8`) and maximum 72 UTF-8 bytes (`Buffer.byteLength(password, 'utf8') <= 72`), preserving all leading/trailing whitespace without silent truncation.
  - Server-side database-backed session management (`Session` model) with session tokens transported in an HTTP-only, `SameSite=Lax` cookie (`toktickit_session`).
  - Session lifetime of exactly 8 hours from creation (`expiresAt = createdAt + 8 hours`), rejected when `now >= expiresAt`. Strict server-side revocation on logout, password change, Administrator password reset, and account deactivation.
  - Comprehensive CSRF defense: Server-enforced requirement for header `X-Requested-With: XMLHttpRequest` on all state-modifying API requests (`POST`, `PATCH`, `PUT`, `DELETE`), including login, logout, password change, and multipart uploads. Strict CORS allowlist matching development (`http://localhost:5173`) and test (`http://localhost:5174`) frontends with `credentials: true`.
  - Current authenticated user retrieval (`GET /api/auth/me`).
  - Mandatory first-login / temporary password change gate (`POST /api/auth/change-password`) issuing a replacement active session upon success.
  - Secure logout invalidating the active session record in the database (`POST /api/auth/logout`).
  - Account deactivation check on every authenticated request.
  - Login rate limiting (5 consecutive failed attempts per email within 15 minutes returns HTTP 429).
- **Server-Side Role-Based Access Control (RBAC)**:
  - Strict server-side authorization middleware enforcing permissions for `Requester`, `IT Staff`, and `Administrator`.
  - Elimination of the `x-requester-id` header; authenticated session identity determines all user operations.
  - Information-hiding error semantics (returning HTTP `404 Not Found` rather than `403 Forbidden` for unauthorized cross-requester resource access and requester attempts to access internal notes).
- **Data Model Migration & Stable Seed Strategy**:
  - Non-destructive migration evolving `DevelopmentRequester` into the unified `User` model, preserving integer IDs 1:1.
  - Preservation of all existing Categories, Related Systems, Tickets, Attachments, timestamps, and disk binaries.
  - Stable synthetic identity (`seedKey`) introduced on User, Ticket, Comment, and InternalNote models. During migration, existing Lab 2 seed records are assigned their canonical seed keys (e.g., `seed:req:1` through `seed:req:5`) based on known initial seed emails.
  - Guaranteed seed idempotency: Subsequent seed runs match on `seedKey` and **never** overwrite user-edited emails, names, passwords, temporary password flags, or ticket changes.
  - Backfilling `itPriority` from `requestedPriority` for all existing tickets.
  - Assignment of default hashed initial passwords (`Initial123!`) and `mustChangePassword = true` to migrated accounts.
  - Idempotent seed script provisioning 4 active Requesters, 1 inactive Requester, 3 active IT Staff, 1 inactive IT Staff, 1 active Administrator, realistic tickets across varied statuses/priorities, sample public comments, and internal notes.
- **IT Staff Ticket Queue**:
  - Shared queue displaying Ticket Number, Created Date, Summary, Category, Requested Priority, IT Priority, Status badge, Owner, and Last Updated timestamp.
  - Search across ticket number, summary, and requester name.
  - Filtering by status, category, IT priority, requested priority, and ownership (`all`, `unassigned`, `me`).
  - Sorting by creation date, ticket number, last updated, IT priority, and status with deterministic secondary sort (`id DESC`).
  - Server-side pagination with configurable page sizes (10, 25, 50).
  - Dedicated visual states: loading, empty queue, no search/filter matches, and error states.
- **IT Staff Ticket Detail & Operations**:
  - Ticket ownership assignment: self-claim (auto-advancing `NEW` to `OPEN`), reassign to active IT Staff / Administrator, or unassign (`ownerId: null`).
  - Preserving historical `ownerId` references on completed tickets (`RESOLVED`, `CLOSED`) and terminal tickets (`CANCELLED`) during staff deactivation or demotion to Requester.
  - Automatically unassigning active tickets (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`) when an assigned owner is deactivated or demoted to Requester.
  - Clearing `ownerId` to `null` if a `RESOLVED` or `CLOSED` ticket with an inactive/ineligible owner is reopened.
  - IT Priority configuration (`LOW`, `MEDIUM`, `HIGH`).
  - Permitted 8-state status workflow: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
  - Requester resolution indicator ("Problem Appears Resolved") with backend timestamp `requesterResolvedAt`, automated public comment generation (transactionally creating only one comment under concurrent clicks), and deterministic clearing upon any subsequent requester manual comment or status reopen.
  - Public Comments thread: append-only communication visible to Requester, IT Staff, and Administrator.
  - Internal Notes thread: append-only operational notes visible *only* to IT Staff and Administrator; strictly hidden from Requesters.
- **Administrator User Management**:
  - User listing with Name, Email, Role, Status, and Edit trigger.
  - Text search by user name or email; optional single-role filter.
  - User creation with Name, Email, Role, Active state, and Initial Password (typed manually by Admin; validating complexity without trimming).
  - User editing (Name, Email, Role, Active state).
  - Reset initial password trigger (sets `mustChangePassword = true` and invalidates active user sessions).
  - Safety rules: duplicate email rejection, self-deactivation blocking, last active administrator preservation (atomic verification).
- **Requester Flow Regression & Enhancement**:
  - Full regression testing of Lab 2 ticket creation, my tickets dashboard, detail view, upload, download, and soft removal under authenticated context.
  - Addition of Public Comments thread to Requester Ticket Detail.
  - Addition of "Problem Appears Resolved" button on Requester Ticket Detail.

### 3.2 Explicitly Excluded from Lab 3
- Email delivery services (SMTP), email invitations, password-reset emails via magic link, or account verification emails.
- Multi-factor authentication (MFA / 2FA), OAuth, social login, and Single Sign-On (SSO).
- Public self-registration (all accounts are provisioned by Administrators or seeded).
- Actions Taken / IT Service Action logging tabs and technician time tracking (deferred to Lab 4).
- Formal SLA calculation engines, escalation automation, and notification services.
- Advanced analytics dashboards and KPI metrics beyond simple queue counts.
- Multi-tenant organizational hierarchies, department management, or customer company boundaries.
- User account deletion (hard delete), bulk user imports/exports, and role audit history logs.
- Multiple roles assigned simultaneously to a single user account.
- User profile avatars, photos, or custom extended profile fields.
- Password-generator utility buttons in User Management dialogs.
- Requester-initiated ticket cancellation.
- Cloud infrastructure changes or containerized production deployment.

---

## 4. Functional Requirements

### 4.1 Authentication, CSRF & Session Management
- **FR-01 (User Authentication & Rate Limiting)**: The system shall provide an endpoint (`POST /api/auth/login`) accepting an email and password. Upon successful validation of credentials for an active account (`isActive = true`), the backend creates a `Session` record, sets an HTTP-only, `SameSite=Lax` cookie (`toktickit_session`), and returns the user's public profile and role. The backend enforces a rate limit of at most 5 consecutive failed login attempts per email address within a 15-minute window, returning HTTP `429 Too Many Requests` with code `TOO_MANY_REQUESTS` when exceeded.
- **FR-02 (Credential Validation & Failure)**: When login fails due to incorrect email, incorrect password, or an inactive account (`isActive = false`), the system shall reject the request with HTTP `401 Unauthorized` and a generic error message (`"Invalid email or password. Please try again."`) to prevent account enumeration.
- **FR-03 (Server-Enforced CSRF Protection)**: The server shall enforce CSRF protection on all state-modifying requests (`POST`, `PATCH`, `PUT`, `DELETE`). The server verifies that the inbound `Origin` matches the configured allowlist (`http://localhost:5173` or `http://localhost:5174`; missing Origin permitted for non-browser/test clients) AND that the header `X-Requested-With: XMLHttpRequest` is present. Violations are rejected with HTTP `403 Forbidden` (`CSRF_PROTECTION_FAILED`) prior to route execution or authentication checks.
- **FR-04 (Session Context & Current User)**: The system shall provide an endpoint (`GET /api/auth/me`) that returns the authenticated user's ID, full name, email, role, and password-change requirement status. If no valid session exists or if `now >= expiresAt`, it returns HTTP `401 Unauthorized`.
- **FR-05 (Mandatory First-Login Password Change Gate)**: When a user with `mustChangePassword = true` authenticates, the system shall constrain the user's access. The frontend must redirect the user to the Change Password screen, and backend business endpoints must reject requests with HTTP `403 Forbidden` (`MUST_CHANGE_PASSWORD`) until a new password is submitted.
- **FR-06 (Password Update Processing & Boundary Rules)**: The system shall provide an endpoint (`POST /api/auth/change-password`) allowing an authenticated user to submit their current password, new password, and password confirmation without trimming or silent transformation. The new password must satisfy all complexity requirements (minimum 8 Unicode code points via `Array.from(pwd).length >= 8`, maximum 72 UTF-8 bytes via `Buffer.byteLength(pwd, 'utf8') <= 72`) and differ from the current password. Upon success, the backend updates the password hash, sets `mustChangePassword = false`, invalidates prior sessions, issues a replacement session cookie, and allows immediate continuation.
- **FR-07 (User Logout)**: The system shall provide an endpoint (`POST /api/auth/logout`) that deletes the active `Session` database record, clears the session cookie, and prevents any further authenticated actions until a new login occurs.
- **FR-08 (Deactivated Account Enforcement)**: If an active user account is deactivated by an Administrator while an active session exists, subsequent API requests from that session must immediately fail with HTTP `401 Unauthorized` and delete the session.

### 4.2 Ticket Creation, Requester Operations & Regression
- **FR-09 (Authenticated Ticket Creation)**: All authenticated users (`Requester`, `IT Staff`, `Administrator`) shall be able to create support tickets (`POST /api/tickets`). The ticket's `requesterId` is derived strictly from the authenticated session.
- **FR-10 (My Tickets Dashboard)**: All authenticated users shall be able to view tickets they submitted (`GET /api/tickets`), filtered by their own user ID, with search, category/status/priority filters, sorting, and pagination.
- **FR-11 (Requester Ticket Detail Inspection)**: A user viewing an owned ticket (`GET /api/tickets/:ticketId`) receives the ticket details, attachments, and public comments. Requesters attempting to view another user's ticket receive HTTP `404 Not Found`.
- **FR-12 (Attachment Operations)**: Requesters can upload up to 5 active attachments (max 5 MB each, JPG/PNG/WEBP/PDF), download active files, and soft-remove attachments on owned tickets. IT Staff and Administrators can perform attachment operations on any ticket.
- **FR-13 (Requester Public Commenting)**: Requesters shall be able to view and post Public Comments on tickets they own (`GET` and `POST /api/tickets/:ticketId/comments`).
- **FR-14 (Problem Appears Resolved Signal)**: A user with role `REQUESTER` viewing an owned ticket in `OPEN`, `IN_PROGRESS`, or `WAITING_FOR_REQUESTER` status shall be able to submit a "Problem Appears Resolved" indication (`POST /api/tickets/:ticketId/appear-resolved` with body `{}`).
  - Authenticated user with non-`REQUESTER` role receives HTTP `403 Forbidden` (`FORBIDDEN`).
  - Accessing another user's ticket or nonexistent ticket returns HTTP `404 Not Found` (`TICKET_NOT_FOUND`).
  - Owning Requester attempting resolution on an ineligible status (`NEW`, `REOPENED`, `RESOLVED`, `CLOSED`, `CANCELLED`) returns HTTP `400 Bad Request` (`INVALID_STATUS_FOR_RESOLUTION`).
  - On first valid submission, sets `requesterResolved = true`, records `requesterResolvedAt = now()`, and appends an automated Public Comment (`content: "Requester indicated that the problem appears resolved."`, `authorId: requesterId`).
  - Concurrent or repeated submissions in an eligible status return HTTP `200 OK`, preserving the original timestamp and creating only one confirmation comment.
- **FR-15 (Resolution Reset Rules)**: The resolution indication resets (`requesterResolved = false`, `requesterResolvedAt = null`) if the ticket status transitions to `REOPENED` OR if the requester posts any subsequent manual public comment via `POST /api/tickets/:ticketId/comments`. The initial automated confirmation comment does not clear the flag.

### 4.3 IT Staff Queue & Operational Workflows
- **FR-16 (Ticket Queue Retrieval)**: The system shall provide an endpoint (`GET /api/staff/tickets`) for IT Staff and Administrators to retrieve the central ticket queue supporting text search (`search`), multi-parameter filtering (`status`, `categoryId`, `itPriority`, `requestedPriority`, `ownerId`), column sorting (`sortBy`, `sortOrder`), and pagination (`page`, `pageSize`).
- **FR-17 (Staff Ticket Detail Inspection)**: IT Staff and Administrators shall be able to retrieve complete details for any ticket (`GET /api/staff/tickets/:ticketId`), including requester information, ownership, requested priority, IT priority, current status, resolution intent timestamp, attachments, public comments, and confidential internal notes.
- **FR-18 (Ticket Ownership Assignment & Status Effect)**: The system shall provide an endpoint (`PATCH /api/staff/tickets/:ticketId/assign`) allowing IT Staff and Administrators to claim a ticket (assign to self), reassign the ticket to any active IT Staff or Administrator, or unassign ownership (`ownerId: null`).
  - Claiming or assigning a ticket currently in `NEW` status automatically transitions its status to `OPEN`.
  - Assigning ownership to an inactive user or a user with role `REQUESTER` is rejected with HTTP `400 Bad Request` (`INELIGIBLE_OWNER`).
- **FR-19 (IT Priority Management)**: The system shall provide an endpoint (`PATCH /api/staff/tickets/:ticketId/priority`) allowing IT Staff and Administrators to update the ticket's `itPriority` to `LOW`, `MEDIUM`, or `HIGH`, while leaving `requestedPriority` immutable.
- **FR-20 (Ticket Status Progression & No-Op Rules)**: The system shall provide an endpoint (`PATCH /api/staff/tickets/:ticketId/status`) allowing IT Staff and Administrators to transition the ticket's status according to the approved status transition matrix. Submitting the existing status returns HTTP 200 with no-op.
- **FR-21 (Eligible Staff Retrieval)**: The system shall provide an endpoint (`GET /api/staff/users`) returning all active IT Staff and Administrator accounts for populating ticket assignment dropdowns.

### 4.4 Comments and Internal Notes
- **FR-22 (Public Comments Retrieval & Submission)**: The system shall provide endpoints (`GET` and `POST /api/tickets/:ticketId/comments`) to view and append public comments on a ticket. Public comments are visible to the Ticket Requester, all IT Staff, and Administrators.
- **FR-23 (Internal Notes Retrieval & Submission)**: The system shall provide endpoints (`GET` and `POST /api/tickets/:ticketId/internal-notes`) to view and append confidential internal notes on a ticket. Internal notes are visible and writable *only* by IT Staff and Administrators.
- **FR-24 (Internal Notes Protection)**: Any request to view or post internal notes initiated by a Requester shall be strictly rejected by the backend with HTTP `404 Not Found` (hiding the existence of notes) without exposing note content or metadata.
- **FR-25 (Append-Only Integrity & Text Storage)**: Comments and internal notes are immutable and append-only. Text is validated between 1 and 2,000 characters after whitespace trimming. Text is stored and returned as validated raw strings (without HTML double-escaping) and rendered safely as plain text in the frontend to prevent injection vulnerabilities.

### 4.5 Minimalist Administrator User Management
- **FR-26 (User List Retrieval)**: The system shall provide an endpoint (`GET /api/admin/users`) for Administrators to retrieve all user accounts, supporting search by name or email (`search`) and optional role filtering (`role`).
- **FR-27 (User Provisioning)**: The system shall provide an endpoint (`POST /api/admin/users`) for Administrators to create a new user by supplying Full Name, Email, Role (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), Active status, and an Initial Password. The initial password is typed directly, validated for minimum 8 Unicode code points (`Array.from(pwd).length >= 8`) and maximum 72 UTF-8 bytes (`Buffer.byteLength(pwd, 'utf8') <= 72`) without trimming, and the backend sets `mustChangePassword = true` on creation.
- **FR-28 (User Account Modification)**: The system shall provide an endpoint (`PATCH /api/admin/users/:userId`) for Administrators to update a user's Name, Email, Role, and Active status (`isActive`).
- **FR-29 (Initial Password Reset)**: The system shall provide an endpoint (`POST /api/admin/users/:userId/reset-password`) for Administrators to set a new temporary initial password for a user. The backend hashes the password, sets `mustChangePassword = true`, and invalidates all existing active sessions for that user.
- **FR-30 (Administrator Safety Enforcement)**: The backend shall strictly reject:
  - Account creation or updates resulting in duplicate email addresses (case-insensitive check returning HTTP `409 Conflict`).
  - An Administrator deactivating their own account (HTTP `400 Bad Request`).
  - Deactivation or role demotion of the last remaining active Administrator in the system (atomic check returning HTTP `400 Bad Request`).
  - Any request to delete user records (user deletion is excluded).

---

## 5. Business Rules

### 5.1 Authentication & Security Rules
- **BR-01 (Active Accounts & CSRF Protection)**: Only active user accounts (`isActive = true`) with valid credentials may authenticate and maintain an active session. Inbound mutating requests must include header `X-Requested-With: XMLHttpRequest` and a trusted Origin.
- **BR-02 (Mandatory First-Login Password Change Gate)**: A user marked with `mustChangePassword = true` cannot access normal application screens or execute business API operations. They are restricted to `GET /api/auth/me`, `POST /api/auth/change-password`, and `POST /api/auth/logout`.
- **BR-03 (Password Length & Complexity Rules)**: Passwords (including initial passwords, resets, login, and self-changes) are never trimmed, truncated, or silently modified. All passwords must satisfy:
  - Minimum 8 Unicode code points, measured consistently using `Array.from(password).length >= 8`.
  - Maximum 72 UTF-8 bytes, measured using `Buffer.byteLength(password, 'utf8') <= 72`.
  - At least 1 uppercase letter (`A-Z`).
  - At least 1 lowercase letter (`a-z`).
  - At least 1 numeric digit (`0-9`).
  - At least 1 special character (e.g., `!@#$%^&*()_+-=[]{}|;:,.<>?`).
  - On self-change, `newPassword` must differ from `currentPassword` and match `confirmPassword`.
- **BR-04 (No Plaintext Passwords)**: Passwords must never be logged, transmitted in response payloads, or stored in plaintext. All stored passwords must be hashed using `bcrypt` (cost factor 10).
- **BR-05 (Session Lifecycle and Invalidation)**:
  - Sessions expire after 8 hours (`now >= expiresAt`).
  - Logout (`POST /api/auth/logout`) deletes the `Session` row and clears the cookie.
  - Successful password change (`POST /api/auth/change-password`) deletes previous sessions and sets a fresh session cookie, allowing immediate continuation.
  - Admin password reset (`POST /api/admin/users/:userId/reset-password`) deletes all active sessions for the target user.
  - Account deactivation (`isActive = false`) causes the next request to delete the session and return HTTP 401.
  - Role changes take effect immediately on the next request.

### 5.2 Roles & Authoritative Authorization Matrix
- **BR-06 (Single Role Enforcement)**: Each user possesses exactly one permitted role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. Multiple roles per user are prohibited in Lab 3.
- **BR-07 (Server-Side Enforcement)**: Every API endpoint enforces role and ownership permissions on the backend. Frontend navigation guards and disabled controls are user experience aids only.
- **BR-08 (Authoritative Authorization Matrix)**:

| Operation / Endpoint Group | Requester | IT Staff | Administrator | Unauthenticated |
| :--- | :---: | :---: | :---: | :---: |
| **Login / Logout / Auth Me** | Allowed | Allowed | Allowed | Login only |
| **Change Password (Initial/Self)** | Allowed | Allowed | Allowed | Denied (401) |
| **Create Ticket (`POST /api/tickets`)** | Allowed (Self) | Allowed (Self) | Allowed (Self) | Denied (401) |
| **View My Tickets (`GET /api/tickets`)** | Owned only | Owned only | Owned only | Denied (401) |
| **View Requester Ticket Detail** | Owned only (404) | Owned only (404) | Owned only (404) | Denied (401) |
| **Upload Ticket Attachment** | Owned only (404) | Any Ticket | Any Ticket | Denied (401) |
| **View Attachment Metadata** | Owned only (404) | Any Ticket | Any Ticket | Denied (401) |
| **Download Active Attachment** | Owned only (404) | Any Ticket | Any Ticket | Denied (401) |
| **Soft-Remove Attachment** | Owned only (404) | Any Ticket | Any Ticket | Denied (401) |
| **Indicate Problem Appears Resolved** | Owned only (404/400) | Denied (403) | Denied (403) | Denied (401) |
| **View Staff Ticket Queue** | Denied (403) | Allowed | Allowed (Operational)* | Denied (401) |
| **View Staff Ticket Detail** | Denied (403) | Allowed | Allowed (Operational)* | Denied (401) |
| **Claim / Reassign Ticket Owner** | Denied (403) | Allowed | Allowed (Operational)* | Denied (401) |
| **Update IT Priority** | Denied (403) | Allowed | Allowed (Operational)* | Denied (401) |
| **Update Ticket Status (Transition)**| Denied (403) | Allowed | Allowed (Operational)* | Denied (401) |
| **View Public Comments** | Owned only (404) | Any Ticket | Any Ticket | Denied (401) |
| **Post Public Comment** | Owned only (404) | Any Ticket | Any Ticket | Denied (401) |
| **View Internal Notes** | Denied (404) | Allowed | Allowed | Denied (401) |
| **Post Internal Note** | Denied (404) | Allowed | Allowed | Denied (401) |
| **List / Search Users (Admin)** | Denied (403) | Denied (403) | Allowed | Denied (401) |
| **Create User (Admin)** | Denied (403) | Denied (403) | Allowed | Denied (401) |
| **Edit User / Toggle Active (Admin)** | Denied (403) | Denied (403) | Allowed | Denied (401) |
| **Reset User Password (Admin)** | Denied (403) | Denied (403) | Allowed | Denied (401) |
| **List Eligible Staff (`/staff/users`)**| Denied (403) | Allowed | Allowed | Denied (401) |

*\*Note: Proposed Administrator Operational Access (Decision D-02) enables full read and write ticket handling for small-team escalation, while keeping the Administrator's primary navigation dedicated to User Management.*

- **BR-09 (Information-Hiding Authorization Failures)**: When a Requester attempts to access or mutate a Ticket, Attachment, Public Comment, or Internal Note belonging to another user, the backend returns HTTP `404 Not Found` rather than `403 Forbidden` to prevent leaking information about resource existence.

### 5.3 Ticket Ownership, Priority, and Status Transitions
- **BR-10 (Ticket Ownership & Historical References)**: Each Ticket has zero or one primary `ownerId`. New assignments require that the target user is an active user with role `IT_STAFF` or `ADMINISTRATOR`. Preserved historical references to deactivated or former staff are permitted on completed (`RESOLVED`, `CLOSED`) and terminal (`CANCELLED`) tickets. Tickets begin unassigned (`ownerId: null`) upon creation.
- **BR-11 (Requested Priority vs. IT Priority)**:
  - `requestedPriority` is set by the Requester at creation (`LOW`, `MEDIUM`, `HIGH`) and is immutable thereafter.
  - `itPriority` is initialized to the same value as `requestedPriority` upon creation.
  - `itPriority` may subsequently be updated only by IT Staff or Administrators.
- **BR-12 (Required Ticket Statuses)**: The system supports exactly 8 ticket statuses:
  1. `NEW`: Initial status upon creation.
  2. `OPEN`: Ticket has been acknowledged/triaged or assigned.
  3. `IN_PROGRESS`: IT Staff is actively working on resolution.
  4. `WAITING_FOR_REQUESTER`: IT Staff is waiting for additional information or action from the Requester.
  5. `RESOLVED`: Completed state; IT Staff has implemented the fix/solution.
  6. `CLOSED`: Completed state; final administrative closure of the ticket.
  7. `REOPENED`: Ticket was previously resolved or closed but requires further work.
  8. `CANCELLED`: Terminal state; ticket was withdrawn, cancelled, or identified as invalid/duplicate.
- **BR-13 (Deterministic Status Transition Matrix)**:

| Current Status | Permitted Next Statuses | Permitted Roles | Notes / Conditions |
| :--- | :--- | :--- | :--- |
| `NEW` | `OPEN`, `IN_PROGRESS`, `CANCELLED` | IT Staff, Admin | Claiming ownership automatically transitions `NEW` to `OPEN`. |
| `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | IT Staff, Admin | Active triage and investigation. |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `OPEN`, `RESOLVED`, `CANCELLED` | IT Staff, Admin | Active work in progress. |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `OPEN`, `RESOLVED`, `CANCELLED` | IT Staff, Admin | Re-engages when requester replies or provides info. |
| `RESOLVED` | `CLOSED`, `REOPENED` | IT Staff, Admin | Completed state; permitted to reopen or close. |
| `CLOSED` | `REOPENED` | IT Staff, Admin | Completed state; reopening clears inactive/ineligible owner. |
| `REOPENED` | `IN_PROGRESS`, `OPEN`, `RESOLVED`, `CANCELLED` | IT Staff, Admin | Resumes active investigation. |
| `CANCELLED` | *None (Terminal)* | IT Staff, Admin | Terminal state; no transitions away permitted. Same-status returns 200. |

- **BR-14 (Requester Resolution Intent vs. Formal Resolution)**: Requesters *cannot* directly transition a ticket to `RESOLVED` or `CLOSED`. Instead, a user with role `REQUESTER` who owns the ticket can trigger "Problem Appears Resolved" when the ticket is in `OPEN`, `IN_PROGRESS`, or `WAITING_FOR_REQUESTER`.
  - Sets `requesterResolved = true`, records `requesterResolvedAt = now()`, and appends an automated Public Comment.
  - Does not change formal status. Only IT Staff or Administrators can formally set status to `RESOLVED` or `CLOSED`.
  - Resets to `false`/`null` upon reopening or when the requester posts any subsequent manual public comment.
- **BR-15 (Assigned Owner Lifecycle During Deactivation/Demotion)**:
  - Active tickets (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`): `ownerId` automatically resets to `null` if the assigned owner is deactivated or demoted to `REQUESTER`.
  - Completed tickets (`RESOLVED`, `CLOSED`) and terminal tickets (`CANCELLED`): `ownerId` is preserved during deactivation/demotion as a historical record.
  - Reopening: Transitioning a `RESOLVED` or `CLOSED` ticket with an inactive/ineligible owner to `REOPENED` clears `ownerId` to `null`, placing it in the unassigned queue.

### 5.4 Public Comments and Internal Notes
- **BR-16 (Public Comments Visibility & Rules)**:
  - Visible to Ticket Requester, all IT Staff, and Administrators.
  - Can be authored by the Ticket Requester (on owned tickets) and any IT Staff or Administrator.
  - Content must be between 1 and 2,000 characters after whitespace trimming. Empty or whitespace-only comments are rejected.
  - Immutable and append-only (no editing, no deletion).
- **BR-17 (Internal Notes Visibility & Rules)**:
  - Visible *only* to IT Staff and Administrators.
  - Can be authored *only* by IT Staff and Administrators.
  - Content must be between 1 and 2,000 characters after whitespace trimming. Empty or whitespace-only notes are rejected.
  - Immutable and append-only (no editing, no deletion).
  - Strictly blocked and hidden from Requesters (returns HTTP 404).

### 5.5 Administrator User Management & Safety Rules
- **BR-18 (One-Role Assignment)**: An Administrator creates or edits a user with exactly one assigned role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.
- **BR-19 (Unique Email Constraint)**: User email addresses must be unique (case-insensitive comparison). Attempting to create or update a user with an existing email returns HTTP `409 Conflict` (`DUPLICATE_EMAIL`).
- **BR-20 (Initial Password & Mandatory Change)**: When an Administrator provisions a new account or triggers a password reset, they provide an initial password, and the system sets `mustChangePassword = true`.
- **BR-21 (Self-Deactivation Prevention)**: An Administrator cannot deactivate their own active user account. The API must reject this mutation with HTTP `400 Bad Request` (`CANNOT_DEACTIVATE_SELF`).
- **BR-22 (Last Active Administrator Protection)**: The system must never be left without an active Administrator. Attempting to deactivate or change the role of the only remaining active Administrator must be atomically rejected with HTTP `400 Bad Request` (`CANNOT_DEACTIVATE_LAST_ADMIN`).
- **BR-23 (Deactivation Over Deletion)**: User accounts are never deleted from PostgreSQL. Inactive accounts have `isActive = false`, preserving referential integrity for ticket ownership, attachment history, and comment/note author attribution.

---

## 6. UI Specification Summary

*(See [`./ui-spec.md`](./ui-spec.md) for full visual designs, tokens, component breakdown, and wireframes).*

1. **Authentication Shell & Header**:
   - Clean Zen Green navigation header with brand glyph, TokTickIT title, role-specific nav tabs, and a user profile menu displaying Name, Role Badge, and actions ("Change Password", "Sign Out").
   - Requester Navigation: "My Tickets", "Create Ticket".
   - IT Staff Navigation: "Ticket Queue", "Create Ticket".
   - Administrator Navigation: "User Management", "Ticket Queue".
2. **Login Screen (`/login`)**:
   - Focused card layout on quiet `--color-page-bg` with Email, Password (with toggle visibility), clear validation messages, busy state on submit, and safe generic failure feedback.
3. **Mandatory Change Password Screen (`/change-password`)**:
   - Dedicated gate screen with Current Password, New Password, Confirm Password, dynamic password requirement checklist (minimum 8 Unicode code points, maximum 72 UTF-8 bytes, uppercase, lowercase, digit, symbol, differ from current), and submission confirmation.
4. **IT Staff Ticket Queue (`/staff/queue`)**:
   - Ticket table showing Ticket Number, Created Date, Summary, Category, Requested Priority, IT Priority, Status badge, Owner, and Last Updated.
   - Filter bar with search box, Category dropdown, Status dropdown, IT Priority dropdown, and Owner filter (`All`, `Unassigned`, `Assigned to Me`).
   - Sortable table headers, pagination controls (items 1-10 of N, page size selector), and dedicated empty/no-results/loading states.
5. **IT Staff Ticket Detail (`/staff/tickets/:ticketId`)**:
   - Clear visual grouping of read-only requester context and operational staff controls.
   - Owner Claim/Reassign dropdown, IT Priority dropdown, and Status transition dropdown.
   - "Problem Appears Resolved" banner when indicated by requester with date/time.
   - Distinct tabs/sections for Public Comments, Internal Notes (styled with distinct amber background and confidentiality callout), and Attachments.
6. **Administrator User Management (`/admin/users`)**:
   - Minimalist table listing Name, Email, Role badge, Status badge (`Active` / `Inactive`), and Edit trigger.
   - Search bar (name/email) and Role filter dropdown.
   - "+ Create User" modal with Full Name, Email, Role select, Active toggle, and Initial Password input.
   - "Edit User" modal with Name, Email, Role select, Active toggle, and "Reset Initial Password" action.

---

## 7. Data Changes & Migration Strategy

### 7.1 Data Models & Relationships

```
+----------------------------------------------------------------------+
|                                 User                                 |
+----------------------------------------------------------------------+
| id                 : Int (PK, autoincrement)                         |
| seedKey            : String? (Unique, Stable Seed Identifier)        |
| email              : String (Unique, Case-Insensitive Index)         |
| passwordHash       : String                                          |
| name               : String                                          |
| role               : Role Enum (REQUESTER, IT_STAFF, ADMINISTRATOR)  |
| isActive           : Boolean (Default: true)                         |
| mustChangePassword : Boolean (Default: true)                         |
| department         : String? (Optional/Retained from Lab 2)          |
| createdAt          : DateTime (Default: now())                       |
| updatedAt          : DateTime (Updated automatically)                |
+----------------------------------------------------------------------+
         |                      |                         |
         | 1:N (Requester)      | 1:N (Owner)             | 1:N (Author)
         v                      v                         v
+------------------+  +-------------------+     +-------------------+
|      Ticket      |  |      Comment      |     |   InternalNote    |
+------------------+  +-------------------+     +-------------------+
| id               |  | id (PK)           |     | id (PK)           |
| seedKey (UQ, opt)|  | seedKey (UQ, opt) |     | seedKey (UQ, opt) |
| ticketNumber (UQ)|  | ticketId (FK)     |     | ticketId (FK)     |
| summary          |  | authorId (FK)     |     | authorId (FK)     |
| description      |  | content           |     | content           |
| requestedPriority|  | createdAt         |     | createdAt         |
| itPriority       |  +-------------------+     +-------------------+
| currentStatus    |
| requesterResolved|  +-------------------+
| reqResolvedAt    |  |      Session      |
| requesterId (FK) |  +-------------------+
| ownerId (FK, opt)|  | id (PK, UUID)     |
| categoryId (FK)  |  | token (UQ)        |
| relatedSystemId  |  | userId (FK)       |
| createdAt        |  | expiresAt         |
| updatedAt        |  | createdAt         |
+------------------+  +-------------------+
         |
         | 1:N
         v
+------------------+
|    Attachment    |
+------------------+
| id (PK)          |
| ticketId (FK)    |
| originalFileName |
| storedFileName   |
| filePath         |
| mimeType         |
| fileSizeBytes    |
| isRemoved        |
| removedAt        |
| removedById (FK) |
| removalReason    |
| uploadedById(FK) |
| createdAt        |
+------------------+
```

### 7.2 Non-Destructive Migration from Lab 2
1. **Model Evolution**:
   - Rename table `DevelopmentRequester` to `User` in Prisma and PostgreSQL.
   - Existing integer `id` values are preserved 1:1, ensuring all foreign keys on `Ticket.requesterId`, `Attachment.uploadedById`, and `Attachment.removedById` remain valid without ID remapping.
   - Add columns: `seedKey` (String, unique, nullable), `passwordHash` (populated with bcrypt hash of `Initial123!`), `role` (default `'REQUESTER'`), `mustChangePassword` (default `true`).
2. **Identification of Seed Accounts During Migration**:
   - Migration assigns canonical `seedKey` values to existing Lab 2 seed records identified by their initial seed emails:
     - `jennifer.anderson@example.com` -> `seedKey = "seed:req:1"`
     - `david.lee@example.com` -> `seedKey = "seed:req:2"`
     - `sarah.johnson@example.com` -> `seedKey = "seed:req:3"`
     - `michael.brown@example.com` -> `seedKey = "seed:req:4"`
     - `alex.taylor@example.com` -> `seedKey = "seed:req:5"`
   - Any non-seed records receive `seedKey = null`.
3. **Ticket Workflow Fields Addition**:
   - Add `ownerId` (Int, nullable, foreign key referencing `User.id`).
   - Add `itPriority` (`RequestedPriority` enum), backfilled via SQL: `UPDATE "Ticket" SET "itPriority" = "requestedPriority"`.
   - Add `requesterResolved` (Boolean, default `false`) and `requesterResolvedAt` (DateTime, nullable).
4. **Session, Comments & Notes Table Creation**:
   - Create `Session`, `Comment`, and `InternalNote` tables with `seedKey` support on comments/notes.
5. **Preservation Guarantee**:
   - Zero loss of existing Ticket, Category, RelatedSystem, Attachment records, or disk binaries.

### 7.3 Canonical Seed Identity & Idempotence Strategy
The seed script (`prisma/seed.ts`) uses canonical `seedKey` values to guarantee safe repeated runs:
- **Canonical Seed User Accounts**:
  - `seed:req:1` -> Jennifer Anderson (`jennifer.anderson@example.com`, Active, Requester)
  - `seed:req:2` -> David Lee (`david.lee@example.com`, Active, Requester)
  - `seed:req:3` -> Sarah Johnson (`sarah.johnson@example.com`, Active, Requester)
  - `seed:req:4` -> Michael Brown (`michael.brown@example.com`, Active, Requester)
  - `seed:req:5` -> Alex Taylor (`alex.taylor@example.com`, Inactive, Requester)
  - `seed:staff:1` -> Mike Brown (`staff.mike@toktickit.com`, Active, IT Staff)
  - `seed:staff:2` -> Sarah Miller (`staff.sarah@toktickit.com`, Active, IT Staff)
  - `seed:staff:3` -> David Chen (`staff.david@toktickit.com`, Active, IT Staff)
  - `seed:staff:4` -> Kevin Patel (`staff.kevin@toktickit.com`, Inactive, IT Staff)
  - `seed:admin:1` -> System Admin (`admin@toktickit.com`, Active, Administrator)
- **Seed Invariance Rules**:
  - If a record with the `seedKey` already exists, the seed **never** overwrites `passwordHash`, `mustChangePassword`, `name`, `email`, `role`, `isActive`, ticket status, owner, comments, or notes.
  - If an account exists with the seed email (even if `seedKey` is unset), the seed links the `seedKey` without altering credentials or fields, guaranteeing that migration followed by seed never duplicates accounts.
  - Sample tickets, comments, and internal notes use distinct canonical `seedKey` identifiers (e.g. `seed:ticket:1`, `seed:comment:1-1`, `seed:note:1-1`) to prevent duplicate records or status overwrites.
  - Documented default initial password for all newly seeded accounts: `Initial123!`.

---

## 8. REST API Contract Summary

*(See [`./api-spec.md`](./api-spec.md) for full JSON request/response payloads, headers, error structures, and validation rules).*

| Method | Endpoint Path | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate with email & password; set session cookie | Public |
| `POST` | `/api/auth/logout` | Invalidate session in DB & clear cookie | Authenticated |
| `GET` | `/api/auth/me` | Retrieve current authenticated user profile & role | Authenticated |
| `POST` | `/api/auth/change-password` | Mandatory/self password change | Authenticated |
| `POST` | `/api/tickets` | Create a new ticket (requester ownership from session) | All Authenticated |
| `GET` | `/api/tickets` | List owned tickets with search, filter, sort, pagination | All Authenticated (Self) |
| `GET` | `/api/tickets/:ticketId` | Retrieve owned ticket detail | Owner only (404 for non-owners) |
| `POST` | `/api/tickets/:ticketId/appear-resolved` | Signal problem appears resolved | Owner with role Requester only |
| `GET` | `/api/staff/tickets` | Central IT Staff ticket queue with search, filter, sort, pagination | IT Staff, Admin |
| `GET` | `/api/staff/tickets/:ticketId` | Complete ticket detail for operational handling | IT Staff, Admin |
| `PATCH`| `/api/staff/tickets/:ticketId/assign` | Claim, reassign, or unassign ticket ownership | IT Staff, Admin |
| `PATCH`| `/api/staff/tickets/:ticketId/priority` | Update internal IT Priority | IT Staff, Admin |
| `PATCH`| `/api/staff/tickets/:ticketId/status` | Advance ticket status along permitted workflow | IT Staff, Admin |
| `GET` | `/api/staff/users` | List eligible IT Staff and Administrators for ticket assignment | IT Staff, Admin |
| `GET` | `/api/tickets/:ticketId/comments` | Retrieve public comments thread | Owner, Staff, Admin |
| `POST` | `/api/tickets/:ticketId/comments` | Append a public comment | Owner, Staff, Admin |
| `GET` | `/api/tickets/:ticketId/internal-notes`| Retrieve confidential internal notes | IT Staff, Admin (404 for Req) |
| `POST` | `/api/tickets/:ticketId/internal-notes`| Append a confidential internal note | IT Staff, Admin (404 for Req) |
| `GET` | `/api/admin/users` | List user accounts with search and role filter | Administrator |
| `POST` | `/api/admin/users` | Provision a new user account | Administrator |
| `PATCH`| `/api/admin/users/:userId` | Update user name, email, role, and active status | Administrator |
| `POST` | `/api/admin/users/:userId/reset-password`| Issue a new initial temporary password | Administrator |
| `POST` | `/api/tickets/:ticketId/attachments` | Upload attachment (owned ticket or staff) | Owner, Staff, Admin |
| `GET` | `/api/attachments/:attachmentId` | Retrieve attachment metadata | Owner, Staff, Admin |
| `GET` | `/api/attachments/:attachmentId/download` | Secure stream download of active attachment | Owner, Staff, Admin |
| `PATCH`| `/api/attachments/:attachmentId/remove` | Soft-remove attachment with mandatory reason | Owner, Staff, Admin |
| `GET` | `/api/categories` | Retrieve public categories | Public / Authenticated |
| `GET` | `/api/related-systems` | Retrieve public active related systems | Public / Authenticated |

---

## 9. Acceptance Criteria

- **AC-01 (Valid Authentication)**: Given an active user with valid email and password, when `POST /api/auth/login` is submitted with valid CSRF header, then the backend returns HTTP 200 with user profile and sets an HTTP-only authenticated session cookie.
- **AC-02 (Invalid Credentials & Inactive Accounts)**: Given invalid credentials or an inactive user (`isActive = false`), when login is attempted, then the backend returns HTTP 401 with a generic error message and establishes no session.
- **AC-03 (Login Rate Limiting)**: Given an email address with 5 consecutive failed login attempts, when a 6th attempt is made within 15 minutes, then the backend returns HTTP 429 `TOO_MANY_REQUESTS`.
- **AC-04 (Mandatory First-Login Password Change Gate)**: Given a user with `mustChangePassword = true`, when they log in, then they are redirected to `/change-password`, and attempts to access normal application endpoints return HTTP 403 Forbidden (`MUST_CHANGE_PASSWORD`) until a valid new password is saved via `POST /api/auth/change-password`.
- **AC-05 (Password Complexity & Boundary Enforcement)**: Given a new password failing complexity rules (length < 8 Unicode code points via `Array.from(pwd).length`, length > 72 UTF-8 bytes via `Buffer.byteLength(pwd, 'utf8')`, missing upper/lower/number/symbol, or matching current password) or mismatched confirmation, when change password is submitted, then the operation is rejected with HTTP 400 validation error without password trimming or truncation.
- **AC-06 (Current User Profile Retrieval & Expiration)**: Given an authenticated session, when `GET /api/auth/me` is called, then the backend returns the authenticated user's ID, name, email, role, and `mustChangePassword` status. If `now >= expiresAt` (including exact 8-hour boundary), it returns HTTP 401 `UNAUTHENTICATED`.
- **AC-07 (Logout Invalidation & Cookie Replay Prevention)**: Given an active session, when `POST /api/auth/logout` is called, then the database session record is deleted, the cookie is cleared, and replaying the old cookie on subsequent requests returns HTTP 401.
- **AC-08 (Server-Enforced CSRF Protection)**: Given a state-modifying request (`POST`, `PATCH`, `PUT`, `DELETE`) without the `X-Requested-With: XMLHttpRequest` header or with an untrusted Origin, then the backend rejects the request with HTTP 403 `CSRF_PROTECTION_FAILED` prior to authentication checks.
- **AC-09 (Requester Identity & Ownership Enforcement)**: Given an authenticated user, when creating tickets via `POST /api/tickets`, then ownership is strictly derived from the session ID, and any client-supplied requester ID is ignored.
- **AC-10 (My Tickets Scoping)**: Given an authenticated user, when calling `GET /api/tickets`, then the backend returns only tickets submitted by that user.
- **AC-11 (Requester Cross-Resource Isolation)**: Given an authenticated Requester, when requesting another user's Ticket or Attachment, then the backend returns HTTP 404 Not Found without leaking resource existence.
- **AC-12 (Public Comments View and Append)**: Given an authenticated user (Ticket Owner, Staff, or Admin), when viewing or posting a public comment, then the text is stored and returned without HTML double-escaping and rendered safely as plain text in the UI.
- **AC-13 (Requester Problem Appears Resolved Signal)**: Given an authenticated user with role `REQUESTER` viewing an active owned ticket (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`) and submitting `POST /api/tickets/:ticketId/appear-resolved` with `{}`, then `requesterResolved = true` is set, `requesterResolvedAt` is recorded, and an automated public comment is created.
- **AC-14 (Resolution Signal Idempotency)**: Given a ticket with `requesterResolved = true`, when repeated or concurrent `appear-resolved` requests are submitted in an eligible status, then the backend returns HTTP 200 OK preserving the original `requesterResolvedAt` timestamp and creating only one confirmation comment.
- **AC-15 (Resolution Reset on Reopen or Manual Comment)**: Given a ticket with `requesterResolved = true`, when the ticket status transitions to `REOPENED` or when the requester posts a subsequent manual public comment, then `requesterResolved` resets to `false` and `requesterResolvedAt` resets to `null`.
- **AC-16 (Resolution Action Errors & Status Enforcement)**: Given a resolution indication request:
  - Missing authentication returns HTTP 401 `UNAUTHENTICATED`.
  - Non-`REQUESTER` role returns HTTP 403 `FORBIDDEN`.
  - Non-owner or nonexistent ticket returns HTTP 404 `TICKET_NOT_FOUND`.
  - Owning Requester on an ineligible status (`NEW`, `REOPENED`, `RESOLVED`, `CLOSED`, `CANCELLED`) returns HTTP 400 `INVALID_STATUS_FOR_RESOLUTION`.
- **AC-17 (Internal Notes Protection)**: Given an authenticated Requester, when attempting to call `GET` or `POST /api/tickets/:ticketId/internal-notes`, then the request is rejected with HTTP 404 Not Found and no note data is exposed.
- **AC-18 (Staff Internal Notes View and Append)**: Given an authenticated IT Staff or Admin, when viewing a ticket, then they can view all internal notes and append a new internal note that is immediately persisted.
- **AC-19 (IT Staff Ticket Queue Retrieval)**: Given an authenticated IT Staff or Admin, when requesting `/api/staff/tickets`, then the backend returns paginated tickets matching search, category, status, priority, and owner filters with accurate total item counts and stable tie-breaking (`id DESC`).
- **AC-20 (Ticket Ownership Claim & Status Advancement)**: Given an authenticated IT Staff, when claiming an unassigned ticket in status `NEW`, then `PATCH /api/staff/tickets/:ticketId/assign` updates `ownerId` and automatically advances status to `OPEN`.
- **AC-21 (Ineligible Assignment Rejection)**: Given an attempt to assign a ticket to an inactive user or a user with role `REQUESTER`, then the backend rejects the request with HTTP 400 Bad Request (`INELIGIBLE_OWNER`).
- **AC-22 (Preserved Historical Owner References & Orphaned Ticket Cleanup)**: Given an assigned staff member who is deactivated or demoted to Requester, then active tickets have `ownerId` reset to `null`, completed/terminal tickets retain the historical `ownerId`, and reopening a ticket clears an ineligible owner.
- **AC-23 (IT Priority Modification)**: Given an authenticated IT Staff, when updating `itPriority` to `HIGH`, then `PATCH /api/staff/tickets/:ticketId/priority` updates `itPriority` while leaving `requestedPriority` unchanged.
- **AC-24 (Permitted Status Transitions & No-Op)**: Given an authenticated IT Staff, when updating ticket status along a valid transition path or submitting the current status (no-op), then `PATCH /api/staff/tickets/:ticketId/status` succeeds; invalid transitions return HTTP 400 `INVALID_STATUS_TRANSITION`.
- **AC-25 (Admin User Management Retrieval & Filtering)**: Given an authenticated Administrator, when requesting `/api/admin/users`, then the system returns users matching search queries and role filters.
- **AC-26 (Admin User Provisioning & Initial Password)**: Given an authenticated Administrator, when creating a new user with valid details, then the user is persisted, `mustChangePassword` is set to `true`, and duplicate email attempts (case-insensitive) return HTTP 409 Conflict.
- **AC-27 (Admin User Modification & Duplicate Check)**: Given an authenticated Administrator, when editing a user's name, email, role, or active status, then changes are persisted safely; email collisions return HTTP 409 Conflict.
- **AC-28 (Admin Initial Password Reset & Session Revocation)**: Given an authenticated Administrator, when resetting a user's password, then the new temporary password is saved as a hash, `mustChangePassword` is set to `true`, and all active sessions for that user are revoked.
- **AC-29 (Admin Safety Constraints)**: Given an authenticated Administrator, when attempting to deactivate self or deactivate/demote the last active Administrator, then the backend rejects the request with HTTP 400 Bad Request (`CANNOT_DEACTIVATE_SELF` / `CANNOT_DEACTIVATE_LAST_ADMIN`).
- **AC-30 (Forbidden Access by Role & Immediate Enforcement)**: Given an authenticated user attempting to access endpoints reserved for higher roles or when a user's role is demoted during an active session, then subsequent restricted requests immediately return HTTP 403 Forbidden.
- **AC-31 (Migration Data Preservation)**: Given existing Lab 2 data, when the migration runs, then all DevelopmentRequesters become Users with preserved IDs, tickets, attachments, timestamps, and files.
- **AC-32 (Canonical Seed Invariance)**: Given an existing database where user emails or temporary passwords were modified, when the seed script is rerun, then existing account modifications and ticket states are preserved without duplicate records.

---

## 10. Definition of Done (DoD) for Lab 3

A task, feature branch, or the final increment is considered **Done** only when all of the following criteria are satisfied:

1. **Specification Compliance**: All requirements (FR-01 to FR-30), business rules (BR-01 to BR-23), and API contracts are implemented without unresolved placeholders.
2. **Authentication & RBAC**:
   - `x-requester-id` header and requester selector are removed.
   - Real bcrypt password hashing (minimum 8 Unicode code points, maximum 72 UTF-8 bytes) and database-backed cookie sessions are active.
   - CSRF protection via `X-Requested-With: XMLHttpRequest` and Origin verification is strictly enforced on all mutating endpoints.
   - Initial password change requirement is enforced strictly at login and on protected APIs.
   - Role permissions and information-hiding 404 rules are enforced server-side.
3. **Data Migration & Seed**:
   - Non-destructive Prisma migration successfully transfers Lab 2 data to the User model using canonical `seedKey` values.
   - Database seed script executes idempotently without overwriting updated passwords, edited emails, or deactivated accounts.
4. **All Lab 3 Features Operational in UI**:
   - Login, Change Password, and Logout screens work smoothly.
   - Requester My Tickets, Create Ticket, Detail, Attachments, Comments, and "Problem Appears Resolved" work with authenticated identity.
   - IT Staff Queue with search, filter, sort, pagination, and Detail view with ownership claim/reassignment, IT priority, status updates, comments, and internal notes are fully interactive.
   - Administrator User Management supports user list, search/filter, create, edit, reset password, and safety checks.
5. **Zen Green UI & Accessibility**:
   - UI matches Zen Green design tokens and responsive breakpoints (Desktop, Tablet, Mobile) with strictly 0px horizontal page overflow.
   - Keyboard navigation, visible focus rings, and ARIA attributes satisfy WCAG 2.1 AA.
6. **Automated Test Suite & Traceability**:
   - All planned unit, API integration, UI component, and Playwright E2E tests pass with 100% green status on the final branch.
7. **No Hardcoded Secrets**:
   - No plaintext passwords, secrets, or `.env` values committed to the repository.

---

## 11. Concrete Implementation Decisions and Proposals

| Decision ID | Area | Selected Decision | Rationale |
| :--- | :--- | :--- | :--- |
| **D-01** | Authentication Stack | `bcrypt` (10 rounds, max 72 UTF-8 bytes) + PostgreSQL `Session` table + `HttpOnly, SameSite=Lax` cookie (`toktickit_session`) + `X-Requested-With: XMLHttpRequest` CSRF enforcement. | Prevents client script token theft (XSS), prevents cross-site request forgery, eliminates bcrypt truncation bugs, and enables instant server-side revocation on logout/password change/deactivation. |
| **D-02** | Administrator Role Scope | *[Proposal Pending Review]* Administrator primary navigation is User Management; Administrator also has full operational ticket access (Queue, Detail, Claim, Priority, Status, Notes) to support small-team operational escalation. | Reconciles the handout's separation of duties with permitted ownership/priority modification rights without confusing terminology. |
| **D-03** | Password Change Continuity | On successful password change (`POST /api/auth/change-password`), old sessions are deleted, a new session cookie is issued, and the user enters the application immediately. | Eliminates unnecessary double-login friction while maintaining cryptographic session invalidation. |
| **D-04** | "Problem Appears Resolved" | Sets `requesterResolved = true`, records `requesterResolvedAt`, and appends an automated public comment. Does not change formal status. Cleared if ticket is reopened or if requester posts any manual public comment. | Empowers requesters to confirm satisfaction while keeping formal resolution in IT Staff purview with deterministic clearing. |
| **D-05** | Claiming a `NEW` Ticket | Self-claiming an unassigned ticket in status `NEW` automatically advances status to `OPEN`. | Streamlines triage workflow and prevents tickets from lingering in `NEW` once assigned to a technician. |
| **D-06** | Historical Owner References | Completed (`RESOLVED`, `CLOSED`) and terminal (`CANCELLED`) tickets preserve their historical `ownerId` when staff are deactivated; active tickets reset `ownerId = null`; reopening clears ineligible owners. | Preserves accurate historical accountability while keeping active queues actionable. |
| **D-07** | Canonical Seed Identity | Uses canonical `seedKey` on User, Ticket, Comment, and Note records to prevent seed reruns from overwriting modified emails, passwords, active flags, or operational changes. | Guarantees test stability and idempotent development seeding. |
