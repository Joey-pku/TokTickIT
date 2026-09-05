# Lab 2 API Specification

> **Status**: Engineering Contract — Approved.
> **Scope**: Lab 2 Requester-facing REST API only.
> **Primary Contract**: `docs/lab-02/specification.md` (functional/business) and `docs/lab-02/ui-spec.md` (frontend behavior).
> **Do NOT implement**: Authentication, login, JWT, RBAC, IT Staff APIs, IT Priority, Ticket Owner, comments, internal notes, lifecycle transitions beyond `NEW`, administration endpoints.

---

## 1. Base Conventions

### 1.1 Base Path

All endpoints are served under the `/api` prefix. No version segment is included.

```
/api/<resource>
```

Examples:
- `GET /api/categories`
- `POST /api/tickets`
- `PATCH /api/attachments/:attachmentId/remove`

### 1.2 JSON Property Naming

All JSON request body properties and response body properties use **camelCase**.

| Correct | Incorrect |
| :--- | :--- |
| `ticketNumber` | `ticket_number`, `TicketNumber` |
| `requestedPriority` | `requested_priority` |
| `fileSizeBytes` | `file_size_bytes` |

### 1.3 Timestamps

All timestamps are returned as **ISO 8601 strings in UTC**.

```
"2026-05-12T09:14:00.000Z"
```

The frontend is responsible for formatting timestamps for display as required by `ui-spec.md`. The backend never returns locale-formatted or timezone-adjusted strings.

### 1.4 ID Representation

All entity `id` fields (integer database primary keys) are represented as JSON **numbers** (integers).

`ticketNumber` is a **string** with the format `TKT-YYYY-NNNNNN` (e.g., `"TKT-2026-000001"`).

### 1.5 Content-Type

- All endpoints that accept a JSON body require `Content-Type: application/json`.
- The attachment upload endpoint requires `Content-Type: multipart/form-data` (set automatically by the browser or HTTP client via the form boundary).
- All endpoints that return a body (except the download endpoint) respond with `Content-Type: application/json`.

### 1.6 Whitespace Trimming

The server trims all inbound string fields of leading and trailing whitespace before validation and persistence. This applies to: `summary`, `description`, `removalReason`, and `search` query parameter.

---

## 2. Development Requester Context (`x-requester-id`)

### 2.1 Purpose and Scope

The `x-requester-id` header is a **testing-only identity simulation mechanism** introduced in Lab 2 to simulate multi-user ownership before real authentication is available. It is **not** an authentication token, not a session credential, and provides no security guarantee.

The selected Development Requester ID is:
- Stored in `localStorage` under key `toktickit_selected_requester_id`.
- Transmitted by the frontend on every requester-scoped request as an HTTP header.
- Read by the backend strictly to scope database queries — the backend never trusts this header as a security identity.

In Lab 3, this header will be removed and replaced with JWT/session authentication with zero schema changes to `Ticket` or `Attachment`.

### 2.2 Which Endpoints Require the Header

| Endpoint | Requires `x-requester-id` | Rationale |
| :--- | :--- | :--- |
| `GET /api/categories` | **No** | Public seeded reference data |
| `GET /api/related-systems` | **No** | Public seeded reference data |
| `GET /api/development-requesters` | **No** | Used to populate selector before context is set |
| `POST /api/tickets` | **Yes** | Ownership assignment |
| `GET /api/tickets` | **Yes** | Ownership-scoped listing |
| `GET /api/tickets/:ticketId` | **Yes** | Ownership-scoped detail |
| `POST /api/tickets/:ticketId/attachments` | **Yes** | Ownership-scoped upload |
| `GET /api/attachments/:attachmentId` | **Yes** | Ownership-scoped metadata |
| `GET /api/attachments/:attachmentId/download` | **Yes** | Ownership-scoped file stream |
| `PATCH /api/attachments/:attachmentId/remove` | **Yes** | Ownership-scoped mutation |

### 2.3 Header Validation Behavior

| Condition | HTTP Status | Error Code |
| :--- | :--- | :--- |
| Header absent on a required endpoint | `400 Bad Request` | `MISSING_REQUESTER_CONTEXT` |
| Header present but not a valid integer string | `400 Bad Request` | `INVALID_REQUESTER_ID` |
| Header is a valid integer but requester does not exist in DB | `404 Not Found` | `REQUESTER_NOT_FOUND` |
| Header refers to an inactive requester (`isActive = false`) | `404 Not Found` | `REQUESTER_NOT_FOUND` |

Inactive and non-existent requesters both return `404 Not Found` (not `403`) to prevent leaking information about which requester IDs exist (see BR-24).

### 2.4 Ownership Enforcement

All requester-scoped queries include an explicit ownership predicate at the database level (e.g., `WHERE requesterId = :requesterId` or an equivalent join). Requests for unowned or non-existent resources return `404 Not Found`. `403 Forbidden` is never returned for ownership violations.

