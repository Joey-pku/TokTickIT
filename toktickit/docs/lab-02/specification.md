# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a responsive, user-friendly Requester-facing Minimum Viable Product (MVP) for the TokTickIT service desk application. This sprint establishes the Zen Green design system, provides a temporary Development Requester selection mechanism to simulate user ownership before full authentication in Lab 3, enables end users to create and track IT support tickets with permitted attachments, enforces strict requester data isolation across the full stack, and provides an audited soft-removal lifecycle for attachments.

---

## 2. Stakeholder Request Interpretation

The IT support department requires a reliable and intuitive digital channel for university personnel and students (Requesters) to submit and track support inquiries without exposing sensitive internal workflows.

In this sprint, the application must transition from a static scaffold into a multi-screen, data-driven ticketing interface. The system must allow users to select an active Development Requester identity for testing, create support tickets categorized by affected system and priority, view exclusively their own tickets through a searchable and paginated dashboard, inspect full ticket details, and upload, download, or soft-remove supporting documentation (up to 5 active files, max 5 MB each). 

The stakeholder explicitly mandates that multi-tenant ownership boundaries be enforced by the backend, that all user-facing interactions adhere to a consistent and calm "Zen Green" design language, and that the foundation cleanly decouples requester features from future IT staff administration and authentication workflows planned for subsequent sprints.

---

## 3. Scope

### Included
- **Development Requester Selection ("Simulated Login")**:
  - Selection screen listing all active Development Requesters loaded from PostgreSQL.
  - Exclusion of inactive requesters from the selector.
  - Client-side persistence of the active requester context across page refreshes.
  - Requester switching capability and display of current requester in the navigation shell.
- **Create Ticket Workflow**:
  - Ticket submission form capturing Category, Related System, Requested Priority, Ticket Summary, Description, and initial file Attachments.
  - Automatic backend generation of the official, unique Ticket Number (`TKT-YYYY-NNNNNN`).
  - Read-only display of system-generated fields (Ticket Number, Ticket Date, Requester).
  - Validation with clear field-level error indications and duplicate submission prevention.
  - Resilient submission handling where tickets are preserved even if attachment upload encounters issues.
- **My Tickets (Requester Dashboard)**:
  - Paginated list displaying solely the tickets owned by the currently selected requester.
  - Multi-field search querying ticket number and summary.
  - Filtering by Category, Requested Priority, and Current Status.
  - Column sorting by creation date, ticket number, and last update timestamp.
  - Dedicated UI states for loading, empty list (no tickets created yet), no-results (search/filter mismatch), and API failure.
- **Requester Ticket Detail & Attachment Management**:
  - Read-only ticket header and details view for the ticket owner.
  - Attachment listing displaying file metadata, size, upload timestamp, and active/removed status.
  - Secure download of active attachments.
  - Upload of additional permitted attachments to an existing ticket up to the active limit.
  - Soft removal of attachments requiring a mandatory removal reason.
  - Audited display of soft-removed attachments while strictly blocking their download and preview.
  - Backend multi-user ownership enforcement returning HTTP 404 Not Found on cross-requester access.
- **Zen Green UI System & Responsive Design**:
  - Responsive layouts supporting Desktop (≥ 992px), Tablet (768px–991px), and Mobile (< 768px) viewports with zero horizontal scrolling.
  - Consistent Zen Green color tokens, clear typography, distinct editable/read-only input states, and accessible controls.

