# Lab 3 REST API Specification

> **Document Status**: Draft — Pending Review  
> **Target Branch**: `docs/lab3-engineering-contract`  
> **Course Stack**: Express + TypeScript + Prisma + PostgreSQL

---

## 1. Base Conventions

### 1.1 Base Path
All endpoints are served under the `/api` prefix.
```
/api/<resource>
```

### 1.2 JSON Property Naming & Types
- All JSON request and response fields use **camelCase**.
- Primary and foreign entity keys (`id`, `ticketId`, `requesterId`, `ownerId`, `authorId`, `categoryId`, `relatedSystemId`) are represented as integer numbers.
- Timestamps are returned as ISO 8601 UTC strings (e.g. `"2026-05-12T09:14:00.000Z"`).
- `ticketNumber` is formatted as `"TKT-YYYY-NNNNNN"`.

### 1.3 Whitespace Trimming & Password Boundary Rules
- User-entered text fields (`name`, `email`, `summary`, `description`, `content`, `removalReason`, `search`) are automatically trimmed of leading and trailing whitespace on the server before validation and persistence.
- **Strict Password Rule**: Password fields (`password`, `currentPassword`, `newPassword`, `confirmPassword`, `initialPassword`) are **never trimmed, truncated, or altered**.
- **Password Length Rule**: Passwords must contain a **minimum of 8 Unicode code points** (measured consistently using `Array.from(password).length >= 8`) and a **maximum of 72 UTF-8 bytes** (`Buffer.byteLength(password, 'utf8') <= 72`). Oversized input is strictly rejected with HTTP `400 Bad Request` rather than silently truncated.

### 1.4 Authentication, Session Transport & CSRF Policy
- **Session Transport**: Authentication is governed by an **HTTP-only, SameSite=Lax cookie** named `toktickit_session`.
  - `HttpOnly: true` (inaccessible to client JavaScript).
  - `SameSite: "lax"` (first-party navigation defense).
  - `Path: "/"`
  - `Secure: false` in local development (`NODE_ENV !== "production"`).
  - `Max-Age: 28800` (8 hours). Session expires when `now >= expiresAt`.
- **Server-Enforced CSRF Policy**:
  - **Custom Header Requirement**: The header `X-Requested-With: XMLHttpRequest` is **strictly required on ALL state-modifying requests** (`POST`, `PATCH`, `PUT`, `DELETE`), including login, logout, password change, and multipart uploads.
  - **Origin Allowlist**: Inbound `Origin` headers must match `http://localhost:5173` (development frontend) or `http://localhost:5174` (test/E2E frontend). Requests with untrusted or `null` origins are rejected immediately. (Non-browser clients / integration tests omitting the `Origin` header are permitted provided the `X-Requested-With: XMLHttpRequest` header is present).
  - **Error Precedence**: CSRF validation executes before authentication or route logic. Violations immediately return HTTP `403 Forbidden` with error code `CSRF_PROTECTION_FAILED`.
  - **CORS Configuration**: Server uses credentialed CORS: `cors({ origin: ["http://localhost:5173", "http://localhost:5174"], credentials: true })`.
  - **Frontend Transport**: Client fetch requests use `credentials: "include"` and pass `X-Requested-With: XMLHttpRequest`. Multipart form uploads (`FormData`) attach the header while letting the browser configure the `multipart/form-data` boundary.
- **Decommissioning**: The Lab 2 `x-requester-id` header is completely removed. Authenticated endpoints read user identity exclusively from the validated session.

### 1.5 Text Storage and Safe Plain-Text Representation
- Comments and internal notes are stored and returned as validated raw strings without HTML double-escaping. The client UI renders them safely as plain text nodes (avoiding `dangerouslySetInnerHTML`).