---

## 3. Reference Data Endpoints

These three endpoints provide seeded, read-only reference data. They do **not** require `x-requester-id`.

---

### 3.1 `GET /api/development-requesters`

Returns all active Development Requesters for the requester selection dropdown.

**Authorization**: None required.

**Response `200 OK`**:
```json
{
  "items": [
    { "id": 1, "name": "Jennifer Anderson", "department": "Marketing" },
    { "id": 2, "name": "David Lee",         "department": "Engineering" },
    { "id": 3, "name": "Michael Brown",     "department": "Finance" },
    { "id": 4, "name": "Sarah Johnson",     "department": "Human Resources" }
  ]
}
```

- Only requesters with `isActive = true` are included.
- Inactive requesters (e.g., Alex Taylor) are never returned.
- Ordered by `name ASC`.
- If no active requesters exist (e.g., unseeded DB), returns `{ "items": [] }` with `200 OK`.

No query parameters are accepted.

---

### 3.2 `GET /api/categories`

Returns all seeded Categories for the ticket creation form.

**Authorization**: None required.

**Response `200 OK`**:
```json
{
  "items": [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Network" },
    { "id": 4, "name": "Software" }
  ]
}
```

- All seeded categories are returned (no `isActive` filtering — categories do not have an `isActive` field).
- Ordered by `id ASC`.
- If the table is empty, returns `{ "items": [] }` with `200 OK`.

---

### 3.3 `GET /api/related-systems`

Returns all active Related Systems for the ticket creation form.

**Authorization**: None required.

**Response `200 OK`**:
```json
{
  "items": [
    { "id": 3, "name": "Campus Wi-Fi" },
    { "id": 1, "name": "Corporate Laptop" },
    { "id": 2, "name": "Email" },
    { "id": 5, "name": "Grade Submission App" },
    { "id": 6, "name": "LEB2 App" },
    { "id": 7, "name": "Printer" },
    { "id": 4, "name": "VPN" }
  ]
}
```

- Only systems with `isActive = true` are included.
- Ordered by `name ASC`.
- If no active systems exist, returns `{ "items": [] }` with `200 OK`.

---

## 4. Ticket Endpoints

---

### 4.1 `POST /api/tickets` — Create Ticket

Creates a new Ticket owned by the Development Requester identified by `x-requester-id`.

**Authorization**: `x-requester-id` required.

**Request Headers**:
```
Content-Type: application/json
x-requester-id: 1
```

**Request Body** (`application/json`):
```json
{
  "categoryId": 2,
  "relatedSystemId": 1,
  "requestedPriority": "MEDIUM",
  "summary": "Corporate laptop screen broken after drop",
  "description": "The screen cracked after the laptop fell from my desk this morning. There are visible fracture lines across the upper third of the display."
}
```

| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `categoryId` | `number` (integer) | Yes | Must be a valid `Category.id` from the seeded table |
| `relatedSystemId` | `number` (integer) | Yes | Must be a valid `RelatedSystem.id` where `isActive = true` |
| `requestedPriority` | `string` | Yes | Exactly one of: `"LOW"`, `"MEDIUM"`, `"HIGH"` |
| `summary` | `string` | Yes | 5–100 characters after trimming; whitespace-only is invalid |
| `description` | `string` | Yes | 10–2000 characters after trimming; whitespace-only is invalid |

**Rejected Fields**: If the request body contains any of the following server-controlled or unsupported fields, the server returns `400 Bad Request` with code `VALIDATION_ERROR`:

- `id`, `ticketNumber`, `createdAt`, `updatedAt`, `currentStatus`, `requesterId`, `attachments`, or any unrecognised property.

Server-controlled fields are set exclusively by the backend:
- `ticketNumber` — Generated uniquely in format `TKT-YYYY-NNNNNN`
- `createdAt` — Database `now()`
- `currentStatus` — Hardcoded to `"NEW"`
- `requesterId` — Derived strictly from `x-requester-id`

**Response `201 Created`**:
```json
{
  "id": 1,
  "ticketNumber": "TKT-2026-000001",
  "summary": "Corporate laptop screen broken after drop",
  "description": "The screen cracked after the laptop fell from my desk this morning. There are visible fracture lines across the upper third of the display.",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 1,
  "createdAt": "2026-05-12T09:14:00.000Z",
  "updatedAt": "2026-05-12T09:14:00.000Z"
}
```

The response does **not** include an `attachments` array. Initial attachments are uploaded in separate requests to `POST /api/tickets/:ticketId/attachments` after ticket creation succeeds (see Section 6.1).

**Error Responses**:

