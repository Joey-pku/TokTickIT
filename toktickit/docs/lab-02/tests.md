# Lab 2 Test Plan

**Document status**: Approved pre-implementation test plan  
**Engineering contracts**: `specification.md`, `ui-spec.md`, `api-spec.md`  
**Last updated**: 2026-09-05

---

## Table of Contents

1. [Test Infrastructure](#1-test-infrastructure)
2. [Test ID Naming Scheme](#2-test-id-naming-scheme)
3. [AC to Test ID Traceability Matrix](#3-ac-to-test-id-traceability-matrix)
4. [Planned Tests by File](#4-planned-tests-by-file)
5. [Visual and Manual Evidence Checklist](#5-visual-and-manual-evidence-checklist)
6. [Lab 1 Regression Coverage](#6-lab-1-regression-coverage)
7. [Test Execution Commands](#7-test-execution-commands)
8. [Summary Statistics](#8-summary-statistics)

---

## 1. Test Infrastructure

### 1.1 Tools and Versions

| Layer | Tool | Version (from package.json) | Config file |
|---|---|---|---|
| Server API integration | Vitest + Supertest | vitest ^2.1.8 / supertest ^7.0.0 | `server/vitest.config.ts` |
| Client UI / component | Vitest + React Testing Library + jsdom | vitest ^2.1.8 / @testing-library/react ^16.1.0 | `client/vite.config.ts` (test block) |
| Client setup | @testing-library/jest-dom | ^6.6.3 | `client/tests/setup.ts` |
| E2E | **@playwright/test** | **Not yet installed - must be added** | `playwright.config.ts` (to be created) |

### 1.2 Test File Locations

```
toktickit/
├── server/
│   └── tests/
│       ├── lab-01/                          <- existing Lab 1 tests (do not modify)
│       └── lab-02/                          <- Lab 2 API integration tests
│           ├── development-requesters.api.test.ts
│           ├── create-ticket.api.test.ts
│           ├── my-tickets.api.test.ts
│           ├── ticket-detail.api.test.ts
│           └── attachments.api.test.ts
├── client/
│   └── tests/
│       ├── lab-01/                          <- existing Lab 1 tests (do not modify)
│       └── lab-02/                          <- Lab 2 UI component tests
│           ├── RequesterSelector.test.tsx
│           ├── CreateTicket.test.tsx
│           ├── MyTickets.test.tsx
│           ├── RequesterTicketDetail.test.tsx
│           └── AttachmentSection.test.tsx
└── e2e/
    └── lab-02/                              <- Lab 2 E2E tests (new directory)
        └── requester-ticket-flow.spec.ts
```

### 1.3 Test Database Strategy (D-01)

**Decision**: API integration tests must use a dedicated, isolated test database via `TEST_DATABASE_URL`.

**Rules**:

- API tests must **never** connect to the developer's normal `DATABASE_URL`.
- The test database is seeded once with reference data (Categories, Related Systems, Development Requesters) using the project's idempotent `seed.ts` before the test suite runs.
- Tests that create Tickets or Attachments must clean up the mutable records they created in `afterEach` or `afterAll` blocks — scoped to the isolated test database only.
- Destructive cleanup (e.g., `prisma.ticket.deleteMany()`) against the normal development database is **strictly prohibited**.
- The Prisma client used in tests must be initialized with `process.env.TEST_DATABASE_URL`.

**Required environment variable** (add to `server/.env.test`):

```
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/toktickit_test"
```

**Required vitest setup**: load `.env.test` before tests run via `envFile` in vitest config, or via `dotenv` in a global setup file.

### 1.4 Attachment Filesystem Strategy (D-02)

**Decision**: API integration tests must use an isolated test upload directory, separate from the development upload directory.

**Rules**:

- The implementation must support a configurable upload directory (e.g., via `UPLOAD_DIR` environment variable).
- API tests configure `UPLOAD_DIR` to a temporary test directory (e.g., `server/test-uploads/`) before the suite runs.
- `afterEach` cleanup deletes physical files written during each test by unlinking the `storedFileName` path within the test upload directory.
- `afterAll` cleanup removes the test upload directory entirely.
- The developer's normal `server/uploads/attachments/` directory is **never touched by tests**.

### 1.5 E2E Data Strategy (D-03)

**Decision**: E2E tests rely on seeded reference data; each test creates its own mutable state.

**Rules**:

- Development Requesters, Categories, and Related Systems are established by the project's idempotent `seed.ts` before E2E runs. There are no Lab 2 APIs to create them.
- Each E2E test creates the Ticket and Attachment state it needs through the UI journey or via direct API calls in a `beforeEach` setup step.
- E2E tests must not depend on Ticket or Attachment state left behind by another test.
- After each E2E test, mutable Ticket/Attachment state created by that test is cleaned up via the test database Prisma client in a teardown hook.

### 1.6 Required Infrastructure Additions

The following must be added by the implementation before tests can run:

| Item | Description | Priority |
|---|---|---|
| `@playwright/test` package | Install in repo root or dedicated `e2e/` workspace | **Required for E2E** |
| `playwright.config.ts` | Configure baseURL, viewport defaults, reporter | **Required for E2E** |
| `e2e/` directory | Alongside `server/` and `client/` | **Required for E2E** |
| `server/.env.test` | `TEST_DATABASE_URL` and `UPLOAD_DIR` for test isolation | **Required for API tests** |
| Test DB setup script | Creates and migrates the test database | **Required for API tests** |
| Configurable upload directory | Implementation must read `UPLOAD_DIR` from env | **Required for attachment tests** |

---

## 2. Test ID Naming Scheme

### Format

```
[LAYER]-[AREA]-[NNN]
```

### Layers

| Code | Meaning |
|---|---|
| `API` | Server-side API integration test (Vitest + Supertest) |
| `UI` | Client component test (Vitest + RTL + jsdom) |
| `E2E` | End-to-end browser test (Playwright) |
| `VIS` | Visual / manual evidence (screenshot or checklist item) |
| `UNIT` | Pure unit test for an isolated utility function |

### Areas

| Code | Meaning |
|---|---|
| `GEN` | General / infrastructure / Lab 1 regression |
| `REQ` | Development Requester context |
| `TCK` | Create Ticket |
| `LST` | My Tickets (list, search, filter, sort, pagination) |
| `DTL` | Ticket Detail |
| `ATT` | Attachment lifecycle (upload, download, soft removal) |

### Examples

```
API-REQ-001   GET /api/development-requesters returns 4 active requesters
API-ATT-029   PATCH remove repeated returns 409 ALREADY_REMOVED
UI-LST-006    MyTickets search debounce fires after 300 ms of inactivity
E2E-001       Full journey: select requester to create ticket to My Tickets to Detail
VIS-007       Mobile screenshot - My Tickets card layout, no horizontal scroll
```

---

## 3. AC to Test ID Traceability Matrix

Every AC from `specification.md` is mapped to at least one planned test or evidence item.
ACs requiring partial manual/visual evidence are noted in the final column.

| AC | Description | Test IDs | Types | Manual evidence? |
|---|---|---|---|---|
| AC-01 | Active requester display (4 active, 1 excluded) | API-REQ-001, API-REQ-003, UI-REQ-002, UI-REQ-003 | API, UI | No |
| AC-02 | Route guard redirect when no requester selected | UI-REQ-008, E2E-001 | UI, E2E | No |
| AC-03 | Requester selection persists across browser refresh | UI-REQ-010, E2E-001 | UI, E2E | No |
| AC-04 | Requester switching reloads data | UI-REQ-010, E2E-003 | UI, E2E | No |
| AC-05 | Successful ticket creation | API-TCK-001 to API-TCK-005, E2E-001 | API, E2E | No |
| AC-06 | Summary validation (too short / too long) | API-TCK-007 to API-TCK-011, UI-TCK-005, UI-TCK-006 | API, UI | No |
| AC-07 | Description validation | API-TCK-012 to API-TCK-015, UI-TCK-007 | API, UI | No |
| AC-08 | Duplicate submission prevention (busy button) | UI-TCK-010 | UI | No |
| AC-09 | API failure form data preservation | UI-TCK-011 | UI | No |
| AC-10 | Ticket created with valid attachments | API-ATT-001 to API-ATT-004, E2E-002 | API, E2E | No |
| AC-11 | Partial attachment failure handling | UI-TCK-016 | UI | No |
| AC-12 | Ownership isolation in ticket list | API-LST-001, API-LST-002 | API | No |
| AC-13 | Search by ticket number and summary | API-LST-014, API-LST-015, UI-LST-006, UI-LST-007 | API, UI | No |
| AC-14 | Filter by category, priority, status | API-LST-017 to API-LST-020, UI-LST-013 | API, UI | No |
| AC-15 | Clear Filters reset | UI-LST-009 | UI | No |
| AC-16 | Pagination controls | API-LST-004 to API-LST-009, UI-LST-010, UI-LST-011 | API, UI | No |
| AC-17 | Empty state display | UI-LST-003, E2E-009 | UI, E2E | No |
| AC-18 | No-results state display | API-LST-016, UI-LST-004 | API, UI | No |
| AC-19 | Owned ticket detail view (all fields) | API-DTL-001, UI-DTL-001, E2E-001 | API, UI, E2E | No |
| AC-20 | Cross-requester ticket detail rejection | API-DTL-004, E2E-004 | API, E2E | No |
| AC-21 | Supplementary attachment upload | API-ATT-001, API-ATT-005, E2E-005 | API, E2E | No |
| AC-22 | Invalid file type rejected | API-ATT-006, API-ATT-009, UI-ATT-009 | API, UI | No |
| AC-23 | File over 5 MB rejected | API-ATT-007, UI-ATT-010 | API, UI | No |
| AC-24 | Active attachment limit (max 5) | API-ATT-010, UI-ATT-008 | API, UI | No |
| AC-25 | Active attachment download | API-ATT-015, E2E-005 | API, E2E | No |
| AC-26 | Soft removal with mandatory reason | API-ATT-019, API-ATT-021, E2E-006 | API, E2E | No |
| AC-27 | Removal reason validation | API-ATT-024 to API-ATT-027, UI-ATT-005, UI-ATT-006 | API, UI | No |
| AC-28 | Removed attachment download blocked | API-ATT-016, E2E-006 | API, E2E | No |
| AC-29 | Cross-requester attachment rejection | API-ATT-017, API-ATT-029 | API | No |
| AC-30 | Mobile responsive adaptation | E2E-008, VIS-007, VIS-008, VIS-009, VIS-012 | E2E, VIS | Partial |
| AC-31 | Tablet layout | E2E-010, VIS-010, VIS-011 | E2E, VIS | Partial |
| AC-32 | Keyboard navigation and focus | E2E-001, VIS-002 | E2E, VIS | Partial |

---

## 4. Planned Tests by File

Each entry specifies: Test ID - Scenario - Expected Result - Requirements

---

### 4.1 `server/tests/lab-02/development-requesters.api.test.ts`

**Setup**: Connect to test DB; confirm seed data present.  
**Note**: This endpoint does not require `x-requester-id`.

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| API-REQ-001 | `GET /api/development-requesters` valid call | 200; body is an object with `items` array of 4 objects | FR-01, AC-01 |
| API-REQ-002 | Response shape of each object | Each item has exactly `{ id, name, department }` with correct types | FR-01 |
| API-REQ-003 | Inactive requester excluded | Inactive requester ID is NOT present in the `items` array | FR-01, BR-04, AC-01 |
| API-REQ-004 | All 4 active requesters present | All four active seed requesters appear by name in `items` | AC-01 |

---

### 4.2 `server/tests/lab-02/create-ticket.api.test.ts`

**Setup**: Connect to test DB; use a known active requester ID from seed.  
**Cleanup**: `afterEach` deletes tickets created during the test from test DB.

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| API-TCK-001 | `POST /api/tickets` with valid body and valid `x-requester-id` | 201; body includes `id`, `ticketNumber`, `createdAt`, `updatedAt`, `currentStatus`, `summary`, `description`, `requesterId` | FR-08, AC-05 |
| API-TCK-002 | Ticket Number format | `ticketNumber` matches `/^TKT-\d{4}-\d{6}$/`; do not hardcode year | BR-01, AC-05, D-06 |
| API-TCK-003 | Initial status is NEW | `currentStatus === "NEW"` | BR-02, AC-05 |
| API-TCK-004 | `requesterId` equals header value | `requesterId` equals the integer value of `x-requester-id` header | BR-25 |
| API-TCK-005 | `updatedAt` equals `createdAt` at creation | `createdAt === updatedAt` in the 201 response | api-spec section 8.4 |
| API-TCK-006 | Ticket Numbers are unique across two creations | Create two tickets; their `ticketNumber` values differ | BR-01, D-06 |
| API-TCK-007 | Missing `summary` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-08, AC-06 |
| API-TCK-008 | `summary` length 4 (below minimum of 5) | 400; `error.code` is `"VALIDATION_ERROR"` | BR-08, AC-06 |
| API-TCK-009 | `summary` length 101 (above maximum of 100) | 400; `error.code` is `"VALIDATION_ERROR"` | BR-08, AC-06 |
| API-TCK-010 | Whitespace-only `summary` | 400 after trimming; `error.code` is `"VALIDATION_ERROR"` | BR-07, BR-08, AC-06 |
| API-TCK-011 | `summary` trimmed before persistence | Summary with leading/trailing spaces stored without them | BR-07 |
| API-TCK-012 | Missing `description` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-09, AC-07 |
| API-TCK-013 | `description` length 9 (below minimum of 10) | 400; `error.code` is `"VALIDATION_ERROR"` | BR-09, AC-07 |
| API-TCK-014 | `description` length 2001 (above maximum of 2000) | 400; `error.code` is `"VALIDATION_ERROR"` | BR-09, AC-07 |
| API-TCK-015 | Whitespace-only `description` | 400 after trimming; `error.code` is `"VALIDATION_ERROR"` | BR-07, BR-09, AC-07 |
| API-TCK-016 | Missing `categoryId` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-11 |
| API-TCK-017 | Invalid `categoryId` (nonexistent in DB) | 400; `error.code` is `"VALIDATION_ERROR"` | BR-11 |
| API-TCK-018 | Missing `relatedSystemId` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-11 |
| API-TCK-019 | Inactive `relatedSystemId` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-11 |
| API-TCK-020 | Invalid `requestedPriority` value (e.g., `"CRITICAL"`) | 400; `error.code` is `"VALIDATION_ERROR"` | BR-10 |
| API-TCK-021 | Missing `requestedPriority` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-10 |
| API-TCK-022 | Missing `x-requester-id` header | 400; `error.code` is `"MISSING_REQUESTER_CONTEXT"` | api-spec section 2 |
| API-TCK-023 | Malformed `x-requester-id` (non-numeric string) | 400; `error.code` is `"INVALID_REQUESTER_ID"` | api-spec section 2 |
| API-TCK-024 | Inactive requester `x-requester-id` obtained via Prisma test fixture | 404; `error.code` is `"REQUESTER_NOT_FOUND"` | api-spec section 2, D-07 |
| API-TCK-025 | Nonexistent requester `x-requester-id` (e.g., 999999) | 404; `error.code` is `"REQUESTER_NOT_FOUND"` | api-spec section 2 |
| API-TCK-026 | Server-controlled fields (`ticketNumber`, `currentStatus`, `createdAt`, `id`, `updatedAt`, `requesterId`, `attachments`) in request body | 400; `error.code` is `"VALIDATION_ERROR"` | BR-01, BR-02 |
| API-TCK-027 | Unknown future fields in request body | 400; `error.code` is `"VALIDATION_ERROR"` | BR-01, BR-02 |

---

### 4.3 `server/tests/lab-02/my-tickets.api.test.ts`

**Setup**: Connect to test DB; use 2 active requester IDs from seed; create known tickets for each.  
**Cleanup**: `afterEach` deletes tickets created during the test from test DB.

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| API-LST-001 | `GET /api/tickets` returns only requester-owned tickets | All items in `items[]` have `requesterId` matching `x-requester-id` | FR-14, BR-05, AC-12 |
| API-LST-002 | Requester B cannot see Requester A tickets | With Requester B header, none of Requester A tickets appear | BR-05, AC-12 |
| API-LST-003 | Response envelope shape | Body is `{ items: [...], pagination: { page, pageSize, totalItems, totalPages } }` | api-spec section 8.2 |
| API-LST-004 | Default pagination (no query params) | `page=1`, `pageSize=10` applied; at most 10 tickets returned | BR-23, AC-16 |
| API-LST-005 | `totalItems` is accurate | `pagination.totalItems` equals total tickets owned by requester | AC-16 |
| API-LST-006 | `pageSize=25` returns up to 25 items | Items length is at most 25 | BR-23 |
| API-LST-007 | `page` beyond last page | 200; `items: []` with correct `pagination` totals (`totalItems=0` -> `totalPages=0`) | BR-23 |
| API-LST-008 | Invalid `pageSize` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-23 |
| API-LST-009 | Invalid `page` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-23 |
| API-LST-010 | Default sort is `createdAt DESC` | Most recently created ticket is first in `items`; deterministic secondary sort `id DESC` | BR-23, FR-17 |
| API-LST-011 | `sortBy=ticketNumber&sortOrder=asc` | Items in ascending ticketNumber order | FR-17 |
| API-LST-012 | `sortBy=updatedAt&sortOrder=desc` | Items ordered by descending `updatedAt` | FR-17 |
| API-LST-013 | Invalid `sortBy` or `sortOrder` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-23 |
| API-LST-014 | `search` matches ticket number substring case-insensitively | Only tickets whose `ticketNumber` contains the substring returned | FR-15, BR-22, AC-13 |
| API-LST-015 | `search` matches summary substring case-insensitively | Only tickets whose `summary` contains the substring returned | FR-15, BR-22, AC-13 |
| API-LST-016 | `search` with no matching tickets | `items: []`, `totalItems: 0`, `totalPages: 0` | AC-18 |
| API-LST-017 | Filter by `categoryId` | Only tickets with matching `categoryId` returned | FR-16, AC-14 |
| API-LST-018 | Filter by `requestedPriority` | Only tickets with matching `requestedPriority` returned | FR-16, AC-14 |
| API-LST-019 | Filter by `status=NEW` | Only tickets with `currentStatus === "NEW"` returned | FR-16 |
| API-LST-020 | Combined `search` + `categoryId` filter | Result is intersection of both constraints | FR-15, FR-16, AC-14 |
| API-LST-021 | Omitted `categoryId`, `requestedPriority`, `status` | No filtering applied (represents "All") | FR-16 |
| API-LST-022 | Invalid `categoryId`, `requestedPriority`, or `status` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-23 |
| API-LST-023 | Missing `x-requester-id` | 400; `error.code` is `"MISSING_REQUESTER_CONTEXT"` | api-spec section 2 |
| API-LST-024 | Inactive/nonexistent requester `x-requester-id` | 404; `error.code` is `"REQUESTER_NOT_FOUND"` | api-spec section 2, D-07 |

---

### 4.4 `server/tests/lab-02/ticket-detail.api.test.ts`

**Setup**: Connect to test DB; create owned ticket with attachments for test requester.  
**Cleanup**: `afterEach` deletes created tickets and attachments from test DB.

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| API-DTL-001 | `GET /api/tickets/:ticketId` for owned ticket | 200; body includes `id`, `ticketNumber`, `createdAt`, `updatedAt`, `currentStatus`, `summary`, `description`, `requesterId`, `categoryId`, `relatedSystemId`, and `attachments[]` | FR-20, AC-19 |
| API-DTL-002 | Attachment list included in detail | `attachments[]` array present; each item has `id`, `originalFileName`, `fileSizeBytes`, `mimeType`, `isRemoved`, `createdAt`, and conditionally `removedAt`, `removalReason` | FR-22, AC-19 |
| API-DTL-003 | Nonexistent ticket ID | 404; `error.code` is `"TICKET_NOT_FOUND"` | FR-21, AC-20 |
| API-DTL-004 | Cross-requester ticket (owned by another requester) | 404; `error.code` is `"TICKET_NOT_FOUND"` | BR-24, FR-21, AC-20 |
| API-DTL-005 | Missing `x-requester-id` | 400; `error.code` is `"MISSING_REQUESTER_CONTEXT"` | api-spec section 2 |
| API-DTL-006 | Soft-removed attachment retained in response | Removed attachment appears in `attachments[]` with `isRemoved: true`, `removedAt`, and `removalReason` set | BR-17, BR-19, FR-22 |

---

### 4.5 `server/tests/lab-02/attachments.api.test.ts`

**Setup**: Connect to test DB and isolated test upload directory; create an owned ticket before each test.  
**Cleanup**: `afterEach` deletes created attachments from test DB and unlinks uploaded files from test upload directory.

#### Upload Tests (`POST /api/tickets/:ticketId/attachments`)

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| API-ATT-001 | Upload valid JPEG to owned ticket | 201; metadata includes `id`, `originalFileName`, `fileSizeBytes`, `mimeType`, `isRemoved: false`, `createdAt` | FR-24, AC-21 |
| API-ATT-002 | Upload valid PNG | 201 | BR-14, AC-22 |
| API-ATT-003 | Upload valid WEBP | 201 | BR-14 |
| API-ATT-004 | Upload valid PDF | 201 | BR-14, AC-10 |
| API-ATT-005 | `Ticket.updatedAt` increases after successful upload | Fetch ticket before and after upload; post-upload `updatedAt` is strictly later | api-spec section 17.5, AC-21 |
| API-ATT-006 | Upload unsupported extension (e.g., `.exe`, `.docx`) | 415; standard error envelope | BR-14, AC-22 |
| API-ATT-007 | Upload file over 5 MB (5,242,880 bytes) | 413; standard error envelope | BR-15, AC-23 |
| API-ATT-008 | Upload file exactly 5 MB (boundary) | 201 | BR-15 |
| API-ATT-009 | Missing/malformed upload request | 400; standard error envelope | BR-14 |
| API-ATT-010 | Upload to ticket already at 5 active attachments | 409; standard error envelope | BR-16, AC-24 |
| API-ATT-011 | Upload to unowned (cross-requester) ticket | 404; `error.code` is `"TICKET_NOT_FOUND"` | BR-05, FR-27 |
| API-ATT-012 | Upload to nonexistent ticket | 404; `error.code` is `"TICKET_NOT_FOUND"` | FR-24 |
| API-ATT-013 | `storedFileName` not in response | Response body does not contain `storedFileName` | api-spec section 17.7 |
| API-ATT-014 | Internal storage path not in response | Response body does not contain `filePath`, `storagePath`, etc. | api-spec section 17.7 |

#### Download Tests (`GET /api/attachments/:attachmentId/download`)

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| API-ATT-015 | Download active owned attachment | 200; correct `Content-Type`; `Content-Disposition: attachment; filename="..."`; `Content-Length` matches; returned bytes equal uploaded bytes | FR-23, AC-25 |
| API-ATT-016 | Download soft-removed attachment | 404; standard error envelope | BR-19, FR-26, AC-28 |
| API-ATT-017 | Download attachment from another requester's ticket | 404; `error.code` is `"ATTACHMENT_NOT_FOUND"` | BR-24, FR-27, AC-29 |
| API-ATT-018 | Download nonexistent attachment ID | 404; `error.code` is `"ATTACHMENT_NOT_FOUND"` | FR-23 |

#### Soft Removal Tests (`PATCH /api/attachments/:attachmentId/remove`)

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| API-ATT-019 | Soft remove active attachment with valid reason | 200; `isRemoved: true`, `removedAt` set, `removalReason` stored | FR-25, AC-26 |
| API-ATT-020 | Removed attachment no longer counts toward active limit | After removing 1 of 5, uploading a new one succeeds with 201 | BR-17 |
| API-ATT-021 | `Ticket.updatedAt` increases after successful removal | Fetch ticket before and after removal; post-removal `updatedAt` is strictly later | api-spec section 17.5, AC-26 |
| API-ATT-022 | `uploadedById` not in response | Response body has no `uploadedById` | api-spec section 17.7 |
| API-ATT-023 | `removedById` not in response | Response body has no `removedById` | api-spec section 17.7 |
| API-ATT-024 | Missing `removalReason` | 400; `error.code` is `"VALIDATION_ERROR"` | BR-18, AC-27 |
| API-ATT-025 | `removalReason` length 4 (below minimum of 5) | 400; `error.code` is `"VALIDATION_ERROR"` | BR-18, AC-27 |
| API-ATT-026 | `removalReason` length 256 (above maximum of 255) | 400; `error.code` is `"VALIDATION_ERROR"` | BR-18, AC-27 |
| API-ATT-027 | Whitespace-only `removalReason` | 400 after trimming; `error.code` is `"VALIDATION_ERROR"` | BR-07, BR-18, AC-27 |
| API-ATT-028 | Repeat soft removal of already-removed attachment | 409; `error.code` is `"ALREADY_REMOVED"` | api-spec section 10.5, AC-26 |
| API-ATT-029 | Remove attachment from another requester's ticket | 404; `error.code` is `"ATTACHMENT_NOT_FOUND"` | BR-24, FR-27, AC-29 |
| API-ATT-030 | Remove nonexistent attachment | 404; `error.code` is `"ATTACHMENT_NOT_FOUND"` | FR-25 |

#### Attachment Metadata Endpoint Tests (`GET /api/attachments/:attachmentId`)

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| API-ATT-031 | `GET /api/attachments/:attachmentId` for owned active attachment | 200; metadata includes `id`, `originalFileName`, `fileSizeBytes`, `mimeType`, `isRemoved: false`, `createdAt` | api-spec section 11 |
| API-ATT-032 | `GET /api/attachments/:attachmentId` for owned soft-removed attachment | 200; `isRemoved: true`, `removedAt`, `removalReason` visible (metadata remains retrievable) | api-spec section 11, BR-17 |
| API-ATT-033 | `GET /api/attachments/:attachmentId` for unowned attachment | 404; `error.code` is `"ATTACHMENT_NOT_FOUND"` | api-spec section 11, BR-24 |
| API-ATT-034 | `GET /api/attachments/:attachmentId` for nonexistent attachment | 404; `error.code` is `"ATTACHMENT_NOT_FOUND"` | api-spec section 11 |
| API-ATT-035 | Internal fields are not exposed in metadata | Response does not expose `storedFileName`, `filePath`, `uploadedById`, or `removedById` | api-spec section 11 |

---

### 4.6 `client/tests/lab-02/RequesterSelector.test.tsx`

**Approach**: Mock API calls with `vi.spyOn` following the Lab 1 `App.test.tsx` pattern.

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| UI-REQ-001 | Renders loading indicator while API fetch is in progress | Loading state element is in document | FR-01 |
| UI-REQ-002 | On success - dropdown renders active requesters | Dropdown contains options corresponding to mocked response | FR-02, AC-01 |
| UI-REQ-003 | Inactive requester NOT in dropdown | Inactive requester name absent from dropdown options | BR-04, AC-01 |
| UI-REQ-004 | On API failure - user-facing error message | Text "Unable to load Development Requesters. Please try again." is in document | ui-spec section 4.3 |
| UI-REQ-005 | Retry button visible on failure | Button with name "Retry" is in document | ui-spec section 4.3 |
| UI-REQ-006 | Retry button re-triggers API call | Clicking Retry causes another fetch attempt | ui-spec section 4.3 |
| UI-REQ-007 | Empty state when no active requesters returned | User-facing message "No active Development Requesters are available. Please contact the development team." visible | ui-spec section 4.2 |
| UI-REQ-008 | Continue button disabled when no requester selected | Continue button has `disabled` attribute | FR-04, AC-02 |
| UI-REQ-009 | Continue button enabled after selection | After selecting a requester, Continue button is enabled | FR-02, FR-04 |
| UI-REQ-010 | Continue stores selected requester ID in localStorage | `localStorage.getItem("toktickit_selected_requester_id")` equals selected ID | FR-03, AC-03 |
| UI-REQ-011 | Cancel button is present | Button or link with name "Cancel" is in document | ui-spec section 6.2 |
| UI-REQ-012 | "Authentication coming in Lab 3" notice present | Text "Authentication coming in Lab 3" is in document | ui-spec section 6.2 |
| UI-REQ-013 | Dropdown has accessible label | Dropdown element has an associated visible label or `aria-label` | FR-29, AC-32 |

---

### 4.7 `client/tests/lab-02/CreateTicket.test.tsx`

**Approach**: Mock API calls. Pre-seed component with an active requester context from localStorage.

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| UI-TCK-001 | Ticket Number field shows "Generated after submission" before submission | Element with that text is present | ui-spec section 5.1 |
| UI-TCK-002 | Ticket Date field shows "Assigned after submission" before submission | Element with that text is present | ui-spec section 5.1 |
| UI-TCK-003 | Requester field shows actual requester name | Selected requester name rendered in read-only Requester field | FR-07, ui-spec section 5.1 |
| UI-TCK-004 | Required field markers present | Mandatory fields have required markers or `aria-required="true"` | FR-09 |
| UI-TCK-005 | Summary too short - field-level error below input | Error message appears directly beneath the Summary input | FR-09, AC-06 |
| UI-TCK-006 | Summary too long - field-level error below input | Error message appears directly beneath the Summary input | FR-09, AC-06 |
| UI-TCK-007 | Description too short - field-level error below textarea | Error message appears directly beneath the Description textarea | FR-09, AC-07 |
| UI-TCK-008 | Category not selected - error shown on submit | Category error message present on submit attempt | FR-09 |
| UI-TCK-009 | Related System not selected - error shown on submit | Related System error message present on submit attempt | FR-09 |
| UI-TCK-010 | Submit button disabled and shows "Submitting..." with spinner during in-flight request | Button is `disabled` and displays spinner text during pending API call | BR-12, AC-08 |
| UI-TCK-011 | Form data preserved on API failure | After mocked 500 response, all previously entered field values remain in the form | BR-13, AC-09 |
| UI-TCK-012 | Success state shows backend-generated Ticket Number | After mocked 201 response, displayed Ticket Number matches backend response value | FR-13, AC-05 |
| UI-TCK-013 | Success state provides My Tickets navigation | Link or button to My Tickets visible in success state | FR-13 |
| UI-TCK-014 | Success state provides Ticket Detail navigation | Link or button to the created ticket detail visible in success state | FR-13 |
| UI-TCK-015 | Dropzone shows allowed formats and 5 MB limit | Text containing "JPG", "PNG", "WEBP", "PDF" and "5 MB" visible in attachment section | FR-11, BR-14, BR-15 |
| UI-TCK-016 | Failed attachment reported with retry affordance | After mocked attachment upload failure, UI identifies the failed file and provides retry path via Ticket Detail | FR-12, BR-21, AC-11 |

---

### 4.8 `client/tests/lab-02/MyTickets.test.tsx`

**Approach**: Mock API calls. Test all UI states with mocked responses.

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| UI-LST-001 | Renders loading indicator while fetching | Loading element present in document | FR-19 |
| UI-LST-002 | Renders ticket list on success | Ticket rows or cards visible; ticket numbers, summaries, status badges rendered | FR-14, FR-19 |
| UI-LST-003 | Renders empty state when 0 tickets | Dedicated empty-state container visible with prompt to create first ticket | FR-19, AC-17 |
| UI-LST-004 | Renders no-results state when search yields empty | "No tickets match your filters" message and "Clear Filters" button visible | FR-19, AC-18 |
| UI-LST-005 | Renders error state on API failure | Error message visible; no ticket data shown | FR-19 |
| UI-LST-006 | Search input debounces - API called after 300 ms of inactivity | Typing triggers no immediate fetch; API fetch fires after simulated 300 ms pause | ui-spec section 8.3 |
| UI-LST-007 | Pressing Enter in search triggers immediate fetch | Enter fires fetch before 300 ms debounce expires | ui-spec section 8.3 |
| UI-LST-008 | Changing search/filter resets pagination to page 1 | After new search term, page resets to 1 before new fetch | ui-spec section 8.3 |
| UI-LST-009 | Clear Filters resets all dropdowns and search input | After clicking "Clear Filters": search is empty, all dropdowns show "ALL" | FR-16, AC-15 |
| UI-LST-010 | Pagination shows "Showing X to Y of Z tickets" | Footer text matches expected range from mocked pagination data | FR-18, AC-16 |
| UI-LST-011 | Next/Prev pagination controls navigate pages | Clicking Next increments page; Clicking Prev decrements page | FR-18, AC-16 |
| UI-LST-012 | Mobile viewport: table collapses to card layout (structural conditional rendering only) | If component explicitly uses structural logic, verify conditional elements render | FR-28, AC-30 |
| UI-LST-013 | Category filter dropdown contains "ALL" option | Dropdown renders an "ALL" option as first/default item. Verify the API request *omits* the parameter instead of sending literal "ALL". | FR-16 |
| UI-LST-014 | Filter and search controls have accessible labels | Each filter input has an associated label or `aria-label` | FR-29, AC-32 |
| UI-LST-015 | "+ Create Ticket" button is visible | Primary "+ Create Ticket" button rendered in the header | FR-19 |

---

### 4.9 `client/tests/lab-02/RequesterTicketDetail.test.tsx`

**Approach**: Mock API calls. Render with mocked ticket data including both active and removed attachments.

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| UI-DTL-001 | All required ticket fields rendered | Ticket Number, Ticket Date, Requester, Category, Related System, Requested Priority, Current Status (NEW), Summary, Description all visible | FR-20, AC-19 |
| UI-DTL-002 | Renders error on 404 response | "Ticket not found" or equivalent error message visible when API returns 404 | FR-21, AC-20 |
| UI-DTL-003 | Active attachment shows Download button | Button with accessible name "Download" (or icon with `aria-label`) visible for active attachment | FR-23, AC-25 |
| UI-DTL-004 | Removed attachment does NOT show Download button | Download button absent for removed attachment | BR-19, FR-26 |
| UI-DTL-005 | Removed attachment shows removal reason | Removal reason text rendered for removed attachment | BR-19, FR-22, AC-26 |
| UI-DTL-006 | Attachment count indicator displayed | Text like "Attachments (2/5)" visible | FR-22 |
| UI-DTL-007 | Remove button has accessible label | Remove button has accessible name and is not icon-only without `aria-label` | FR-25, FR-29, AC-32 |
| UI-DTL-008 | "Back to My Tickets" link present | Navigation link or button back to My Tickets is in document | ui-spec section 9 |

---

### 4.10 `client/tests/lab-02/AttachmentSection.test.tsx`

**Approach**: Mock API calls. Test upload dropzone, attachment list rendering, and removal modal.

| Test ID | Scenario | Expected Result | Requirements |
|---|---|---|---|
| UI-ATT-001 | Upload dropzone shows allowed types and size limit | Text contains "JPG", "PNG", "WEBP", "PDF", and "5 MB" | BR-14, BR-15, FR-24 |
| UI-ATT-002 | Active attachment row shows filename, file size, upload date | All three data points rendered per active attachment | FR-22 |
| UI-ATT-003 | Removed attachment has removed indicator | Removed attachment has a "Removed" badge or strikethrough text element | BR-19, FR-22 |
| UI-ATT-004 | Removal modal opens when Remove button clicked | Modal dialog with reason input becomes visible after clicking Remove | FR-25 |
| UI-ATT-005 | Removal modal Confirm disabled when reason is empty | Confirm button has `disabled` attribute when textarea is empty | BR-18, AC-27 |
| UI-ATT-006 | Removal modal shows validation error for reason below 5 chars | Error message visible below the reason textarea | BR-18, AC-27 |
| UI-ATT-007 | Removal modal Confirm button shows busy state during in-flight request | Confirm button is `disabled` and shows spinner during pending API call | BR-12 |
| UI-ATT-008 | Upload control disabled when active attachment count is 5 | Upload button or dropzone is disabled when `activeCount === 5` | BR-16, AC-24 |
| UI-ATT-009 | Invalid file type rejected client-side | Selecting `.exe` or `.docx` shows validation error; no API request made | BR-14, AC-22 |
| UI-ATT-010 | File over 5 MB rejected client-side | Selecting oversized file shows size error; no API request made | BR-15, AC-23 |

---

### 4.11 `e2e/lab-02/requester-ticket-flow.spec.ts`

**Setup**: Playwright configured with `baseURL` pointing to local dev server. Reference data established by `seed.ts` before suite runs. Each scenario creates its own mutable data and cleans up in `afterEach`.

| Test ID | Scenario | Steps | Expected Result | ACs |
|---|---|---|---|---|
| E2E-001 | Full happy path at desktop viewport (>= 992px) | 1. Navigate to app. 2. Select "Jennifer Anderson". 3. Click Continue. 4. Navigate to Create Ticket. 5. Fill all fields. 6. Submit. 7. Verify success banner with Ticket Number in `TKT-YYYY-NNNNNN` format. 8. Navigate to My Tickets. 9. Verify ticket visible. 10. Open Ticket Detail. 11. Verify all fields. 12. Tab through form and verify focus indicators visible via Keyboard. | Each step succeeds; Ticket Number format correct; all detail fields present; keyboard navigation produces visible focus indicators. | AC-02, AC-03, AC-05, AC-19, AC-32 |
| E2E-002 | Create ticket with initial attachment | 1. Select requester. 2. Create ticket via UI. 3. Upload attachment from Ticket Detail. 4. Verify attachment appears with filename and size. 5. Verify active count shows 1/5. | Attachment visible in Ticket Detail. | AC-10, AC-21 |
| E2E-003 | Requester switch isolation | 1. Select Requester A. 2. Create a ticket as Requester A. 3. Navigate to My Tickets; verify ticket visible. 4. Click Change Requester. 5. Select Requester B. | Requester A ticket no longer visible; My Tickets shows only Requester B data. | AC-04 |
| E2E-004 | Cross-requester ticket URL access | 1. Select Requester A. Create ticket; record its ID. 2. Switch to Requester B. 3. Navigate directly to that ticket URL. | "Ticket not found" error displayed; no Requester A data exposed. | AC-20 |
| E2E-005 | Attachment upload and download | 1. Select requester. Create ticket. 2. From Ticket Detail, upload a valid JPEG. 3. Verify active count increments. 4. Click Download. | File download initiated; Content-Disposition header includes original filename. | AC-21, AC-25 |
| E2E-006 | Attachment soft removal - metadata retained, download blocked | 1. Upload attachment to owned ticket. 2. Click Remove. 3. Enter valid reason. 4. Confirm. 5. Verify: active count decrements; removed attachment metadata still visible; Download button absent. 6. Attempt direct download URL; verify 404 response. | Removed attachment shown with reason; download blocked. | AC-26, AC-28 |
| E2E-007 | Search, filter, sort, and pagination flow | 1. Create 3 tickets with distinct summaries. 2. Search for one summary substring; verify only 1 result. 3. Clear search. 4. Apply category filter; verify filtered results. 5. Change sort to Ticket Number ASC; verify order. | Each step yields correct filtered/sorted result. | AC-13, AC-14, AC-15, AC-16 |
| E2E-008 | Mobile viewport smoke test (< 768px) | 1. Set viewport to 375x812. 2. Select requester. 3. Navigate to My Tickets. 4. Verify card layout present (no table rows visible). 5. Verify no horizontal page scroll. 6. Verify all buttons are reachable. | No overflow; cards rendered; all interactive elements accessible at mobile size. | AC-30 |
| E2E-009 | Empty state journey | 1. Navigate to app. 2. Select a requester with 0 tickets. 3. Verify Empty State is visible in My Tickets. | Empty state container visible with prompt to create first ticket. | AC-17 |
| E2E-010 | Tablet layout rendering (768px-991px) | 1. Set viewport to 768x1024. 2. Navigate to Create Ticket. 3. Verify two-column layout renders correctly without horizontal overflow. | Two-column layout renders; no overflow. | AC-31 |

---

## 5. Visual and Manual Evidence Checklist

The following items cannot be reliably automated in Vitest/RTL/Playwright assertions and require screenshot evidence or manual review during visual inspection.

Evidence must be captured and saved to `artifacts/lab-02/screenshots/` during final integration review.

| ID | Item | Context | Evidence Type |
|---|---|---|---|
| VIS-001 | Zen Green primary color (#006B3C) used for header navbar and CTA buttons | Desktop | Screenshot |
| VIS-002 | Zen Green focus ring visible on focused interactive elements after Tab navigation | Desktop | Screenshot |
| VIS-003 | Read-only fields have distinct gray-green background (#F1F5F3) vs editable white fields | Desktop - Create Ticket | Screenshot |
| VIS-004 | Error tone (red #DC2626 / #FEE2E2) correctly applied to field-level errors | Desktop - Create Ticket | Screenshot |
| VIS-005 | Priority badge colors: MEDIUM amber, HIGH red, LOW default correct | Desktop - My Tickets | Screenshot |
| VIS-006 | NEW status badge uses success green tone | Desktop - My Tickets | Screenshot |
| VIS-007 | Mobile My Tickets: ticket cards render without horizontal scroll, no clipping | Mobile 375x812 | Screenshot |
| VIS-008 | Mobile Create Ticket: single-column stack, no horizontal scroll | Mobile 375x812 | Screenshot |
| VIS-009 | Mobile Ticket Detail: all fields readable, attachment section usable | Mobile 375x812 | Screenshot |
| VIS-010 | Tablet Create Ticket: two-column form layout balanced | Tablet 768x1024 | Screenshot |
| VIS-011 | Tablet My Tickets: condensed view with priority badges aligned | Tablet 768x1024 | Screenshot |
| VIS-012 | Touch targets are at minimum 44px height on all interactive elements | Mobile | DevTools ruler / screenshot |
| VIS-013 | Removed attachment visually distinct (strikethrough or muted style) from active | Desktop - Ticket Detail | Screenshot |
| VIS-014 | "Authentication coming in Lab 3" notice callout styled distinctly | Desktop - Requester Selection | Screenshot |
| VIS-015 | Success banner styling: Ticket Number clearly prominent in green success tone | Desktop - after Create Ticket | Screenshot |

---

## 6. Lab 1 Regression Coverage

Lab 2 must not break Lab 1 passing endpoints. These tests are in the existing `server/tests/lab-01/` directory and must continue to pass without modification.

| Test ID | File | Scenario | Expected Result |
|---|---|---|---|
| API-GEN-001 | `server/tests/lab-01/health.test.ts` | `GET /api/health` returns 200 | `{ status: "ok", service: "TokTickIT API" }` |
| API-GEN-002 | `server/tests/lab-01/categories.test.ts` | `GET /api/categories` returns 4 seeded categories | Array of `{ id, name }` in id order |

Client Lab 1 tests must also continue to pass:

| Test ID | File | Scenario | Expected Result |
|---|---|---|---|
| UI-GEN-001 | `client/tests/lab-01/App.test.tsx` | TokTickIT heading renders | Heading text present |
| UI-GEN-002 | `client/tests/lab-01/App.test.tsx` | Success state shows categories | 4 category names visible after system check |
| UI-GEN-003 | `client/tests/lab-01/App.test.tsx` | Failure state shows offline message | "Backend: Offline" message visible |

> **Rule**: Lab 2 implementation must not delete, move, or modify any file under `server/tests/lab-01/` or `client/tests/lab-01/`.

---

## 7. Test Execution Commands

Commands are determinable from existing `package.json` files. Playwright commands assume `playwright.config.ts` at the `toktickit/` level once installed.

### Server API Tests

```bash
# From toktickit/server/
npm test

# Run only Lab 2 API tests
npx vitest run tests/lab-02/
```

### Client UI Tests

```bash
# From toktickit/client/
npm test

# Run only Lab 2 UI tests
npx vitest run tests/lab-02/
```

### E2E Tests (after Playwright is installed)

```bash
# From toktickit/
npx playwright test e2e/lab-02/

# Run with headed browser for debugging
npx playwright test e2e/lab-02/ --headed

# Run at mobile viewport (requires project config in playwright.config.ts)
npx playwright test e2e/lab-02/ --project=mobile
```

### Test Database Setup (one-time, before first API test run)

```bash
# Create and migrate the isolated test database
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/toktickit_test" npx prisma migrate deploy

# Seed reference data into the test database
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/toktickit_test" npm run prisma:seed
```

---

## 8. Summary Statistics

| Test Type | Count |
|---|---|
| API integration (API-REQ, API-TCK, API-LST, API-DTL, API-ATT) | 65 |
| Client UI / component (UI-REQ, UI-TCK, UI-LST, UI-DTL, UI-ATT) | 62 |
| E2E Playwright (E2E) | 10 |
| Visual / manual evidence (VIS) | 15 |
| Lab 1 regression (API-GEN, UI-GEN) | 5 |
| **Total planned items** | **157** |

### AC Coverage

All 32 acceptance criteria (AC-01 through AC-32) are mapped to at least one planned test or evidence item. Every test remains in "Planned / Not run yet" status.

### ACs Relying Partly on Manual / Visual Evidence

| AC | Reason |
|---|---|
| AC-30 | Structural card/table switch automatable via E2E-008; color fidelity, touch target size >= 44px, and clipping require screenshot review (VIS-007, VIS-008, VIS-009, VIS-012) |
| AC-31 | Two-column layout structural presence automatable via Playwright viewport (E2E-010); pixel-balance and spacing require screenshot evidence (VIS-010, VIS-011) |
| AC-32 | Keyboard navigation automatable via Playwright keyboard simulation in E2E-001; focus-ring visual appearance requires screenshot (VIS-002) |

### Infrastructure Required Before Tests Can Run

| Item | Blocking which tests |
|---|---|
| `@playwright/test` installation + `playwright.config.ts` | All E2E tests (E2E-001 through E2E-010) |
| `server/.env.test` with `TEST_DATABASE_URL` | All API integration tests |
| Test database created, migrated, and seeded | All API integration tests |
| `UPLOAD_DIR` configurable in server implementation | All attachment API tests (API-ATT-001 through API-ATT-035) |

---

*End of Lab 2 Test Plan*