### 1.6 Standard Error Response Schema
All error responses return a standardized JSON structure:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data.",
    "fields": {
      "email": "A valid email address is required."
    }
  }
}
```

---

## 2. Standard Error Codes Matrix

| HTTP Status | Error Code | Description / Usage |
| :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Malformed JSON, missing mandatory fields, boundary violations. |
| `400 Bad Request` | `INVALID_STATUS_TRANSITION` | Attempted ticket status change not permitted by the transition matrix. |
| `400 Bad Request` | `INVALID_STATUS_FOR_RESOLUTION` | Requester resolution indication attempted on ineligible status (`NEW`, `REOPENED`, `RESOLVED`, `CLOSED`, `CANCELLED`). |
| `400 Bad Request` | `INELIGIBLE_OWNER` | Attempted ticket assignment to an inactive user or user with role `REQUESTER`. |
| `400 Bad Request` | `CANNOT_DEACTIVATE_SELF` | Administrator attempting to deactivate their own active account. |
| `400 Bad Request` | `CANNOT_DEACTIVATE_LAST_ADMIN`| Attempt to deactivate or change the role of the only active Administrator. |
| `400 Bad Request` | `PASSWORD_COMPLEXITY_FAILED` | Password does not meet required complexity rules ($\ge 8$ code points, $\le 72$ UTF-8 bytes, upper, lower, digit, symbol). |
| `400 Bad Request` | `PASSWORD_SAME_AS_CURRENT` | New password matches the current password during password change. |
| `400 Bad Request` | `INVALID_CURRENT_PASSWORD` | Current password verification failed during password change. |
| `401 Unauthorized` | `UNAUTHENTICATED` | Missing, expired (`now >= expiresAt`), or invalid session cookie on a protected endpoint. |
| `401 Unauthorized` | `INVALID_CREDENTIALS` | Login failed due to wrong email/password or inactive account (`isActive = false`). |
| `403 Forbidden` | `CSRF_PROTECTION_FAILED` | Missing or invalid `X-Requested-With` header or untrusted Origin on mutating request. |
| `403 Forbidden` | `FORBIDDEN` | Authenticated user lacks the required role for the requested operation. |
| `403 Forbidden` | `MUST_CHANGE_PASSWORD` | User has `mustChangePassword = true` and attempted normal business API. |
| `404 Not Found` | `TICKET_NOT_FOUND` | Ticket ID does not exist or belongs to another user (information hiding). |
| `404 Not Found` | `ATTACHMENT_NOT_FOUND` | Attachment does not exist, was removed, or belongs to another user's ticket. |
| `404 Not Found` | `USER_NOT_FOUND` | User ID not found in Administrator user management. |
| `409 Conflict` | `DUPLICATE_EMAIL` | Account creation or update with an email that is already registered (case-insensitive). |
| `409 Conflict` | `ATTACHMENT_LIMIT_REACHED` | Active attachments count on ticket already at maximum (5/5). |
| `409 Conflict` | `ALREADY_REMOVED` | Attachment has already been soft-removed. |
| `413 Payload Too Large`| `FILE_TOO_LARGE` | Attachment upload exceeds 5 MB. |
| `415 Unsupported Media`| `UNSUPPORTED_MEDIA_TYPE` | Attachment MIME type not in allowed list (JPG, PNG, WEBP, PDF). |
| `429 Too Many Requests`| `TOO_MANY_REQUESTS` | Exceeded 5 consecutive failed login attempts within 15 minutes. |
| `500 Server Error` | `INTERNAL_ERROR` | Unexpected server exception. |

---

## 3. Authentication Endpoints

### 3.1 `POST /api/auth/login`
Authenticates a user with email and password, establishing a session record in PostgreSQL and setting the session cookie.

- **Access**: Public
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "email": "jennifer.anderson@example.com",
  "password": "Password123!"
}
```
- **Responses**:
  - `200 OK`: Sets `toktickit_session` cookie; returns user profile:
    ```json
    {
      "user": {
        "id": 1,
        "name": "Jennifer Anderson",
        "email": "jennifer.anderson@example.com",
        "role": "REQUESTER",
        "isActive": true,
        "mustChangePassword": false
      }
    }
    ```
  - `401 Unauthorized`: Credentials invalid or account inactive:
    ```json
    {
      "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password. Please try again."
      }
    }
    ```
  - `403 Forbidden`: Missing `X-Requested-With` header (`CSRF_PROTECTION_FAILED`).
  - `429 Too Many Requests`: Rate limit exceeded (`TOO_MANY_REQUESTS`).

---