| Condition | Status | Code |
| :--- | :--- | :--- |
| Missing `x-requester-id` | `400` | `MISSING_REQUESTER_CONTEXT` |
| Invalid `x-requester-id` value | `400` | `INVALID_REQUESTER_ID` |
| Requester not found or inactive | `404` | `REQUESTER_NOT_FOUND` |
| Server-controlled field supplied in body | `400` | `VALIDATION_ERROR` |
| Field validation failure | `400` | `VALIDATION_ERROR` |
| `categoryId` does not exist | `400` | `VALIDATION_ERROR` |
| `relatedSystemId` does not exist or `isActive = false` | `400` | `VALIDATION_ERROR` |
| Unexpected server error | `500` | `INTERNAL_ERROR` |

---

### 4.2 `GET /api/tickets` — List My Tickets

Returns a paginated, filtered, and sorted list of Tickets owned by the requester in `x-requester-id`. Tickets from other requesters are never included.

**Authorization**: `x-requester-id` required.

**Request Headers**:
```
x-requester-id: 1
```

#### Query Parameters

| Parameter | Type | Default | Valid Values | Behaviour if Invalid |
| :--- | :--- | :--- | :--- | :--- |
| `search` | string | `""` | Any string (trimmed server-side) | Any string is valid |
| `categoryId` | integer | *(no filter)* | A valid `Category.id` | `400 VALIDATION_ERROR` |
| `requestedPriority` | string | *(no filter)* | `LOW`, `MEDIUM`, `HIGH` | `400 VALIDATION_ERROR` |
| `status` | string | *(no filter)* | `NEW` | `400 VALIDATION_ERROR` |
| `sortBy` | string | `createdAt` | `createdAt`, `ticketNumber`, `updatedAt` | `400 VALIDATION_ERROR` |
| `sortOrder` | string | `desc` | `asc`, `desc` | `400 VALIDATION_ERROR` |
| `page` | integer | `1` | Positive integer >= 1 | `400 VALIDATION_ERROR` |
| `pageSize` | integer | `10` | `10`, `25`, `50` | `400 VALIDATION_ERROR` |

**Omitted parameters use their defaults.** Invalid supplied values (wrong enum, non-integer, out-of-range) return `400 Bad Request`. A `page` value beyond the last available page is **not** an error — it returns `200 OK` with `"items": []`.

**Search Behavior**:
- `search` performs **case-insensitive substring matching** against `ticketNumber` and `summary`.
- The search query is trimmed before matching.
- An empty or whitespace-only `search` value disables text filtering.

**Sort Behavior**:
- Primary sort: The column specified by `sortBy` in the direction specified by `sortOrder`.
- Secondary sort (tiebreaker): `id DESC` for deterministic, stable pagination when primary sort values collide.

**Example Request**:
```
GET /api/tickets?search=VPN&categoryId=4&requestedPriority=HIGH&sortBy=createdAt&sortOrder=desc&page=1&pageSize=10
```