### Excluded
- **Authentication & Real Security**: Login/logout with passwords, password hashing, session cookies, JWT or bearer tokens, role-based access control (RBAC), and authenticated identity verification. (Deferred to Lab 3).
- **IT Staff Workflows**: IT Staff dashboard, central queue management, ticket claiming, ticket reassignment, and manual IT Priority setting by staff.
- **Ticket Lifecycle Progression**: Status transitions beyond the initial `NEW` status (e.g., `IN_PROGRESS`, `PENDING`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
- **Ticket Collaboration & History**: Public comments, internal notes, technician activity logs, and Actions Taken / service action tabs.
- **Administration & Reference Data Management**: Administrative interfaces to manage users, requesters, categories, or related systems.

---

## 4. Functional Requirements

### Development Requester Context
- **FR-01 (Requester List Retrieval)**: The system shall provide an API endpoint to retrieve all active Development Requesters from the database.
- **FR-02 (Requester Selection)**: The user shall be able to select an active Development Requester from a dropdown list on the Development Requester Selection screen.
- **FR-03 (Context Persistence)**: The application shall persist the selected Requester ID in client-side storage (`localStorage`) so that the session survives browser refreshes.
- **FR-04 (Requester Route Guarding)**: The frontend shall prevent access to My Tickets, Create Ticket, and Ticket Detail screens if no Development Requester is selected, redirecting the user to the Selection screen.
- **FR-05 (Identity Display & Switching)**: The application shell shall display the name of the currently selected Requester and provide a "Change Requester" action that allows switching identity and immediately reloads requester-scoped data.

### Create Ticket
- **FR-06 (Reference Data Loading)**: The Create Ticket screen shall load and populate seeded Categories and active Related Systems dynamically from the backend.
- **FR-07 (Requester Population)**: The Create Ticket screen shall display the current Requester's name as a read-only field derived from the active session context.
- **FR-08 (System-Generated Values)**: The backend shall assign a unique official Ticket Number, set Ticket Date to the current timestamp, and initialize Current Status to `NEW` upon creation.
- **FR-09 (Field Input & Validation)**: The user shall input Category, Related System, Requested Priority (`LOW`, `MEDIUM`, `HIGH`), Summary, and Description. The system shall enforce mandatory field completion with field-level validation errors.
- **FR-10 (Duplicate Submission Guard)**: The submission button shall enter a disabled busy state while processing to prevent duplicate form submissions.
- **FR-11 (Initial Attachment Upload)**: The user shall be able to select and upload up to 5 valid attachment files during ticket creation.
- **FR-12 (Creation Resilience)**: If ticket creation succeeds but an attachment upload fails, the ticket shall remain saved in PostgreSQL, successful attachments shall remain attached, failed attachments shall be clearly reported to the user, and form values shall not be discarded.
- **FR-13 (Creation Feedback)**: Upon successful ticket creation, the UI shall display a clear confirmation banner presenting the generated official Ticket Number and providing navigation to My Tickets or Ticket Detail.

### My Tickets Dashboard
- **FR-14 (Ownership-Scoped Listing)**: The My Tickets screen shall fetch and display only tickets belonging to the currently selected Requester.
- **FR-15 (Search)**: The ticket list shall support text searching across ticket numbers and summaries with debounced or on-demand execution.
- **FR-16 (Filtering)**: The ticket list shall support independent or combined filtering by Category, Requested Priority, and Current Status.
- **FR-17 (Sorting)**: The user shall be able to sort the ticket list by Ticket Date (`createdAt`), Ticket Number, or Last Updated (`updatedAt`) in ascending or descending order.
- **FR-18 (Pagination)**: The ticket list shall paginate results with configurable page sizes (default 10) and display current page, total items, and previous/next navigation controls.
- **FR-19 (List States)**: The My Tickets UI shall render dedicated visual states for loading, empty list (no tickets created), no search/filter matches, and API communication failure.

### Ticket Detail & Attachments
- **FR-20 (Read-Only Detail Display)**: The Ticket Detail screen shall display the required ticket attributes (Ticket Number, Ticket Date, Requester, Category, Related System, Requested Priority, Current Status, Summary, Description, and attachment information) in a clean, read-only Zen Green layout.
- **FR-21 (Ownership Enforcement)**: The backend shall verify ticket ownership on every detail request and reject attempts to view tickets belonging to another requester with HTTP 404 Not Found.
- **FR-22 (Attachment Listing)**: The Ticket Detail screen shall list all attachments associated with the ticket, showing original filename, file size, upload timestamp, active/removed state, and removal reason if soft-removed.
- **FR-23 (Active Attachment Download)**: The user shall be able to securely download any active attachment associated with their owned ticket.
- **FR-24 (Supplementary Attachment Upload)**: The user shall be able to upload additional valid attachments to an existing owned ticket as long as the active attachment count does not exceed 5.
- **FR-25 (Attachment Soft Removal)**: The user shall be able to soft-remove an active attachment from their ticket by providing a mandatory removal reason.
- **FR-26 (Removed File Access Blocking)**: The backend shall strictly reject any download or preview requests for soft-removed attachments with HTTP 404 Not Found.
- **FR-27 (Attachment Ownership Guard)**: The backend shall reject attachment downloads or removals attempted by a requester who does not own the associated ticket with HTTP 404 Not Found.

### Responsive Layout & Accessibility
- **FR-28 (Responsive Breakpoints)**: The application shall adapt fluidly across Desktop (≥ 992px), Tablet (768px–991px), and Mobile (< 768px) viewports without horizontal page scrolling.
- **FR-29 (Keyboard & Focus Accessibility)**: All interactive form controls, buttons, dropdowns, and links shall provide visible keyboard focus indicators and support standard keyboard navigation.

---

## 5. Business Rules

### Core Mandatory Rules
- **BR-01 (Unique Official Ticket Number)**: The official Ticket Number is generated by the backend and must be globally unique across the system. It follows the format `TKT-YYYY-NNNNNN` (e.g., `TKT-2026-000001`) and is generated atomically via a PostgreSQL-backed strategy under concurrent requests.
- **BR-02 (Initial Ticket Status)**: Every newly created Ticket begins with Current Status `NEW`. For Lab 2, Current Status is `NEW` and has no lifecycle transition controls.
- **BR-03 (Development Requester Testing Mechanism)**: Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing and multi-user ownership simulation only, and is explicitly not an authenticated security identity.

### Identity & Context Rules
- **BR-04 (Active Requesters Only)**: Only Development Requesters marked with `isActive = true` shall appear in the Development Requester Selection screen. Inactive requesters must never be presented as selectable options.
- **BR-05 (Strict Requester Ownership Isolation)**: A Requester may only view, search, open, or manage tickets that are explicitly owned by their Requester ID. Direct attempts to query or mutate another requester's ticket or attachment must be rejected by the backend.
- **BR-06 (Requester Switching Invalidation)**: Switching the active Development Requester immediately clears client ticket caches and reloads all views under the newly selected identity.

### Field Validation & Text Rules
- **BR-07 (Whitespace Trimming)**: All user-entered text fields (`summary`, `description`, `removalReason`, `search`) must be automatically trimmed of leading and trailing whitespace on both client and server before validation and persistence.
- **BR-08 (Ticket Summary Constraints)**: The Ticket Summary is mandatory and must contain between 5 and 100 characters after trimming. Whitespace-only submissions are invalid.
- **BR-09 (Ticket Description Constraints)**: The Ticket Description is mandatory and must contain between 10 and 2,000 characters after trimming. Whitespace-only submissions are invalid.
- **BR-10 (Requested Priority Values)**: The Requested Priority must be one of three permitted enumerated values: `LOW`, `MEDIUM`, or `HIGH`. Default selection on the Create Ticket form is `MEDIUM`.
- **BR-11 (Required Reference Selections)**: A valid Ticket submission must contain a valid `categoryId` (from the seeded Categories) and a valid, active `relatedSystemId`.
- **BR-12 (Duplicate Submission Protection)**: While a ticket submission or attachment action is in flight, the submitting button must enter a busy state and be disabled to prevent concurrent duplicate submissions.
- **BR-13 (Form Data Preservation on Error)**: In the event of a client validation error or server rejection, the user's entered form data must remain populated in the form fields rather than being wiped.

### Attachment Lifecycle Rules
- **BR-14 (Permitted Attachment MIME Types)**: Attachments are strictly restricted to the following file types:
  - Image: JPEG (`image/jpeg`, `.jpg`, `.jpeg`)
  - Image: PNG (`image/png`, `.png`)
  - Image: WEBP (`image/webp`, `.webp`)
  - Document: PDF (`application/pdf`, `.pdf`)
  All other file extensions and MIME types must be rejected with a descriptive validation error.
- **BR-15 (Maximum Attachment File Size)**: The maximum allowable file size for any individual attachment is 5 MB (5,242,880 bytes). Files exceeding this threshold must be rejected immediately.
- **BR-16 (Maximum Active Attachments Limit)**: A Ticket may have a maximum of 5 active (non-removed) attachments at any given time. Uploads that would cause the active count to exceed 5 must be blocked.
- **BR-17 (Attachment Database Record & Audit Retention)**: The database record and audit metadata of an attachment must survive soft removal. The attachment record is updated with soft-removal indicators (`isRemoved`, `removedAt`, `removedById`, `removalReason`), and removed attachment content must be completely inaccessible for download and preview. Physical filesystem management may handle underlying binary storage safely without compromising database audit retention.
- **BR-18 (Mandatory Removal Reason)**: Initiating a soft removal requires a mandatory removal reason containing between 5 and 255 characters after trimming.
- **BR-19 (Soft-Removed File Access Blocking)**: Once an attachment is soft-removed:
  - Its metadata (filename, size, removal timestamp, removal reason) remains visible in the Ticket Detail attachment list marked as `Removed`.
  - Its file content must not be downloadable or previewable.
  - The download endpoint must return HTTP 404 Not Found for soft-removed files.
- **BR-20 (Safe Filename & Storage Strategy)**: Uploaded files must be stored on disk using a cryptographically unique UUID filename (e.g., `<uuid>.<ext>`) to prevent directory traversal, file collision, and code injection vulnerabilities. The original user filename is preserved strictly as database metadata.
- **BR-21 (Attachment Failure Non-Fatal Strategy)**: When submitting a new ticket with attachments, the Ticket record is committed first. If an attachment upload fails (due to invalid file type, size excess, or disk write failure), the successfully created Ticket remains valid, and the failed files are clearly flagged so the user can re-upload them from Ticket Detail.

### Query, Search & Error Rules
- **BR-22 (Search Scope)**: Search queries perform case-insensitive substring matching against `ticketNumber` and `summary`.
- **BR-23 (Pagination & Sorting Bounds)**: Page numbers are 1-based. Allowed page sizes are 10, 25, or 50. Defaults are `page=1`, `pageSize=10`, `sortBy=createdAt`, `sortOrder=desc`. Omitted parameters use defaults. Invalid supplied `categoryId`, `requestedPriority`, `status`, `sortBy`, `sortOrder`, `page`, or `pageSize` return HTTP `400 Bad Request` (`VALIDATION_ERROR`). Page beyond total returns HTTP 200 with `items: []`. A `totalItems=0` means `totalPages=0`. Deterministic secondary sorting is `id DESC`.
- **BR-24 (Information-Hiding Ownership Rejection)**: When a user attempts to access a ticket or attachment owned by another requester, the backend responds with HTTP 404 Not Found rather than HTTP 403 Forbidden to prevent leaking information regarding the existence of other users' tickets.
- **BR-25 (Lab 3 Architectural Decoupling)**: Development Requester identity simulation is strictly isolated to the data access layer using an `x-requester-id` header/context so that transition to Lab 3 JWT/session authentication will require zero schema changes to `Ticket` or `Attachment`.

---

## 6. UI Specification Summary

The TokTickIT user interface adheres strictly to the **Zen Green** design language, establishing a calm, clear, and functional service desk environment.

### 1. Zen Green Color Palette & Tokens
- **Primary Green (`#006B3C`)**: Used for the global header navbar, primary call-to-action buttons ("Create Ticket", "Continue"), and strong section branding.
- **Secondary Green (`#0B7A46`)**: Used for active navigation tabs, interactive links, keyboard focus rings, and hover states.
- **Pale Green (`#EAF6EF`)**: Used for selected table rows, subtle background highlights, and success callout containers.
- **Page Background (`#F5F7F6`)**: Calm, near-white neutral background that minimizes eye strain.
- **Card / Surface (`#FFFFFF`)**: Pure white card surfaces bordered with a subtle `#E2E8E5` boundary and restrained box shadow (`0 2px 4px rgba(0,0,0,0.04)`).
- **Text (`#1C2A24`)**: Deep charcoal-green text providing optimal contrast and readability without harsh pure black.
- **Editable Field**: Pure white background (`#FFFFFF`) with a crisp neutral border (`#CBD5E1`), transitioning to a `#0B7A46` border and focus ring on focus.
- **Read-Only Field**: Distinct soft gray-green background (`#F1F5F3`) with muted text (`#475569`) and non-interactive cursor, clearly communicating non-editable state.
- **Error Tone (`#DC2626` text, `#FEE2E2` background)**: Used for field-level error messages appearing directly below invalid inputs and alert callouts.
- **Warning Tone (`#D97706` text, `#FEF3C7` background)**: Semantic amber tone used for `MEDIUM` priority badges and warning notices.
- **Success Tone (`#16A34A` text, `#DCFCE7` background)**: Semantic green tone used for confirmation banners and `NEW` status badges.

### 2. Screen Layouts & Structures
- **Navigation Shell**:
  - TokTickIT logo with clock/tick glyph.
  - Links to "My Tickets" and "Create Ticket" with active page indicators.
  - Right-aligned profile dropdown showing the current Development Requester name and a "Change Requester" action.
- **Development Requester Selection Screen**:
  - Centered card layout with user glyph.
  - Informative banner clarifying that this screen simulates user login for Lab 2 testing only.
  - Dropdown menu loaded dynamically with active requesters.
  - Notice callout stating *"Authentication coming in Lab 3"*.
  - Secondary "Cancel" and primary green "Continue" actions.
- **Create Ticket Screen**:
  - Header with title and breadcrumb navigation.
  - Top row: System-generated read-only fields (Ticket Number placeholder, Ticket Date, Requester).
  - Classification row: Category dropdown, Related System dropdown, Requested Priority selector (`Low`, `Medium`, `High`).
  - Content section: Ticket Summary input with character counter (5–100), multiline Description textarea (10–2,000).
  - Attachment section: Dropzone / file picker displaying allowed formats (JPG, PNG, WEBP, PDF) and 5 MB limit, showing selected files with remove pills before submission.
  - Actions: Secondary "Cancel" button and primary "Submit Ticket" button with busy spinner.
- **My Tickets Screen**:
  - Title header with summary count and quick "+ Create Ticket" primary button.
  - Filter toolbar: Search input with magnifying glass icon, Category dropdown, Requested Priority dropdown, Current Status dropdown, and "Clear Filters" button.
  - Data table: Responsive table displaying Ticket No, Created Date, Summary, Category, Requested Priority badge, Current Status badge, and Last Updated.
  - Table footer: Summary range (e.g., "Showing 1 to 10 of 24 tickets") and numbered pagination controls.
  - Alternative states: Clean empty-state illustration when zero tickets exist; distinct no-results container when filters yield no matches.
- **Ticket Detail Screen**:
  - Header: Breadcrumbs `My Tickets > Ticket Details` and "← Back to My Tickets" button.
  - Details card: Clean key-value grid displaying Ticket No, Ticket Date, Requester, Category, Related System, Requested Priority badge, Current Status badge (`NEW`), Summary, Description, and attachment information.
  - Attachment panel: Tab or section displaying count of active attachments (e.g., "Attachments (2/5)"), listing each file with filetype icon, name, size, upload date, download action, and soft-remove button.
  - Soft-removed attachments section: Collapsible or muted list showing strikethrough filename, removal timestamp, and mandatory removal reason.
  - Soft Removal Modal: Modal dialog prompting for the mandatory reason (5–255 chars) before executing soft deletion.

### 3. Responsive Breakpoints
- **Desktop (≥ 992px)**: Full multi-column grid, horizontal filter toolbar, comprehensive data table with all metadata columns.
- **Tablet (768px–991px)**: Two-column form layouts, condensed table view, priority badges aligned cleanly.
- **Mobile (< 768px)**: Single-column vertical layout, filters stack vertically, data table transforms into stacked ticket cards to prevent horizontal overflow, touch-friendly tap targets (minimum 44px height).

---

## 7. Data Changes

The database schema is implemented in PostgreSQL using Prisma ORM.

### 1. Conceptual Models & Relationships
- **DevelopmentRequester**: Represents a seeded testing identity simulating a logged-in user.
  - 1-to-many relationship with `Ticket` (`requesterId`).
- **Ticket**: Core support request entity.
  - Belongs to `DevelopmentRequester` (`requesterId` foreign key).
  - Belongs to `Category` (`categoryId` foreign key).
  - Belongs to `RelatedSystem` (`relatedSystemId` foreign key).
  - 1-to-many relationship with `Attachment` (`ticketId`).
- **Attachment**: Supporting documentation file associated with a ticket.
  - Belongs to `Ticket` (`ticketId` foreign key).
  - References `DevelopmentRequester` (`uploadedById` foreign key) and optionally `removedById`.
- **Category**: Broad classification for IT support inquiries (e.g., Hardware, Software).
  - 1-to-many relationship with `Ticket`.
- **RelatedSystem**: Specific service, hardware device, or application affected (e.g., VPN, Corporate Laptop).
  - 1-to-many relationship with `Ticket`.

### 2. Detailed Entity Definitions
- **`DevelopmentRequester`**:
  - `id`: `Int` (Primary Key, autoincrement)
  - `name`: `String` (not null)
  - `email`: `String` (not null, unique)
  - `department`: `String` (not null)
  - `isActive`: `Boolean` (not null, default `true`)
  - `createdAt`: `DateTime` (default `now()`)
  - `updatedAt`: `DateTime` (updatedAt)
- **`Category`**:
  - `id`: `Int` (Primary Key, autoincrement)
  - `name`: `String` (not null, unique)
  - `createdAt`: `DateTime` (default `now()`)
  *(Note: Categories are seeded reference data in Lab 2; all seeded Categories are retrievable without an isActive field).*
- **`RelatedSystem`**:
  - `id`: `Int` (Primary Key, autoincrement)
  - `name`: `String` (not null, unique)
  - `isActive`: `Boolean` (not null, default `true`)
  - `createdAt`: `DateTime` (default `now()`)
- **`Ticket`**:
  - `id`: `Int` (Primary Key, autoincrement)
  - `ticketNumber`: `String` (not null, unique)
  - `summary`: `String(100)` (not null)
  - `description`: `String(2000)` (not null)
  - `requestedPriority`: `Enum(LOW, MEDIUM, HIGH)` (not null, default `MEDIUM`)
  - `currentStatus`: `String` (not null, default `"NEW"`) - For Lab 2, all tickets begin with and maintain Current Status `NEW`. Future lifecycle statuses and transition controls are excluded.
  - `requesterId`: `Int` (not null, Foreign Key -> `DevelopmentRequester.id`)
  - `categoryId`: `Int` (not null, Foreign Key -> `Category.id`)
  - `relatedSystemId`: `Int` (not null, Foreign Key -> `RelatedSystem.id`)
  - `createdAt`: `DateTime` (default `now()`)
  - `updatedAt`: `DateTime` (updatedAt)
- **`Attachment`**:
  - `id`: `Int` (Primary Key, autoincrement)
  - `ticketId`: `Int` (not null, Foreign Key -> `Ticket.id`)
  - `originalFileName`: `String` (not null)
  - `storedFileName`: `String` (not null, unique)
  - `filePath`: `String` (not null)
  - `mimeType`: `String` (not null)
  - `fileSizeBytes`: `Int` (not null)
  - `isRemoved`: `Boolean` (not null, default `false`)
  - `removedAt`: `DateTime` (nullable)
  - `removedById`: `Int` (nullable, Foreign Key -> `DevelopmentRequester.id`)
  - `removalReason`: `String(255)` (nullable)
  - `uploadedById`: `Int` (not null, Foreign Key -> `DevelopmentRequester.id`)
  - `createdAt`: `DateTime` (default `now()`)

### 3. Indexes & Constraints
- **Uniqueness Constraints**:
  - `Ticket.ticketNumber` is globally unique (`UNIQUE INDEX`).
  - `DevelopmentRequester.email` is unique.
  - `Category.name` and `RelatedSystem.name` are unique.
  - `Attachment.storedFileName` is unique.
- **Performance Indexes**:
  - `Ticket(requesterId, createdAt DESC)`: Compound index optimizing the primary query for My Tickets dashboard.
  - `Ticket(requesterId, currentStatus)`: Compound index accelerating status filtering per requester.
  - `Attachment(ticketId, isRemoved)`: Index optimizing queries for active attachment counts and detail listing.

### 4. Justified Database Design Decision
**Decision**: Implementing Soft Removal on `Attachment` via database record and audit retention with a boolean flag (`isRemoved`), audit timestamp (`removedAt`), actor tracking (`removedById`), and mandatory reason (`removalReason`), rather than deleting database rows.

**Justification**:
In IT service desk environments, support documentation requires an immutable audit trail. When a requester removes an attachment, the system must retain the historical record indicating *that* an attachment existed, *who* removed it, *when*, and *why*, while ensuring the removed attachment content is strictly blocked from download or preview (returning HTTP 404). Persisting the database record with a soft-removal flag ensures relational integrity with the parent Ticket, while composite indexing on `(ticketId, isRemoved)` ensures efficient retrieval of active attachments without requiring an archive table for the MVP. Physical file management is decoupled safely without compromising database audit retention.

### 5. Seed Data Requirements
The database seeder (`seed.ts`) must be strictly idempotent (safe to run repeatedly via `upsert` without duplicate creation).
- **Categories (4 mandatory)**:
  1. `Account and Access`
  2. `Hardware`
  3. `Software`
  4. `Network`
- **Related Systems (7 realistic options)**:
  1. `Corporate Laptop`
  2. `Email`
  3. `Campus Wi-Fi`
  4. `VPN`
  5. `LEB2 App`
  6. `Grade Submission App`
  7. `Printer`
- **Development Requesters (5 total: 4 active, 1 inactive)**:
  1. `Jennifer Anderson` (`jennifer.anderson@example.com`, Dept: "Marketing", `isActive: true`)
  2. `David Lee` (`david.lee@example.com`, Dept: "Engineering", `isActive: true`)
  3. `Sarah Johnson` (`sarah.johnson@example.com`, Dept: "Human Resources", `isActive: true`)
  4. `Michael Brown` (`michael.brown@example.com`, Dept: "Finance", `isActive: true`)
  5. `Alex Taylor (Inactive)` (`alex.taylor@example.com`, Dept: "Former Staff", `isActive: false`)

---

## 8. API Contract

The REST API exposes JSON-based endpoints for data operations and multipart endpoints for file management. Requester ownership is passed via the `x-requester-id` HTTP header and strictly enforced by server middleware.

### 1. Reference Data & Requester Endpoints
- **`GET /api/development-requesters`**:
  - *Description*: Retrieves all active Development Requesters (`isActive = true`).
  - *Response (200 OK)*: Array of `{ id, name, department }`.
- **`GET /api/categories`**:
  - *Description*: Retrieves all seeded categories in ascending ID order.
  - *Response (200 OK)*: Array of `{ id, name }`.
- **`GET /api/related-systems`**:
  - *Description*: Retrieves all active related systems in ascending name order.
  - *Response (200 OK)*: Array of `{ id, name }`.

### 2. Ticket Endpoints
- **`POST /api/tickets`**:
  - *Description*: Creates a new ticket for the requester specified in `x-requester-id`. Accepts ticket fields only; attachments are uploaded separately in subsequent requests.
  - *Request Body*: `application/json` containing `{ categoryId, relatedSystemId, requestedPriority, summary, description }`.
  - *Response (201 Created)*: Created ticket object with `{ id, ticketNumber, createdAt, updatedAt, currentStatus, summary, description, requesterId }`.
  - *Errors*: `400 Bad Request` on validation failure; `404 Not Found` if requester ID is invalid.
  - *Note on initial attachments*: After the ticket is created, initial attachments are uploaded one file per request using `POST /api/tickets/:id/attachments`. This two-step approach supports partial success: a failed attachment upload does not roll back the successfully created Ticket, and failed uploads may be retried from Ticket Detail.
- **`GET /api/tickets`**:
  - *Description*: Retrieves a paginated list of tickets owned exclusively by the requester in `x-requester-id`.
  - *Query Parameters*:
    - `search`: String (searches `ticketNumber` and `summary`).
    - `categoryId`: Category ID (omission represents "All").
    - `requestedPriority`: `LOW`, `MEDIUM`, or `HIGH` (omission represents "All").
    - `status`: Status value (supports `NEW` only in Lab 2, omission represents "All").
    - `sortBy`: `createdAt`, `ticketNumber`, `updatedAt`.
    - `sortOrder`: `asc`, `desc`.
    - `page`: Integer ≥ 1.
    - `pageSize`: Integer (10, 25, 50).
  - *Response (200 OK)*: `{ items: [...tickets], pagination: { page, pageSize, totalItems, totalPages } }`.
- **`GET /api/tickets/:ticketId`**:
  - *Description*: Retrieves detailed information and attachments for an owned ticket.
  - *Response (200 OK)*: Ticket detail object including reference labels and attachment list.
  - *Errors*: `404 Not Found` if ticket does not exist or is owned by a different requester.

### 3. Attachment Endpoints
- **`POST /api/tickets/:ticketId/attachments`**:
  - *Description*: Uploads one permitted attachment to an existing owned ticket. One file per request. Also updates the parent Ticket's `updatedAt`.
  - *Request*: `multipart/form-data` with `file` payload.
  - *Response (201 Created)*: Uploaded attachment metadata object.
  - *Errors*: `400 Bad Request` (malformed/missing request data as defined by API contract), `415 Unsupported Media Type` (unsupported attachment type), `413 Payload Too Large` (file exceeding 5,242,880 bytes), `409 Conflict` (maximum 5 active attachments exceeded), `404 Not Found` (nonexistent or cross-requester ticket).
- **`GET /api/attachments/:attachmentId`**:
  - *Description*: Retrieves metadata for an active or soft-removed owned attachment.
  - *Response (200 OK)*: Attachment metadata. Soft-removed metadata remains retrievable. Response must not expose `storedFileName`, `filePath`, `uploadedById`, or `removedById`.
  - *Errors*: `404 Not Found` (nonexistent or cross-requester attachment).
- **`GET /api/attachments/:attachmentId/download`**:
  - *Description*: Streams the physical file for an active attachment.
  - *Response (200 OK)*: Binary file stream with `Content-Disposition: attachment; filename="..."`.
  - *Errors*: `404 Not Found` if file does not exist, belongs to another requester's ticket, or `isRemoved === true`.
- **`PATCH /api/attachments/:attachmentId/remove`**:
  - *Description*: Soft-removes an active attachment with a mandatory reason. Also updates the parent Ticket's `updatedAt`.
  - *Request Body*: `{ removalReason: string }`.
  - *Response (200 OK)*: Updated attachment metadata with `isRemoved: true`, `removedAt`, and `removalReason`.
  - *Errors*: `400 Bad Request` if removal reason is missing or invalid; `404 Not Found` if attachment does not exist or is not owned by the requester; `409 Conflict` (`ALREADY_REMOVED`) if the attachment has already been soft-removed.

### 4. Ticket `updatedAt` Behavior
- At Ticket creation, `updatedAt` initially equals `createdAt`.
- A successful attachment upload (`POST /api/tickets/:ticketId/attachments`) updates the parent Ticket's `updatedAt`.
- A successful attachment soft removal (`PATCH /api/attachments/:attachmentId/remove`) updates the parent Ticket's `updatedAt`.
- This ensures the My Tickets "Last Updated" column reflects attachment activity.

### 5. API Error Envelope & Requester Context
- **Requester-Context Errors**:
  - Missing `x-requester-id` -> `400 Bad Request` (`MISSING_REQUESTER_CONTEXT`).
  - Malformed/non-integer `x-requester-id` -> `400 Bad Request` (`INVALID_REQUESTER_ID`).
  - Nonexistent or inactive requester -> `404 Not Found` (`REQUESTER_NOT_FOUND`).
  - Cross-requester owned resources -> `404 Not Found` (resource-specific not-found response).
  - *Note*: There is no HTTP `403 Forbidden` behavior in Lab 2.
- **Standard Error Envelope**:
  All errors must be returned in the following standard contract format:
  ```json
  {
    "error": {
      "code": "...",
      "message": "...",
      "fields": { } // validation only, when applicable
    }
  }
  ```
  *Note*: Legacy unstructured error responses (e.g., `{ "error": "Ticket not found" }`) are forbidden. Responses must never expose stack traces, Prisma errors, SQL details, filesystem paths, stored filenames, or other internal information.

---

## 9. Acceptance Criteria

### Requester Selection & Identity Context
- **AC-01 (Active Requester Display)**:
  - *Given* the database is seeded with 4 active and 1 inactive requester,
  - *When* the user navigates to `/select-requester`,
  - *Then* the dropdown displays exactly the 4 active requesters and excludes the inactive requester.
- **AC-02 (Unselected Requester Route Redirection)**:
  - *Given* no Development Requester is currently stored in `localStorage`,
  - *When* the user attempts to access `/tickets` or `/tickets/new`,
  - *Then* the application redirects the user to `/select-requester`.
- **AC-03 (Requester Selection Persistence)**:
  - *Given* the user selects "Jennifer Anderson" and clicks "Continue",
  - *When* the browser page is refreshed,
  - *Then* the top navigation continues to display "Jennifer Anderson" and `localStorage` retains her ID.
- **AC-04 (Requester Switching Data Isolation)**:
  - *Given* Requester A is selected and viewing their tickets,
  - *When* the user clicks "Change Requester" and selects Requester B,
  - *Then* Requester A's tickets disappear immediately and Requester B's ticket list is loaded.

### Create Ticket Workflow
- **AC-05 (Successful Ticket Creation)**:
  - *Given* a selected requester and valid form values (Category, Related System, Priority, Summary of 25 chars, Description of 50 chars),
  - *When* the user clicks "Submit Ticket",
  - *Then* a new Ticket is saved in the database with status `NEW`, an official Ticket Number in format `TKT-YYYY-NNNNNN` is generated, and a success banner is displayed.
- **AC-06 (Summary Validation - Too Short / Too Long)**:
  - *Given* a user enters a Summary with fewer than 5 characters or more than 100 characters,
  - *When* the user submits or blurs the field,
  - *Then* a field-level error message is displayed directly below Summary and no API request is dispatched.
- **AC-07 (Description Validation)**:
  - *Given* a user enters a Description with fewer than 10 characters or only whitespace,
  - *When* the user attempts to submit,
  - *Then* a field-level validation message appears under Description and submission is blocked.
- **AC-08 (Duplicate Submission Prevention)**:
  - *Given* valid ticket details are entered,
  - *When* the user clicks "Submit Ticket",
  - *Then* the button immediately becomes disabled and displays a busy spinner until the response completes.
- **AC-09 (API Failure Form Data Preservation)**:
  - *Given* the user enters valid ticket data,
  - *When* the backend server is stopped or returns HTTP 500 during submission,
  - *Then* an error message is displayed and all entered form values remain intact in the form fields.
- **AC-10 (Creation with Valid Attachments)**:
  - *Given* a valid ticket form with two valid attachments (1 PNG, 1 PDF, each < 5 MB),
  - *When* the ticket is submitted,
  - *Then* the ticket is created and both attachments are saved and linked to the new ticket.
- **AC-11 (Creation with Failed Attachment Handling)**:
  - *Given* valid ticket fields but an attachment that triggers an upload failure,
  - *When* the user submits the form,
  - *Then* the ticket is created, the failed attachment is clearly reported to the user, and the user is guided to retry uploading from Ticket Detail.

### My Tickets Dashboard
- **AC-12 (Ownership Isolation in Ticket List)**:
  - *Given* Requester A has 3 tickets and Requester B has 2 tickets in the database,
  - *When* Requester A views the My Tickets screen,
  - *Then* exactly 3 tickets are displayed, all owned by Requester A, with none belonging to Requester B.
- **AC-13 (Search by Ticket Number & Summary)**:
  - *Given* Requester A has tickets with summaries "VPN connection failed" and "Laptop screen broken",
  - *When* the user types "VPN" into the search bar,
  - *Then* only the "VPN connection failed" ticket is displayed in the list.
- **AC-14 (Filter by Category, Priority, and Status)**:
  - *Given* a list of tickets with mixed categories and priorities,
  - *When* the user selects Category "Hardware" and Priority "High",
  - *Then* only tickets matching both criteria are displayed.
- **AC-15 (Clear Filters Reset)**:
  - *Given* active search and filter selections,
  - *When* the user clicks "Clear Filters",
  - *Then* all filter dropdowns reset to `ALL`, the search input is cleared, and the full ticket list is reloaded.
- **AC-16 (Pagination Controls)**:
  - *Given* a requester owns 15 tickets with page size set to 10,
  - *When* viewing page 1,
  - *Then* the list displays tickets 1 through 10, indicates "Showing 1 to 10 of 15 tickets", and clicking "Next" loads tickets 11 through 15.
- **AC-17 (Empty State Display)**:
  - *Given* a selected requester who has created zero tickets,
  - *When* they navigate to My Tickets,
  - *Then* an empty state container is shown with a prompt to create their first ticket.
- **AC-18 (No-Results State Display)**:
  - *Given* a requester has tickets, but a search query matches none of them,
  - *When* the search completes,
  - *Then* a "No tickets match your filters" message is displayed along with a "Clear Filters" button.

### Ticket Detail & Attachments
- **AC-19 (Owned Ticket Detail View)**:
  - *Given* Requester A owns ticket `TKT-2026-000001`,
  - *When* Requester A opens the Ticket Detail screen,
  - *Then* all required ticket attributes (Ticket Number, Ticket Date, Requester, Category, Related System, Requested Priority, Current Status `NEW`, Summary, Description, and attachment information) are presented as read-only fields with Zen Green styling.
- **AC-20 (Cross-Requester Ticket Detail Rejection)**:
  - *Given* Requester B is currently selected,
  - *When* Requester B attempts to navigate to `/tickets/:id` for a ticket owned by Requester A,
  - *Then* the backend responds with HTTP 404 Not Found and the UI displays a "Ticket not found" error.
- **AC-21 (Attachment Upload on Existing Ticket)**:
  - *Given* an owned ticket with 2 active attachments,
  - *When* the user uploads a valid 2 MB JPEG image,
  - *Then* the attachment is saved, active count increments to 3, and the file appears in the attachment list.
- **AC-22 (Attachment Upload - Invalid File Type)**:
  - *Given* an existing ticket,
  - *When* the user attempts to upload an executable `.exe` or `.docx` file,
  - *Then* the upload is rejected with a validation error stating that only JPG, PNG, WEBP, and PDF are allowed.
- **AC-23 (Attachment Upload - Exceeding 5 MB Limit)**:
  - *Given* a valid PDF file of size 5.5 MB,
  - *When* the user attempts to upload it,
  - *Then* the upload is blocked immediately with an error indicating the 5 MB file size limit.
- **AC-24 (Active Attachment Limit Enforcement)**:
  - *Given* a ticket that already has 5 active attachments,
  - *When* the user attempts to upload a 6th attachment,
  - *Then* the action is blocked with an error indicating that a ticket may have at most 5 active attachments.
- **AC-25 (Active Attachment Download)**:
  - *Given* an active attachment on an owned ticket,
  - *When* the user clicks the "Download" action,
  - *Then* the file is downloaded with its original filename and content intact.
- **AC-26 (Attachment Soft Removal with Reason)**:
  - *Given* an active attachment on an owned ticket,
  - *When* the user clicks "Remove", enters a reason of "Uploaded wrong screenshot" (24 chars), and confirms,
  - *Then* the attachment record is marked with `isRemoved = true`, the removal reason is stored, and the active attachment count decrements.
- **AC-27 (Soft Removal Reason Validation)**:
  - *Given* the soft removal confirmation dialog,
  - *When* the user attempts to confirm with an empty reason or fewer than 5 characters,
  - *Then* a validation message is shown and the removal request is not sent.
- **AC-28 (Blocked Download of Soft-Removed Attachment)**:
  - *Given* a soft-removed attachment,
  - *When* an HTTP request is made directly to its download endpoint,
  - *Then* the server returns HTTP 404 Not Found and does not stream any file bytes.
- **AC-29 (Cross-Requester Attachment Access Rejection)**:
  - *Given* an attachment belonging to Requester A's ticket,
  - *When* Requester B attempts to download or remove the attachment,
  - *Then* the backend returns HTTP 404 Not Found.

### Responsive & Visual Quality
- **AC-30 (Mobile Responsive Adaptation)**:
  - *Given* a mobile viewport width (< 768px),
  - *When* viewing My Tickets, Create Ticket, or Ticket Detail,
  - *Then* all elements stack vertically, tables convert to readable card layouts, all tap targets measure at least 44px, and there is zero horizontal page scrolling.
- **AC-31 (Tablet Layout Adaptation)**:
  - *Given* a tablet viewport width (768px–991px),
  - *When* viewing Create Ticket and Ticket Detail,
  - *Then* the layout organizes cleanly into a balanced two-column format.
- **AC-32 (Keyboard Navigation & Focus)**:
  - *Given* an interactive screen,
  - *When* navigating exclusively using the `Tab` key,
  - *Then* every control exhibits a visible Zen Green focus ring and can be triggered via keyboard.

---

## 10. Definition of Done

A task or pull request within Sprint 2 is considered **Done** only when all conditions across both Product Completion and Course Delivery are fully verified.

### 1. Product Completion Checklist
- [ ] **Approved Scope Delivered**: All required capabilities (Requester Selection, Create Ticket, My Tickets, Ticket Detail, and Attachment Lifecycle) are implemented without leaking into Lab 3 scope.
- [ ] **Functional Requirements Satisfied**: Every requirement from FR-01 through FR-29 is implemented in full.
- [ ] **Business Rules Enforced**: All business rules (BR-01 through BR-25) are strictly enforced in both client UI and server backend logic.
- [ ] **Acceptance Criteria Met**: Every acceptance criterion from AC-01 through AC-32 has demonstrable evidence of passing.
- [ ] **Automated Test Coverage**:
  - Unit tests verify Ticket Number generation, trimming logic, and validation rules.
  - API integration tests (Supertest) pass for all endpoints, validation failures, boundary conditions, and cross-requester ownership guards.
  - Component tests (Vitest + React Testing Library) verify form rendering, field validation messages, busy button states, and empty/no-results views.
  - Playwright E2E tests verify full user journeys across Desktop, Tablet, and Mobile viewports.
- [ ] **Zero Skipped Tests**: No test in the test suite is commented out, skipped, or configured as flaky.
- [ ] **UI Specification Conformance**: All implemented screens strictly adhere to Zen Green color tokens, typography, field states (editable vs. read-only), and responsive behavior.
- [ ] **Resilient Error Handling**: Network failures, invalid file uploads, and server downtime are handled gracefully with preserved form state and clear user alerts.
- [ ] **Idempotent Database Seeds**: Database migrations execute cleanly, and `seed.ts` runs repeatedly without producing duplicates or constraint violations.

### 2. Course Delivery Checklist
- [ ] **GitHub Project & Issues**: Sprint decomposed into clear GitHub Issues covering specs, database, APIs, UI screens, tests, and visual inspection, tracked to the `Done` column on the Kanban board.
- [ ] **Git Branching Discipline**: Work progressed from `main` -> `lab2-staging` -> individual `feature/*` branches via peer-reviewed Pull Requests. No direct commits to `main` or `lab2-staging`.
- [ ] **Documentation Artifacts**:
  - `docs/lab-02/specification.md` complete and timestamped prior to implementation PRs.
  - `docs/lab-02/ui-spec.md` fully defining visual tokens, layouts, and inspection checklists.
  - `docs/lab-02/api-spec.md` documenting complete endpoint schemas, statuses, and payloads.
  - `docs/lab-02/tests.md` documenting the complete planned-test table, traceability matrix, and execution output.
  - `docs/lab-02/reviewer.md` recording peer review comments, responses, and approvals.
  - `docs/lab-02/ai-use.md` detailing AI pairing prompts, tool usage, and critical reflection.
- [ ] **Visual Evidence**: Screenshots captured at Desktop, Tablet, and Mobile resolutions and saved under `artifacts/lab-02/screenshots/`.
- [ ] **Final Integration**: All feature PRs merged into `lab2-staging`, followed by a final release PR from `lab2-staging` into `main` with all tests green.

---

## 11. Assumptions and Decisions

This section records all architectural and product decisions made to resolve choices left open by the stakeholder request and Lab 2 handout:

1. **Ticket Summary Constraints**:
   - *Decision*: Summary is mandatory; minimum 5 characters, maximum 100 characters. Leading and trailing whitespace is trimmed.
   - *Rationale*: Guarantees a concise, single-line issue summary that renders comfortably across desktop table rows and mobile card headers without truncation or awkward wrapping.

2. **Ticket Description Constraints**:
   - *Decision*: Description is mandatory; minimum 10 characters, maximum 2,000 characters. Leading and trailing whitespace is trimmed.
   - *Rationale*: Affords requesters sufficient space to detail symptoms, hardware models, and reproduction steps while establishing a sane boundary for PostgreSQL storage and payload transmission.

3. **Requested Priority Options & Defaults**:
   - *Decision*: Enumerated values are `LOW`, `MEDIUM`, and `HIGH`. Default selection on the Create Ticket form is `MEDIUM`.
   - *Rationale*: Aligns with standard ITIL priority triage and matches the illustrations without introducing unneeded complexity.

4. **My Tickets Filter Scope**:
   - *Decision*: Filtering on the My Tickets screen is strictly confined to:
     1. Category
     2. Requested Priority
     3. Current Status
     IT Priority is deliberately excluded from the My Tickets filter toolbar.
   - *Rationale*: In accordance with prompt instructions, written sprint scope takes precedence over illustrative mockup elements. IT Priority is an internal IT Staff triage attribute; requesters in Lab 2 set and track Requested Priority.

5. **Current Status in Lab 2**:
   - *Decision*: All tickets created during Lab 2 are initialized to Current Status `NEW`. Current Status is displayed and filterable where appropriate, but Lab 2 has no lifecycle transition controls and does not define future statuses (such as OPEN, IN_PROGRESS, PENDING, RESOLVED, or CLOSED) as requirements.
   - *Rationale*: Requester status transitions and IT staff workflow statuses are deferred to subsequent sprints.

6. **Ticket Number Generation Strategy**:
   - *Decision*: Backend generates unique Ticket Numbers in the format `TKT-YYYY-NNNNNN` (e.g., `TKT-2026-000001`) using a PostgreSQL-backed atomic generation strategy that guarantees uniqueness under concurrent requests.
   - *Rationale*: Ensures global uniqueness and race-condition safety without prematurely mandating a specific sequence table or contradictory sequence implementation details.

7. **Development Requester Context Storage**:
   - *Decision*: Stored in browser `localStorage` under the key `toktickit_selected_requester_id`. Transmitted to the backend via the `x-requester-id` HTTP request header.
   - *Rationale*: Enables session persistence across manual page refreshes during evaluation while avoiding cookies or premature authentication machinery. Decoupled architecture simplifies replacing this header with JWT/session tokens in Lab 3.

8. **Cross-Requester Ownership Failure Behavior**:
   - *Decision*: When a requester requests a ticket or attachment owned by another requester, the backend responds with **HTTP 404 Not Found** (`{ "error": "Ticket not found" }`).
   - *Rationale*: Returning 404 rather than 403 Forbidden is a security best practice that prevents unauthorized users from inferring the existence of other users' tickets through ID probing (information leakage).

9. **Deterministic Removed Attachment Download Behavior**:
   - *Decision*: Any attempt to download or stream a soft-removed attachment returns **HTTP 404 Not Found**.
   - *Rationale*: Provides a single, deterministic HTTP contract that treats removed files as inaccessible to end users.

10. **Attachment Storage on Backend**:
    - *Decision*: Uploaded files are persisted in a local directory (`server/uploads/attachments/`) using UUID filenames (`<uuid>.<extension>`). Original filenames, MIME types, and file sizes are stored in PostgreSQL.
    - *Rationale*: Eliminates filesystem path traversal vulnerabilities, prevents overwriting files with identical user names, and avoids filesystem character encoding conflicts.

11. **Mandatory Soft Removal Reason & Audit Retention**:
    - *Decision*: The database record and audit metadata of an attachment survive soft removal. Soft removal requires a mandatory `removalReason` containing between 5 and 255 characters after trimming, while removed attachment download/preview is strictly blocked (HTTP 404). Physical file storage management is decoupled safely.
    - *Rationale*: Enforces audit compliance by documenting why evidence was removed from an official IT support ticket while preventing access to removed binary content.

12. **Ticket Creation with Attachment Upload Failure Strategy**:
    - *Decision*: The Ticket entity is validated and committed first. Attachment uploads are subsequently processed. If any attachment fails (due to invalid MIME type, size limit excess, or disk write error), the successfully created Ticket remains intact in the database. Successfully uploaded companion files remain attached. Failed attachments are not linked, and the response/UI clearly reports the failure so the requester can retry uploading the failed file from the Ticket Detail view without losing entered ticket text.
    - *Rationale*: Prevents data loss of carefully drafted ticket summaries and descriptions due to transient network or file glitches, while avoiding complex two-phase distributed rollback between PostgreSQL and local disk storage.

13. **Seed Data Selection**:
    - *Decision*: Seed 4 Categories, 7 realistic Related Systems, and 5 Development Requesters (4 active, 1 inactive).
    - *Rationale*: Fully satisfies all mandatory seed requirements in Section 5.3 with realistic university IT service contexts (Wi-Fi, VPN, LEB2, Laptops).