### 3.2 `POST /api/auth/logout`
Deletes the active `Session` row from PostgreSQL and clears the session cookie.

- **Access**: Authenticated
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**: None
- **Responses**:
  - `200 OK`: Clears cookie; returns confirmation:
    ```json
    {
      "message": "Logged out successfully."
    }
    ```
  - `401 Unauthorized`: Session missing or expired.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED`.

---

### 3.3 `GET /api/auth/me`
Retrieves profile and permission state for the currently authenticated session.

- **Access**: Authenticated
- **Responses**:
  - `200 OK`:
    ```json
    {
      "user": {
        "id": 1,
        "name": "Jennifer Anderson",
        "email": "jennifer.anderson@example.com",
        "role": "REQUESTER",
        "isActive": true,
        "mustChangePassword": false
      }
    }
    ```
  - `401 Unauthorized`: Unauthenticated or expired (`now >= expiresAt`) session.

---

### 3.4 `POST /api/auth/change-password`
Changes the authenticated user's password. Inactivates previous sessions, generates a replacement session cookie, and clears `mustChangePassword`.

- **Access**: Authenticated (including sessions constrained by `mustChangePassword = true`).
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "currentPassword": "Initial123!",
  "newPassword": "SecurePassword2026!",
  "confirmPassword": "SecurePassword2026!"
}
```
- **Responses**:
  - `200 OK`: Sets new `toktickit_session` cookie; returns updated user:
    ```json
    {
      "message": "Password changed successfully.",
      "user": {
        "id": 1,
        "name": "Jennifer Anderson",
        "email": "jennifer.anderson@example.com",
        "role": "REQUESTER",
        "isActive": true,
        "mustChangePassword": false
      }
    }
    ```
  - `400 Bad Request`: `PASSWORD_COMPLEXITY_FAILED`, `PASSWORD_SAME_AS_CURRENT`, or `INVALID_CURRENT_PASSWORD`.
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED`.

---

## 4. Requester Ticket & Attachment Endpoints

### 4.1 `POST /api/tickets`
Creates a new support ticket. Authenticated user ID is automatically assigned as `requesterId`.

- **Access**: Authenticated (`Requester`, `IT Staff`, `Administrator`)
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "categoryId": 2,
  "relatedSystemId": 1,
  "requestedPriority": "MEDIUM",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle."
}
```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "Laptop battery drains quickly",
      "description": "My laptop battery is draining much faster than usual even when idle.",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "requesterResolved": false,
      "requesterResolvedAt": null,
      "requesterId": 1,
      "ownerId": null,
      "categoryId": 2,
      "relatedSystemId": 1,
      "createdAt": "2026-05-12T09:14:00.000Z",
      "updatedAt": "2026-05-12T09:14:00.000Z"
    }
    ```
  - `400 Bad Request`: Validation error.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED` or `MUST_CHANGE_PASSWORD`.

---

### 4.2 `GET /api/tickets`
Retrieves tickets submitted by the authenticated user ("My Tickets").