**Response `200 OK`**:
```json
{
  "items": [
    {
      "id": 3,
      "ticketNumber": "TKT-2026-000003",
      "summary": "VPN connection fails after password reset",
      "requestedPriority": "HIGH",
      "currentStatus": "NEW",
      "categoryId": 4,
      "categoryName": "Network",
      "relatedSystemId": 4,
      "relatedSystemName": "VPN",
      "createdAt": "2026-05-12T11:00:00.000Z",
      "updatedAt": "2026-05-12T11:00:00.000Z"
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

Each item in `items` includes denormalized `categoryName` and `relatedSystemName` strings so the frontend does not need additional requests to resolve foreign keys for display.

**Error Responses**:

| Condition | Status | Code |
| :--- | :--- | :--- |
| Missing `x-requester-id` | `400` | `MISSING_REQUESTER_CONTEXT` |
| Invalid `x-requester-id` value | `400` | `INVALID_REQUESTER_ID` |
| Requester not found or inactive | `404` | `REQUESTER_NOT_FOUND` |
| Invalid query parameter value | `400` | `VALIDATION_ERROR` |
| Unexpected server error | `500` | `INTERNAL_ERROR` |

---

### 4.3 `GET /api/tickets/:ticketId` — Get Ticket Detail

Returns full detail for a single Ticket, including all associated attachments, for the owning requester only.

**Authorization**: `x-requester-id` required.

**Path Parameters**:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `ticketId` | integer | The `id` (database primary key) of the Ticket |

**Request Headers**:
```
x-requester-id: 1
```

**Response `200 OK`**:
```json
{
  "id": 1,
  "ticketNumber": "TKT-2026-000001",
  "summary": "Corporate laptop screen broken after drop",
  "description": "The screen cracked after the laptop fell from my desk this morning. There are visible fracture lines across the upper third of the display.",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
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
      "id": 7,
      "originalFileName": "laptop_damage.jpg",
      "mimeType": "image/jpeg",
      "fileSizeBytes": 2097152,
      "isRemoved": false,
      "removedAt": null,
      "removalReason": null,
      "createdAt": "2026-05-12T09:15:00.000Z"
    },
    {
      "id": 8,
      "originalFileName": "warranty_card.pdf",
      "mimeType": "application/pdf",
      "fileSizeBytes": 512000,
      "isRemoved": true,
      "removedAt": "2026-05-13T14:00:00.000Z",
      "removalReason": "Uploaded wrong document version",
      "createdAt": "2026-05-12T09:16:00.000Z"
    }
  ]
}
```

**Attachment fields in the Ticket Detail response**:

| Field | Always Present | Notes |
| :--- | :--- | :--- |
| `id` | Yes | |
| `originalFileName` | Yes | Original user-provided filename; never the internal storage filename |
| `mimeType` | Yes | |
| `fileSizeBytes` | Yes | |
| `isRemoved` | Yes | `true` or `false` |
| `removedAt` | Yes | `null` if not removed |
| `removalReason` | Yes | `null` if not removed |
| `createdAt` | Yes | |

The internal `storedFileName` and `filePath` are **never** included in any response.

**Error Responses**:

| Condition | Status | Code |
| :--- | :--- | :--- |
| Missing `x-requester-id` | `400` | `MISSING_REQUESTER_CONTEXT` |
| Invalid `x-requester-id` value | `400` | `INVALID_REQUESTER_ID` |
| Requester not found or inactive | `404` | `REQUESTER_NOT_FOUND` |
| Ticket does not exist | `404` | `TICKET_NOT_FOUND` |
| Ticket exists but is owned by a different requester | `404` | `TICKET_NOT_FOUND` |
| Unexpected server error | `500` | `INTERNAL_ERROR` |

Both "ticket not found" and "ticket owned by another requester" return the identical `404 TICKET_NOT_FOUND` response to prevent information leakage (BR-24).

---

## 5. Ticket Number Generation

The backend generates `ticketNumber` using a **PostgreSQL-backed, concurrency-safe strategy**.

**Format**: `TKT-YYYY-NNNNNN`
- `YYYY` = the 4-digit calendar year at the moment of creation (UTC).
- `NNNNNN` = a zero-padded 6-digit sequence number (e.g., `000001`).

**Contract requirements** — the generated value must:
- Follow the `TKT-YYYY-NNNNNN` format exactly.
- Be generated only by the backend; never supplied by the client.
- Be globally unique across the system.
- Remain correct under concurrent ticket creation requests.

`Ticket.ticketNumber` has a `UNIQUE` database constraint as the final uniqueness guarantee.

The exact sequence-generation implementation is an implementation decision and is not prescribed by this API contract.

---

## 6. Attachment Upload Endpoint

---

### 6.1 `POST /api/tickets/:ticketId/attachments` — Upload Attachment

Uploads exactly one permitted file as an attachment to an owned Ticket.

**Authorization**: `x-requester-id` required. The ticket identified by `:ticketId` must be owned by the requester in `x-requester-id`.

**Path Parameters**:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `ticketId` | integer | The `id` of the owning Ticket |

**Request**:
- `Content-Type: multipart/form-data`
- Multipart field name: `file`
- Exactly **one** file per request.

**Request Headers**:
```
Content-Type: multipart/form-data; boundary=...
x-requester-id: 1
```

**File Constraints** (enforced server-side):

| Constraint | Rule |
| :--- | :--- |
| Permitted MIME types | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| Permitted extensions | `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf` |
| Maximum file size | 5 MB (5,242,880 bytes) |
| Maximum active attachments per Ticket | 5 (attachments where `isRemoved = false`) |

MIME type is verified server-side from the file content/header, not solely from the submitted filename extension.

**Response `201 Created`**:
```json
{
  "id": 7,
  "originalFileName": "error_screenshot.png",
  "mimeType": "image/png",
  "fileSizeBytes": 1887436,
  "isRemoved": false,
  "removedAt": null,
  "removalReason": null,
  "createdAt": "2026-05-12T09:15:00.000Z"
}
```

The `storedFileName` and `filePath` are **never** included in the response.

**Error Responses**:

| Condition | Status | Code |
| :--- | :--- | :--- |
| Missing `x-requester-id` | `400` | `MISSING_REQUESTER_CONTEXT` |
| Invalid `x-requester-id` value | `400` | `INVALID_REQUESTER_ID` |
| Requester not found or inactive | `404` | `REQUESTER_NOT_FOUND` |
| Ticket not found or unowned | `404` | `TICKET_NOT_FOUND` |
| No file provided in `file` field | `400` | `VALIDATION_ERROR` |
| File MIME type not permitted | `415` | `UNSUPPORTED_MEDIA_TYPE` |
| File extension not permitted | `415` | `UNSUPPORTED_MEDIA_TYPE` |
| File size exceeds 5 MB | `413` | `FILE_TOO_LARGE` |
| Upload would exceed 5 active attachments | `409` | `ATTACHMENT_LIMIT_REACHED` |
| Unexpected server or disk error | `500` | `INTERNAL_ERROR` |

**Initial Attachment Behavior (Ticket Creation Resilience)**:

When the frontend uploads initial attachments after ticket creation:
- The Ticket is created first (`POST /api/tickets`), committed independently.
- Each initial attachment is then uploaded via separate `POST /api/tickets/:ticketId/attachments` calls.
- If any attachment upload fails, the Ticket remains valid and intact in the database.
- Successfully uploaded attachments remain attached.
- Failed uploads are not stored as active attachments.
- The frontend reports failed files and allows retrying from Ticket Detail.
- The Ticket is **never** rolled back due to an attachment upload failure.

---

## 7. Standalone Attachment Endpoints

---

### 7.1 `GET /api/attachments/:attachmentId` — Get Attachment Metadata

Returns metadata for a single attachment. The attachment must belong to a Ticket owned by the requester in `x-requester-id`.

This endpoint demonstrates the soft-removal contract: metadata for a removed attachment is intentionally retained and accessible, while file download is blocked. This is explicitly distinct behavior from `GET /api/attachments/:attachmentId/download`.

**Authorization**: `x-requester-id` required. Ownership is verified through the parent Ticket.

**Path Parameters**:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `attachmentId` | integer | The `id` of the Attachment |

**Response `200 OK` — Active attachment**:
```json
{
  "id": 7,
  "originalFileName": "error_screenshot.png",
  "mimeType": "image/png",
  "fileSizeBytes": 1887436,
  "isRemoved": false,
  "removedAt": null,
  "removalReason": null,
  "createdAt": "2026-05-12T09:15:00.000Z"
}
```

**Response `200 OK` — Soft-removed attachment**:
```json
{
  "id": 8,
  "originalFileName": "warranty_card.pdf",
  "mimeType": "application/pdf",
  "fileSizeBytes": 512000,
  "isRemoved": true,
  "removedAt": "2026-05-13T14:00:00.000Z",
  "removalReason": "Uploaded wrong document version",
  "createdAt": "2026-05-12T09:16:00.000Z"
}
```

Soft-removed attachments return `200 OK` with full audit metadata. `isRemoved: true`, `removedAt`, and `removalReason` are always present and clearly indicate removal status.

The internal `storedFileName` and `filePath` are **never** included in any response.

**Error Responses**:

| Condition | Status | Code |
| :--- | :--- | :--- |
| Missing `x-requester-id` | `400` | `MISSING_REQUESTER_CONTEXT` |
| Invalid `x-requester-id` value | `400` | `INVALID_REQUESTER_ID` |
| Requester not found or inactive | `404` | `REQUESTER_NOT_FOUND` |
| Attachment does not exist | `404` | `ATTACHMENT_NOT_FOUND` |
| Attachment exists but parent Ticket is owned by different requester | `404` | `ATTACHMENT_NOT_FOUND` |
| Unexpected server error | `500` | `INTERNAL_ERROR` |

---

### 7.2 `GET /api/attachments/:attachmentId/download` — Download Attachment File

Streams the binary file content for an active, owned attachment. This endpoint has strictly different behavior from the metadata endpoint.

**Authorization**: `x-requester-id` required. Ownership is verified through the parent Ticket.

**Path Parameters**:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `attachmentId` | integer | The `id` of the Attachment |

**Response `200 OK`**:
```
Content-Type: image/jpeg
Content-Disposition: attachment; filename="error_screenshot.png"
Content-Length: 1887436
[binary file bytes]
```

- `Content-Disposition` uses the `originalFileName` stored in the database, not the internal UUID storage filename.
- The response body is the raw binary file stream.

**Behavior matrix**:

| Condition | Response |
| :--- | :--- |
| Active owned attachment | `200 OK` — binary file stream |
| Soft-removed attachment (`isRemoved = true`) | `404 Not Found` |
| Unowned attachment (requester mismatch) | `404 Not Found` |
| Attachment does not exist | `404 Not Found` |

All failure cases return `404 Not Found`. No `403 Forbidden` is used (BR-24). A removed attachment is completely inaccessible for download even though its metadata remains accessible at `GET /api/attachments/:attachmentId`.

**Error Responses**:

| Condition | Status | Code |
| :--- | :--- | :--- |
| Missing `x-requester-id` | `400` | `MISSING_REQUESTER_CONTEXT` |
| Invalid `x-requester-id` value | `400` | `INVALID_REQUESTER_ID` |
| Requester not found or inactive | `404` | `REQUESTER_NOT_FOUND` |
| Attachment not found, unowned, or soft-removed | `404` | `ATTACHMENT_NOT_FOUND` |
| Unexpected server error | `500` | `INTERNAL_ERROR` |

---

### 7.3 `PATCH /api/attachments/:attachmentId/remove` — Soft-Remove Attachment

Marks an active, owned attachment as soft-removed. The database record and audit metadata are retained permanently. File download is blocked immediately upon removal.

**Authorization**: `x-requester-id` required. Ownership is verified through the parent Ticket.

**Path Parameters**:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `attachmentId` | integer | The `id` of the Attachment to remove |

**Request Headers**:
```
Content-Type: application/json
x-requester-id: 1
```

**Request Body**:
```json
{
  "removalReason": "Uploaded wrong screenshot by mistake"
}
```

| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `removalReason` | `string` | Yes | 5–255 characters after trimming; whitespace-only is invalid |

**Response `200 OK`**:
```json
{
  "id": 7,
  "originalFileName": "error_screenshot.png",
  "mimeType": "image/png",
  "fileSizeBytes": 1887436,
  "isRemoved": true,
  "removedAt": "2026-05-13T14:00:00.000Z",
  "removalReason": "Uploaded wrong screenshot by mistake",
  "createdAt": "2026-05-12T09:15:00.000Z"
}
```

The response is the updated attachment metadata with `isRemoved: true`, `removedAt`, and `removalReason` populated.

**Error Responses**:

| Condition | Status | Code |
| :--- | :--- | :--- |
| Missing `x-requester-id` | `400` | `MISSING_REQUESTER_CONTEXT` |
| Invalid `x-requester-id` value | `400` | `INVALID_REQUESTER_ID` |
| Requester not found or inactive | `404` | `REQUESTER_NOT_FOUND` |
| Attachment not found or unowned | `404` | `ATTACHMENT_NOT_FOUND` |
| `removalReason` missing, empty, or whitespace-only | `400` | `VALIDATION_ERROR` |
| `removalReason` length after trimming < 5 or > 255 | `400` | `VALIDATION_ERROR` |
| Attachment is already soft-removed (`isRemoved = true`) | `409` | `ALREADY_REMOVED` |
| Unexpected server error | `500` | `INTERNAL_ERROR` |

---

## 8. Error Response Contract

All error responses use a consistent JSON envelope.

### 8.1 Standard Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data.",
    "fields": {
      "summary": "Summary must be between 5 and 100 characters.",
      "description": "Description is required."
    }
  }
}
```