- **Access**: Authenticated (Self)
- **Query Parameters**:
  - `search` (string, optional)
  - `categoryId` (number, optional)
  - `requestedPriority` (`LOW` | `MEDIUM` | `HIGH`, optional)
  - `status` (`NEW` | `OPEN` | `IN_PROGRESS` | `WAITING_FOR_REQUESTER` | `RESOLVED` | `CLOSED` | `REOPENED` | `CANCELLED`, optional)
  - `sortBy` (`createdAt` | `ticketNumber` | `updatedAt`, default `createdAt`)
  - `sortOrder` (`asc` | `desc`, default `desc`)
  - `page` (number, default 1)
  - `pageSize` (`10` | `25` | `50`, default 10)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "items": [
        {
          "id": 101,
          "ticketNumber": "TKT-2026-000101",
          "summary": "Laptop battery drains quickly",
          "requestedPriority": "MEDIUM",
          "itPriority": "MEDIUM",
          "currentStatus": "NEW",
          "requesterResolved": false,
          "requesterResolvedAt": null,
          "categoryId": 2,
          "categoryName": "Hardware",
          "relatedSystemId": 1,
          "relatedSystemName": "Corporate Laptop",
          "createdAt": "2026-05-12T09:14:00.000Z",
          "updatedAt": "2026-05-12T09:14:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 10,
        "totalItems": 1,
        "totalPages": 1
      }
    }
    ```

---

### 4.3 `GET /api/tickets/:ticketId`
Retrieves detailed information for an owned ticket. (Does NOT expose confidential internal notes).

- **Access**: Ticket Owner only (Returns 404 for non-owner Requesters).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "Laptop battery drains quickly",
      "description": "My laptop battery is draining much faster than usual even when idle.",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "requesterResolved": false,
      "requesterResolvedAt": null,
      "requesterId": 1,
      "requesterName": "Jennifer Anderson",
      "categoryId": 2,
      "categoryName": "Hardware",
      "relatedSystemId": 1,
      "relatedSystemName": "Corporate Laptop",
      "createdAt": "2026-05-12T09:14:00.000Z",
      "updatedAt": "2026-05-12T09:14:00.000Z",
      "attachments": [
        {
          "id": 5,
          "originalFileName": "battery_report.png",
          "fileSizeBytes": 204800,
          "mimeType": "image/png",
          "isRemoved": false,
          "removedAt": null,
          "removalReason": null,
          "uploadedById": 1,
          "createdAt": "2026-05-12T09:14:00.000Z"
        }
      ],
      "comments": [
        {
          "id": 1,
          "ticketId": 101,
          "authorId": 1,
          "authorName": "Jennifer Anderson",
          "authorRole": "REQUESTER",
          "content": "Added the screenshot.",
          "createdAt": "2026-05-12T09:15:00.000Z"
        }
      ]
    }
    ```
  - `404 Not Found`: Ticket not found or not owned.

---

### 4.4 `POST /api/tickets/:ticketId/appear-resolved`
Allows a Ticket Owner with role `REQUESTER` to signal that their reported issue appears resolved.

- **Access**: Ticket Owner with role `REQUESTER` only
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**: `{}`
- **Behavior**:
  - If unauthenticated, returns HTTP `401 Unauthorized` (`UNAUTHENTICATED`).
  - If user role is not `REQUESTER`, returns HTTP `403 Forbidden` (`FORBIDDEN`).
  - If ticket is not owned by the requester or does not exist, returns HTTP `404 Not Found` (`TICKET_NOT_FOUND`).
  - If ticket status is NOT in `["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER"]` (e.g. `NEW`, `REOPENED`, `RESOLVED`, `CLOSED`, `CANCELLED`), returns HTTP `400 Bad Request` (`INVALID_STATUS_FOR_RESOLUTION`).
  - First valid submission sets `requesterResolved = true`, `requesterResolvedAt = now()`, and appends an automated public comment.
  - Concurrent or repeated requests on eligible status return HTTP `200 OK` preserving original timestamp and creating only one confirmation comment.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "requesterResolved": true,
      "requesterResolvedAt": "2026-05-13T09:20:00.000Z",
      "currentStatus": "IN_PROGRESS",
      "message": "Resolution intent recorded."
    }
    ```
  - `400 Bad Request`: `INVALID_STATUS_FOR_RESOLUTION`.
  - `401 Unauthorized`: `UNAUTHENTICATED`.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED` or `FORBIDDEN` (non-Requester role).
  - `404 Not Found`: `TICKET_NOT_FOUND`.

---

### 4.5 Attachment Endpoints
- `POST /api/tickets/:ticketId/attachments` (multipart/form-data with `file`, header `X-Requested-With: XMLHttpRequest`) -> `201 Created`
- `GET /api/attachments/:attachmentId` -> `200 OK` (metadata)
- `GET /api/attachments/:attachmentId/download` -> `200 OK` (binary stream)
- `PATCH /api/attachments/:attachmentId/remove` (body: `{ "removalReason": "Obsolete log" }`, header `X-Requested-With: XMLHttpRequest`) -> `200 OK`

---

## 5. IT Staff Ticket Queue & Management Endpoints

### 5.1 `GET /api/staff/tickets`
Central Ticket Queue search, filtering, and pagination for IT Staff and Administrators.