| Field | Type | Always Present | Description |
| :--- | :--- | :--- | :--- |
| `error.code` | `string` | Yes | Machine-readable uppercase error code (see Section 8.2) |
| `error.message` | `string` | Yes | Human-readable summary of the error |
| `error.fields` | `object` | Only for `VALIDATION_ERROR` | Map of field names to field-level error messages |

`error.fields` is **only** present when `code` is `VALIDATION_ERROR`. It is omitted for all other error codes.

**Strictly excluded from all error responses**:
- Stack traces
- Prisma error messages or codes
- SQL queries or schema details
- Internal filesystem paths or storage filenames
- Database constraint violation details

### 8.2 Error Code Reference

| Code | Typical HTTP Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | `400` | Request body or query parameter failed validation |
| `MISSING_REQUESTER_CONTEXT` | `400` | `x-requester-id` header absent on required endpoint |
| `INVALID_REQUESTER_ID` | `400` | `x-requester-id` is not a valid integer string |
| `REQUESTER_NOT_FOUND` | `404` | Requester ID not found or inactive |
| `TICKET_NOT_FOUND` | `404` | Ticket not found or not owned by requester |
| `ATTACHMENT_NOT_FOUND` | `404` | Attachment not found, not owned, or removed (download only) |
| `ALREADY_REMOVED` | `409` | Attachment is already soft-removed |
| `ATTACHMENT_LIMIT_REACHED` | `409` | Ticket already has 5 active attachments |
| `FILE_TOO_LARGE` | `413` | File exceeds 5 MB limit |
| `UNSUPPORTED_MEDIA_TYPE` | `415` | File type or extension is not permitted |
| `INTERNAL_ERROR` | `500` | Unexpected server or database error |