- **Access**: IT Staff, Administrator
- **Query Parameters**:
  - `search` (string, optional - searches ticket number, summary, requester name)
  - `categoryId` (number, optional)
  - `status` (`NEW` | `OPEN` | `IN_PROGRESS` | `WAITING_FOR_REQUESTER` | `RESOLVED` | `CLOSED` | `REOPENED` | `CANCELLED`, optional)
  - `itPriority` (`LOW` | `MEDIUM` | `HIGH`, optional)
  - `requestedPriority` (`LOW` | `MEDIUM` | `HIGH`, optional)
  - `ownerId` (number | `"unassigned"` | `"me"`, optional)
  - `sortBy` (`createdAt` | `ticketNumber` | `updatedAt` | `itPriority` | `currentStatus`, default `createdAt`)
  - `sortOrder` (`asc` | `desc`, default `desc`)
  - `page` (number, default 1)
  - `pageSize` (`10` | `25` | `50`, default 10)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "items": [
        {
          "id": 101,
          "ticketNumber": "TKT-2026-000101",
          "summary": "Laptop battery drains quickly",
          "requesterId": 1,
          "requesterName": "Jennifer Anderson",
          "categoryId": 2,
          "categoryName": "Hardware",
          "requestedPriority": "MEDIUM",
          "itPriority": "HIGH",
          "currentStatus": "IN_PROGRESS",
          "ownerId": 2,
          "ownerName": "Michael Brown",
          "requesterResolved": true,
          "requesterResolvedAt": "2026-05-13T09:20:00.000Z",
          "createdAt": "2026-05-12T09:14:00.000Z",
          "updatedAt": "2026-05-13T10:30:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 10,
        "totalItems": 87,
        "totalPages": 9
      }
    }
    ```
  - `403 Forbidden`: User role is `REQUESTER`.

---

### 5.2 `GET /api/staff/tickets/:ticketId`
Retrieves full operational ticket context for IT Staff, including confidential internal notes.

- **Access**: IT Staff, Administrator
- **Responses**:
  - `200 OK`:
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "Laptop battery drains quickly",
      "description": "My laptop battery is draining much faster than usual even when idle.",
      "requestedPriority": "MEDIUM",
      "itPriority": "HIGH",
      "currentStatus": "IN_PROGRESS",
      "requesterResolved": true,
      "requesterResolvedAt": "2026-05-13T09:20:00.000Z",
      "requesterId": 1,
      "requesterName": "Jennifer Anderson",
      "requesterEmail": "jennifer.anderson@example.com",
      "ownerId": 2,
      "ownerName": "Michael Brown",
      "categoryId": 2,
      "categoryName": "Hardware",
      "relatedSystemId": 1,
      "relatedSystemName": "Corporate Laptop",
      "createdAt": "2026-05-12T09:14:00.000Z",
      "updatedAt": "2026-05-13T10:30:00.000Z",
      "attachments": [
        {
          "id": 5,
          "originalFileName": "battery_report.png",
          "fileSizeBytes": 204800,
          "mimeType": "image/png",
          "isRemoved": false,
          "removedAt": null,
          "removalReason": null,
          "uploadedById": 1,
          "createdAt": "2026-05-12T09:14:00.000Z"
        }
      ],
      "comments": [
        {
          "id": 1,
          "ticketId": 101,
          "authorId": 1,
          "authorName": "Jennifer Anderson",
          "authorRole": "REQUESTER",
          "content": "Added the screenshot.",
          "createdAt": "2026-05-12T09:15:00.000Z"
        }
      ],
      "internalNotes": [
        {
          "id": 1,
          "ticketId": 101,
          "authorId": 2,
          "authorName": "Michael Brown",
          "authorRole": "IT_STAFF",
          "content": "Battery health at 62%. Ordered replacement under warranty.",
          "createdAt": "2026-05-13T10:30:00.000Z"
        }
      ]
    }
    ```
  - `404 Not Found`: Ticket not found.
  - `403 Forbidden`: User role is `REQUESTER`.

---

### 5.3 `PATCH /api/staff/tickets/:ticketId/assign`
Claims or reassigns primary ticket ownership.
- Claiming an unassigned ticket in status `NEW` automatically advances status to `OPEN`.
- Validates that `ownerId` belongs to an active user with role `IT_STAFF` or `ADMINISTRATOR` (or `null` for unassign).

- **Access**: IT Staff, Administrator
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "ownerId": 2
}
```
*(Use `null` to unassign).*
- **Responses**:
  - `200 OK`:
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "ownerId": 2,
      "ownerName": "Michael Brown",
      "currentStatus": "OPEN",
      "updatedAt": "2026-05-13T11:00:00.000Z"
    }
    ```
  - `400 Bad Request`: `INELIGIBLE_OWNER` (target user is inactive or has role `REQUESTER`).
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED` or unpermitted role.
  - `404 Not Found`: Ticket not found.

---

### 5.4 `PATCH /api/staff/tickets/:ticketId/priority`
Updates the internal IT Priority.

- **Access**: IT Staff, Administrator
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "itPriority": "HIGH"
}
```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "requestedPriority": "MEDIUM",
      "itPriority": "HIGH",
      "updatedAt": "2026-05-13T11:05:00.000Z"
    }
    ```
  - `400 Bad Request`: Invalid priority value.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED` or unpermitted role.

---

### 5.5 `PATCH /api/staff/tickets/:ticketId/status`
Advances ticket lifecycle status according to the permitted status transition matrix.
- Submitting the existing status returns `200 OK` (no-op) for all statuses, including `CANCELLED`.
- Transitions away from `CANCELLED` return `400 INVALID_STATUS_TRANSITION`.
- Transitioning a ticket to `REOPENED` resets `requesterResolved = false` and `requesterResolvedAt = null`. If the existing owner is inactive or ineligible, `ownerId` is cleared to `null`.

- **Access**: IT Staff, Administrator
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "status": "RESOLVED"
}
```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "currentStatus": "RESOLVED",
      "updatedAt": "2026-05-13T11:10:00.000Z"
    }
    ```
  - `400 Bad Request`: `INVALID_STATUS_TRANSITION`.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED` or unpermitted role.

---

### 5.6 `GET /api/staff/users`
Retrieves list of active IT Staff and Administrator accounts for assignment dropdowns.

- **Access**: IT Staff, Administrator
- **Responses**:
  - `200 OK`:
    ```json
    {
      "items": [
        { "id": 2, "name": "Michael Brown", "role": "IT_STAFF" },
        { "id": 3, "name": "Sarah Johnson", "role": "IT_STAFF" },
        { "id": 5, "name": "System Admin", "role": "ADMINISTRATOR" }
      ]
    }
    ```

---

## 6. Comments and Internal Notes Endpoints

### 6.1 `GET /api/tickets/:ticketId/comments`
Retrieves the thread of public comments.

- **Access**: Ticket Owner, IT Staff, Administrator
- **Responses**:
  - `200 OK`:
    ```json
    {
      "items": [
        {
          "id": 1,
          "ticketId": 101,
          "authorId": 1,
          "authorName": "Jennifer Anderson",
          "authorRole": "REQUESTER",
          "content": "Thank you for the update. Please let me know if you need more logs.",
          "createdAt": "2026-05-13T09:20:00.000Z"
        }
      ]
    }
    ```
  - `404 Not Found`: Ticket not found or not owned by Requester.

---

### 6.2 `POST /api/tickets/:ticketId/comments`
Appends a new public comment to the ticket. (Posting a manual comment as the Requester automatically resets `requesterResolved = false` and `requesterResolvedAt = null`).

- **Access**: Ticket Owner, IT Staff, Administrator
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "content": "We have ordered the replacement part and will update you shortly."
}
```
- **Responses**:
  - `201 Created`: Returns newly created comment object.
  - `400 Bad Request`: Content empty, whitespace-only, or > 2,000 chars.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED`.
  - `404 Not Found`: Ticket not found or not owned.

---

### 6.3 `GET /api/tickets/:ticketId/internal-notes`
Retrieves confidential operational notes.

- **Access**: IT Staff, Administrator
- **Responses**:
  - `200 OK`:
    ```json
    {
      "items": [
        {
          "id": 1,
          "ticketId": 101,
          "authorId": 2,
          "authorName": "Michael Brown",
          "authorRole": "IT_STAFF",
          "content": "Battery diagnostic returned code 62. Unit replaced under warranty PO-8821.",
          "createdAt": "2026-05-13T10:30:00.000Z"
        }
      ]
    }
    ```
  - `404 Not Found`: Returned when called by a Requester (hides note existence).
  - `403 Forbidden`: Unpermitted role.

---

### 6.4 `POST /api/tickets/:ticketId/internal-notes`
Appends a new confidential internal note.

- **Access**: IT Staff, Administrator
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "content": "Hardware vendor confirmed part dispatch by Friday."
}
```
- **Responses**:
  - `201 Created`: Returns newly appended internal note object.
  - `400 Bad Request`: Content empty, whitespace-only, or > 2,000 chars.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED` or unpermitted role.
  - `404 Not Found`: Returned when called by a Requester.

---

## 7. Administrator User Management Endpoints

### 7.1 `GET /api/admin/users`
Lists all users with search and role filtering.

- **Access**: Administrator
- **Query Parameters**:
  - `search` (string, optional - searches name and email)
  - `role` (`REQUESTER` | `IT_STAFF` | `ADMINISTRATOR`, optional)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "items": [
        {
          "id": 1,
          "name": "Jennifer Anderson",
          "email": "jennifer.anderson@example.com",
          "role": "REQUESTER",
          "isActive": true,
          "createdAt": "2026-05-01T00:00:00.000Z",
          "updatedAt": "2026-05-01T00:00:00.000Z"
        }
      ]
    }
    ```
  - `403 Forbidden`: Role is not Administrator.