---

## 9. HTTP Status Code Policy

| Code | Meaning in This API |
| :--- | :--- |
| `200 OK` | Successful `GET` or successful `PATCH` |
| `201 Created` | Successful `POST` (ticket created, attachment uploaded) |
| `400 Bad Request` | Validation failure; missing, malformed, or unsupported field in request; missing or invalid `x-requester-id` |
| `404 Not Found` | Resource not found; resource unowned (cross-requester); inactive/missing requester; soft-removed file download |
| `409 Conflict` | State conflict: attachment already removed; active attachment limit would be exceeded |
| `413 Content Too Large` | Uploaded file exceeds 5 MB |
| `415 Unsupported Media Type` | File MIME type or extension is not permitted |
| `500 Internal Server Error` | Unexpected server-side failure |

`403 Forbidden` is **never** used. Ownership violations always return `404 Not Found` (BR-24, information-hiding).

`204 No Content` is **not** used. All successful responses include a JSON body (or binary stream for download).

---

## 10. Ownership Isolation Rules

These rules apply consistently across every requester-scoped endpoint.

1. **Ticket ownership**: `Ticket.requesterId` must equal the requester ID from `x-requester-id`.
2. **Attachment ownership**: Verified through the parent Ticket — `Attachment.ticketId -> Ticket.requesterId` must equal the requester ID.
3. **Ownership is enforced at the database query level**: Queries always include `WHERE requesterId = :requesterId` (or equivalent join). The backend never fetches a resource first and then checks ownership in application code.
4. **Ownership violations return `404 Not Found`**: The response is identical to "resource not found" to prevent information leakage.
5. **The `x-requester-id` header is the exclusive source of requester identity**: The `requesterId` is never read from the request body, URL path, or query parameter.

---

## 11. Pagination Response Shape

All paginated endpoints return the following pagination envelope:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 24,
    "totalPages": 3
  }
}
```

| Field | Type | Description |
| :--- | :--- | :--- |
| `pagination.page` | integer | The current page number (1-based) |
| `pagination.pageSize` | integer | Number of items per page |
| `pagination.totalItems` | integer | Total matching items across all pages |
| `pagination.totalPages` | integer | Total number of pages (`ceil(totalItems / pageSize)`) |

**Edge cases**:
- `totalItems = 0` results in `totalPages = 0` and `items = []`.
- `page > totalPages` and `totalItems > 0` returns `200 OK`, `items = []`, `totalPages` reflects the actual total.
- `pageSize = 50`, `totalItems = 3` results in `totalPages = 1`.

---

## 12. Response Shape Reference Summary

| Endpoint | Method | Success Status | Response Shape |
| :--- | :--- | :--- | :--- |
| `/api/development-requesters` | `GET` | `200` | `{ "items": [{ id, name, department }] }` |
| `/api/categories` | `GET` | `200` | `{ "items": [{ id, name }] }` |
| `/api/related-systems` | `GET` | `200` | `{ "items": [{ id, name }] }` |
| `/api/tickets` | `POST` | `201` | Ticket object (no attachments array) |
| `/api/tickets` | `GET` | `200` | `{ items: [Ticket + denorm names], pagination }` |
| `/api/tickets/:ticketId` | `GET` | `200` | Full Ticket object with `attachments` array |
| `/api/tickets/:ticketId/attachments` | `POST` | `201` | Attachment metadata object |
| `/api/attachments/:attachmentId` | `GET` | `200` | Attachment metadata object (active or removed) |
| `/api/attachments/:attachmentId/download` | `GET` | `200` | Binary stream (`Content-Disposition: attachment`) |
| `/api/attachments/:attachmentId/remove` | `PATCH` | `200` | Updated Attachment metadata object |

---

## 13. Fields Never Exposed in API Responses

The following internal fields must **never** appear in any API response regardless of endpoint:

| Field | Model | Reason |
| :--- | :--- | :--- |
| `storedFileName` | `Attachment` | Internal UUID storage name; not relevant to client |
| `filePath` | `Attachment` | Internal server filesystem path; security risk |

These fields are used exclusively by the server for disk I/O and are treated as implementation details.

---

## 14. Attachment Soft Removal — Detailed Behavior

Soft removal is an **audited, state-changing action** requiring explicit confirmation via the mandatory removal reason. It is an intentional, documented action and is not reversible through the API.

**Before removal** (`isRemoved = false`):
- Metadata accessible at `GET /api/attachments/:attachmentId`: Yes
- File downloadable at `GET /api/attachments/:attachmentId/download`: Yes
- Active attachment count: Counts toward the 5-attachment limit.

**After removal** (`isRemoved = true`):
- Metadata accessible at `GET /api/attachments/:attachmentId`: Yes — Full audit record retained (`originalFileName`, `mimeType`, `fileSizeBytes`, `removedAt`, `removalReason`).
- File downloadable at `GET /api/attachments/:attachmentId/download`: No — Returns `404 Not Found`.
- Active attachment count: Does **not** count toward the 5-attachment limit.

**What is persisted upon removal**:
- `isRemoved` set to `true`
- `removedAt` set to current UTC timestamp
- `removedById` set to requester ID from `x-requester-id` (retained internally; not exposed in API responses)
- `removalReason` set to trimmed, validated string (5–255 chars)

**Database record retention**: Soft removal does not delete the `Attachment` database record. The metadata required by the Lab 2 audit contract remains available after removal. Physical file management (deletion of the stored file from the filesystem) may occur safely without affecting database audit retention.

---

## 15. Out-of-Scope — Excluded Endpoints

The following endpoints, features, and behaviors are **explicitly excluded** from Lab 2 and must not be implemented:

| Excluded Item | Deferred To |
| :--- | :--- |
| Authentication: login, logout, session, JWT, passwords, cookies | Lab 3 |
| `POST /api/auth/login` or similar | Lab 3 |
| `GET /api/users/me` or authenticated identity endpoints | Lab 3 |
| IT Staff ticket queue: `GET /api/staff/tickets` | Lab 3 |
| Ticket ownership assignment: `PATCH /api/tickets/:id/assign` | Lab 3 |
| IT Priority field on any endpoint | Lab 3 |
| Status transition: `PATCH /api/tickets/:id/status` | Lab 3 |
| Comments / internal notes: `POST /api/tickets/:id/comments` | Lab 3 |
| Administration: category/system/user management APIs | Lab 3+ |
| `DELETE` on any resource (hard delete) | Not planned |
| Batch attachment upload (multiple files in one multipart request) | Not planned |

---

## 16. Conflicts Resolved from `specification.md`

The following items in `docs/lab-02/specification.md` conflict with the final approved API contract documented here. This API specification takes precedence. `specification.md` should be corrected separately to align.

### 16.1 Development Requester Endpoint Name

| Document | Value |
| :--- | :--- |
| `specification.md §8.1` | `GET /api/dev-requesters` |
| **This API contract (final)** | `GET /api/development-requesters` |

**Resolution**: Use `/api/development-requesters` throughout all implementation and documentation.

### 16.2 Ticket Creation — Multipart vs. JSON

| Document | Value |
| :--- | :--- |
| `specification.md §8.2` | `POST /api/tickets` supports "optional multipart file uploads for initial attachments" |
| **This API contract (final)** | `POST /api/tickets` accepts `application/json` only; initial attachments are uploaded separately via `POST /api/tickets/:ticketId/attachments` |

**Resolution**: Use separate JSON + attachment requests. The Ticket is created first; attachments follow independently.

### 16.3 List Response Envelope Key

| Document | Value |
| :--- | :--- |
| `specification.md §8.2` | Ticket list response uses `{ data: [...], pagination: { ... } }` |
| **This API contract (final)** | All list responses use `{ items: [...], pagination: { ... } }` |

**Resolution**: Use `items` as the array key for all list response envelopes, consistent with reference data endpoints.

### 16.4 Repeat-Removal Behavior

| Document | Value |
| :--- | :--- |
| `specification.md §8.3` | Soft removal returns `404 Not Found` if already removed |
| **This API contract (final)** | Repeat removal returns `409 Conflict` with code `ALREADY_REMOVED` |

**Resolution**: Use `409 Conflict`. `404` would be misleading since the attachment exists; `409` accurately communicates a state conflict.

---

## 17. Assumptions and Decisions

### 17.1 Single-File Upload per Request

One file per `POST /api/tickets/:ticketId/attachments` request. The frontend queues multiple files and sends sequential requests. This simplifies server-side validation (one clear error response per file) and is sufficient for the MVP use case.

### 17.2 Inactive Related Systems Rejected at Ticket Creation

If a `relatedSystemId` refers to a Related System where `isActive = false`, the request is rejected with `400 VALIDATION_ERROR`. The frontend already filters inactive systems from the creation form dropdown; this server-side check defends against direct API calls.

### 17.3 Category Validation at Ticket Creation

`categoryId` is validated against the seeded Category table. Any non-existent `categoryId` is rejected with `400 VALIDATION_ERROR`. Categories do not have an `isActive` field; all seeded categories are valid.

### 17.4 `requesterId` in Ticket Creation Response

The `POST /api/tickets` response includes `requesterId` to confirm which requester was assigned. The frontend must not use this field for identity decisions; the current requester context is always `x-requester-id`.

### 17.5 `updatedAt` Behavior

The `Ticket.updatedAt` field is managed by Prisma's `@updatedAt` annotation and updates automatically on any field mutation.

- At ticket creation, `updatedAt` initially equals `createdAt`.
- A successful attachment upload updates the parent Ticket's `updatedAt`.
- A successful attachment soft removal updates the parent Ticket's `updatedAt`.

This ensures the My Tickets "Last Updated" column reflects attachment activity during Lab 2.

### 17.6 Attachment Metadata Endpoint Purpose

`GET /api/attachments/:attachmentId` exists to explicitly demonstrate the soft-removal audit contract: metadata is retained after removal while file access is blocked. This endpoint may also be used by the frontend to verify the state of a specific attachment without re-fetching the full Ticket Detail.

### 17.7 Raw Audit IDs Not in API Responses

The database retains `uploadedById` and `removedById` on the `Attachment` record for internal audit purposes. Neither field is included in any Lab 2 Requester-facing API response:

- `uploadedById` — stored in DB; not exposed.
- `removedById` — stored in DB upon soft removal; not exposed.

The Requester-facing UI has no use for raw requester ID values of uploaders or removers. These fields are available for internal audit queries only.