---

### 7.2 `POST /api/admin/users`
Provisions a new user account with an initial temporary password.

- **Access**: Administrator
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "name": "Alex Thompson",
  "email": "alex.thompson@toktickit.com",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "TempPassword123!"
}
```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "user": {
        "id": 10,
        "name": "Alex Thompson",
        "email": "alex.thompson@toktickit.com",
        "role": "IT_STAFF",
        "isActive": true,
        "mustChangePassword": true,
        "createdAt": "2026-05-13T12:00:00.000Z"
      }
    }
    ```
  - `409 Conflict`: `DUPLICATE_EMAIL` (case-insensitive email collision).
  - `400 Bad Request`: Invalid role, password complexity failure ($\ge 8$ code points, $\le 72$ bytes), or missing fields.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED` or role is not Administrator.

---

### 7.3 `PATCH /api/admin/users/:userId`
Updates user name, email, role, and active status.
- Deactivating an IT Staff user or demoting their role to `REQUESTER` automatically sets `ownerId = null` on all active tickets (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`), while preserving historical `ownerId` references on completed/terminal tickets.

- **Access**: Administrator
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "name": "Alex Thompson Updated",
  "email": "alex.thompson@toktickit.com",
  "role": "IT_STAFF",
  "isActive": true
}
```
- **Responses**:
  - `200 OK`: Returns updated user object.
  - `400 Bad Request`:
    - `CANNOT_DEACTIVATE_SELF`: Admin attempted to deactivate own account.
    - `CANNOT_DEACTIVATE_LAST_ADMIN`: Attempted to deactivate or demote the last active admin.
  - `409 Conflict`: `DUPLICATE_EMAIL`.
  - `404 Not Found`: `USER_NOT_FOUND`.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED` or role is not Administrator.

---

### 7.4 `POST /api/admin/users/:userId/reset-password`
Issues a new initial temporary password for a user, sets `mustChangePassword = true`, and invalidates all existing sessions for that user.

- **Access**: Administrator
- **Required Headers**: `X-Requested-With: XMLHttpRequest`
- **Request Body**:
```json
{
  "initialPassword": "NewTempPassword123!"
}
```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "message": "Initial password set successfully. User must change password at next login."
    }
    ```
  - `400 Bad Request`: Password fails complexity rules ($\ge 8$ code points, $\le 72$ bytes).
  - `404 Not Found`: `USER_NOT_FOUND`.
  - `403 Forbidden`: `CSRF_PROTECTION_FAILED` or role is not Administrator.
