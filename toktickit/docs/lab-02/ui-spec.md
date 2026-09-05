# Lab 2 UI Specification

## 1. Purpose and UI Principles

### Purpose
This document establishes the official user interface specification and visual design system for the **TokTickIT Requester Ticketing MVP (Lab 2)**. It serves as the authoritative, binding visual contract between requirements, test planning, and frontend implementation. Any future frontend development must adhere strictly to these patterns.

### UI Principles & Zen Green Philosophy
1. **Zen Green Design Language**: A calm, focused, and professional service desk interface designed around harmonious green tones, quiet near-white surfaces, and crisp neutral borders that minimize visual fatigue.
2. **Predictable Visual Hierarchy**: Important primary actions, critical status alerts, and navigation landmarks are unmistakably distinct, ensuring intuitive task progression.
3. **Clear Editable vs. Read-Only Distinction**: Users must immediately perceive which fields accept user input and which represent immutable, system-generated or audit data.
4. **Responsive-First Adaptability**: Flawless visual balance and structural reorganization across Desktop, Tablet, and Mobile viewports with strictly zero horizontal scrolling.
5. **Accessibility by Design (WCAG 2.1 AA)**: Semantic elements, explicit label association, non-color status cues, visible focus indicators, accessible modals, and touch-friendly targets ($\ge 44\text{px}$).
6. **Strict Sprint 2 Boundary**: Requester-facing functionality only. All IT Staff controls (IT Priority, Ticket Owner assignment, collaboration comments, internal notes, Actions Taken, and lifecycle transitions beyond `NEW`) are strictly excluded.

---

## 2. Design Tokens

### 2.1 Color Palette Tokens
| Token Name | Hex Code | Intended Usage & Placement |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | App header bar, primary CTA buttons ("Create Ticket", "Submit Ticket", "Continue"), strong brand emphasis. |
| `--color-secondary-green` | `#0B7A46` | Active navigation tabs, link hover states, keyboard focus rings, secondary button outlines. |
| `--color-pale-green` | `#EAF6EF` | Selected table row highlight, success container backgrounds, subtle section headers, avatar accents. |
| `--color-page-bg` | `#F5F7F6` | Default body and viewport background (quiet, soothing near-white). |
| `--color-surface` | `#FFFFFF` | Card surfaces, modal dialogs, editable input backgrounds. |
| `--color-text-main` | `#1C2A24` | Primary body copy, headers, and labels (deep charcoal-green, avoiding harsh pure black). |
| `--color-text-muted` | `#475569` | Secondary captions, helper text, timestamps, read-only field text. |
| `--color-text-placeholder` | `#94A3B8` | Form input placeholder text. |
| `--color-border-editable` | `#CBD5E1` | Default neutral border for interactive text inputs, dropdowns, and textareas. |
| `--color-border-subtle` | `#E2E8E5` | Card dividers, table borders, and read-only field borders. |
| `--color-readonly-bg` | `#F1F5F3` | Soft gray-green shading for read-only / system-generated fields. |

### 2.2 Semantic & Feedback Tokens
| Token Name | Text Color | Border Color | Background Color | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--color-error` | `#DC2626` | `#F87171` | `#FEE2E2` | Field validation errors, API failure banners, destructive actions. |
| `--color-warning` | `#B45309` | `#FBBF24` | `#FEF3C7` | `MEDIUM` priority badges, testing-only warning callouts. |
| `--color-success` | `#15803D` | `#86EFAC` | `#DCFCE7` | Ticket creation confirmation, `NEW` status badges, active success banners. |
| `--color-priority-high` | `#B91C1C` | `#FCA5A5` | `#FEE2E2` | `HIGH` priority badges. |
| `--color-priority-low` | `#047857` | `#6EE7B7` | `#D1FAE5` | `LOW` priority badges. |

### 2.3 Typography Scale
- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif.
- **H1 (Page Title)**: `28px` (`1.75rem`), Semi-Bold (`600`), Line Height `1.3`.
- **H2 (Section Header)**: `22px` (`1.375rem`), Semi-Bold (`600`), Line Height `1.35`.
- **H3 (Card / Modal Title)**: `18px` (`1.125rem`), Medium (`500`), Line Height `1.4`.
- **Body Regular**: `15px` (`0.9375rem`), Regular (`400`), Line Height `1.5`.
- **Labels & Controls**: `14px` (`0.875rem`), Medium (`500`), Line Height `1.4`.
- **Helper / Error Text**: `13px` (`0.8125rem`), Regular (`400`), Line Height `1.4`.
- **Badges / Micro**: `11px` (`0.6875rem`), Semi-Bold (`600`), Line Height `1.2`, Letter Spacing `+0.5px`, Uppercase.

### 2.4 Spacing & Elevation
- **Spacing Units**: Base 4px scale: `4px` (xxs), `8px` (xs), `12px` (sm), `16px` (md), `24px` (lg), `32px` (xl), `48px` (xxl).
- **Control Heights**: Standard inputs, buttons, and selects have a uniform height of `42px`. Multiline textareas have a minimum height of `140px`.
- **Border Radii**:
  - Form Inputs, Buttons, Dropdowns: `6px`.
  - Cards, Dropzones, Tables: `8px`.
  - Status & Priority Badges: `9999px` (full rounded pill).
- **Shadows**:
  - Card Shadow: `0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)`.
  - Dropdown / Flyout Shadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`.
  - Modal Dialog Shadow: `0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`.

### 2.5 Focus & State Treatment
- **Visible Keyboard Focus**: `outline: 2px solid var(--color-secondary-green); outline-offset: 2px;` applied consistently on all interactive elements upon `:focus-visible`.
- **Disabled State**: Opacity `0.55`, background `#E2E8E5`, text `#64748B`, cursor `not-allowed`.
- **Busy State**: Button displays a centered spinning indicator, preserves button dimensions, and disables click interactions.

---

## 3. Application Shell and Navigation

### 3.1 Header Navigation Layout
The global navigation header spans the full viewport width and is pinned to the top of every screen.
- **Background**: `var(--color-primary-green)` (`#006B3C`).
- **Height**: `64px` on Desktop/Tablet; `56px` on Mobile.
- **Brand Identity (Left)**:
  - TokTickIT clock/tick glyph icon in white (`24x24px`).
  - Brand name: **TokTickIT** (`20px`, Semi-Bold, white).
  - Subtitle on desktop: *"IT Service Desk"* in muted pale-green (`12px`).
- **Navigation Links (Center-Left)**:
  - **My Tickets**: Links to `/tickets`.
  - **Create Ticket**: Links to `/tickets/new`.
  - *Active-Page Indication*: Active link features a pale green accent underline (`3px solid #EAF6EF`), subtle white background tint (`rgba(255, 255, 255, 0.12)`), white text, and `aria-current="page"`. Inactive links have `#EAF6EF` text with hover transition to full white.
- **Development Requester Context (Right)**:
  - Pill badge displaying: User avatar icon, active Requester Name (e.g., *"Jennifer Anderson"*), and a distinct **"Change Requester"** action button.
  - Clicking "Change Requester" clears the current requester selection and navigates directly to `/select-requester`.

### 3.2 Responsive Navigation
- **Desktop ($\ge 992\text{px}$)**: Full horizontal header layout with all nav links and requester badge visible simultaneously.
- **Tablet ($768\text{px}–991\text{px}$)**: Compact horizontal header; requester name truncated if necessary, "Change Requester" presented as an accessible icon button with tooltip.
- **Mobile ($< 768\text{px}$)**:
  - Header displays brand logo and an accessible hamburger menu button (`aria-label="Toggle Navigation"`).
  - Activating the menu slides open a top-anchored or side drawer displaying:
    1. Active Requester identity card with "Change Requester" button.
    2. Nav link: "My Tickets" (touch target height $\ge 48\text{px}$).
    3. Nav link: "Create Ticket" (touch target height $\ge 48\text{px}$).
  - Tapping outside or selecting a destination automatically closes the drawer.

---

## 4. Development Requester Selection Screen

### 4.1 Layout & Visual Structure
- **Container**: Centered card layout on `--color-page-bg` with a maximum width of `540px` and vertical margin of `60px auto`.
- **Header Badge**: Centered circular pale-green badge (`64x64px`) with a dark green user silhouette icon.
- **Title**: *"Select Development Requester"* (`24px`, bold, centered).
- **Testing-Only Explanation Callout**:
  - Prominent alert box with pale-green background and neutral border:
    > *"Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3."*
- **Future Notice**:
  - Secondary info box with shield icon: *"Authentication coming in Lab 3. In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account."*

### 4.2 Form Controls & Selection States
- **Dropdown Control**:
  - Label: `Development Requester *` (`14px`, medium, above control).
  - Default Placeholder Option: `"-- Select an Active Requester --"` (empty string value `""`).
  - Options: Dynamically populated strictly with active Development Requesters (`isActive = true`), showing Name and Department (e.g., *"Jennifer Anderson (Marketing)"*).
  - Helper Text: *"Only active development requesters are shown."*
- **Action Buttons**:
  - **Cancel**: Secondary button (`#FFFFFF` background, `#CBD5E1` border, dark text). Clears input.
  - **Continue**: Primary green button (`#006B3C` background, white text, arrow icon `→`).
  - *Button State*: "Continue" is **disabled** (`opacity: 0.55`, `cursor: not-allowed`) until a valid, non-empty requester is chosen.
  - *Execution*: Clicking "Continue" persists the chosen Requester ID in `localStorage` under `toktickit_selected_requester_id` and navigates to `/tickets`.

### 4.3 Screen States
- **Initial / Loading State**: Skeleton card displaying a centered spinner and text *"Loading active development requesters..."*. Dropdown is disabled during fetch.
- **Empty State**: When zero active requesters are returned:
  - Card displays a neutral alert: *"No active Development Requesters are available. Please contact the development team."*
  - Dropdown is disabled; Continue button is disabled.
- **API Failure State**:
  - Red error alert banner: *"Unable to load Development Requesters. Please try again."*
  - Includes a prominent **"Retry"** button that re-triggers the fetch.
- **Keyboard Navigation**:
  - Standard `Tab` navigation order: Dropdown $\rightarrow$ Cancel $\rightarrow$ Continue.
  - Dropdown opens with `Space` / `Enter` and arrow keys.
  - Pressing `Enter` on a selected option with focus on Continue triggers submission.

---

## 5. Create Ticket Screen

### 5.1 Field Grouping & Ordering
The Create Ticket form is organized logically into four visual sections:

```
+-----------------------------------------------------------------------+
| Breadcrumbs: My Tickets > Create Ticket                               |
| Heading: Create IT Support Ticket                                     |
+-----------------------------------------------------------------------+
| [SECTION 1: SYSTEM & CONTEXT (Read-Only)]                             |
| Ticket Number          | Ticket Date            | Requester           |
| [Generated after ...]  | [Assigned after ...]   | [Jennifer Anderson] |
+-----------------------------------------------------------------------+
| [SECTION 2: CLASSIFICATION]                                           |
| Category *             | Related System *       | Requested Priority *|
| [Select Category v]    | [Select System v]      | [Medium v]          |
+-----------------------------------------------------------------------+
| [SECTION 3: PROBLEM DETAILS]                                          |
| Ticket Summary * (5–100 characters)                                   |
| [                                                                   ] |
| Description * (10–2,000 characters)                                   |
| [                                                                   ] |
| [                                                                   ] |
+-----------------------------------------------------------------------+
| [SECTION 4: ATTACHMENTS]                                              |
| Supporting Attachments (Optional, max 5 files, 5 MB each)             |
| [ Dropzone: Drag & drop files here or Browse (JPG, PNG, WEBP, PDF)  ] |
| Selected Files:                                                       |
| - screenshot1.png (1.2 MB) [✕ Remove]                                 |
+-----------------------------------------------------------------------+
| Actions:                      [Cancel]   [Submit Ticket] (Primary)    |
+-----------------------------------------------------------------------+
```

### 5.2 Field Specifications & Editable vs. Read-Only Styling
1. **Section 1: System / Read-Only Fields**:
   - **Ticket Number**:
     - *State Before Submission*: Read-only; value displays placeholder `"Generated after submission"`.
     - *State After Submission*: Displays official backend-generated number (e.g., `TKT-2026-000001`).
     - *Visual Style*: `var(--color-readonly-bg)` (`#F1F5F3`), neutral border, lock icon, non-editable cursor.
   - **Ticket Date**:
     - *State Before Submission*: Read-only; value displays placeholder `"Assigned after submission"`.
     - *State After Submission*: Displays formatted date string returned by backend.
     - *Visual Style*: `var(--color-readonly-bg)`, lock icon.
   - **Requester**:
     - *Value*: Read-only; populated automatically from the currently active Development Requester.
     - *Visual Style*: `var(--color-readonly-bg)`, user icon.
2. **Section 2: Classification Fields**:
   - **Category \***: Dropdown populated dynamically from seeded Categories. Prompt option: `"-- Select Category --"`.
   - **Related System \***: Dropdown populated dynamically from active Related Systems. Prompt option: `"-- Select Related System --"`.
   - **Requested Priority \***: Dropdown or segmented control (`LOW`, `MEDIUM`, `HIGH`). Default selection: `MEDIUM`.
3. **Section 3: Content Fields**:
   - **Ticket Summary \***: Single-line input (`height: 42px`). Helper text: `"Brief overview of the issue (5–100 characters)"`. Character counter dynamically indicates current count.
   - **Description \***: Multiline textarea (`min-height: 140px`, vertical-only resize). Helper text: `"Detailed symptoms, error messages, and reproduction steps (10–2,000 characters)"`. Dynamic character counter.
4. **Section 4: Attachments**:
   - Dashed border dropzone (`2px dashed #CBD5E1`, `#FAFCFB` background) with cloud upload icon.
   - Supporting label: *"Allowed: JPG, JPEG, PNG, WEBP, PDF. Maximum 5 MB per file. Up to 5 files."*
   - Selected files queue: Each selected file displays an icon corresponding to its MIME type, filename, formatted size (e.g., `2.4 MB`), and an accessible red removal button (`[✕ Remove]`).
   - If an invalid file (unsupported MIME type or size $> 5\text{ MB}$) is selected, it is rejected immediately with an inline red error and not added to the upload queue.
5. **Section 5: Actions**:
   - **Cancel**: Secondary button; returns to `/tickets` without submitting.
   - **Submit Ticket**: Primary green button (`#006B3C`).

### 5.3 Feedback, Validation & Error Placement
- **Field-Level Validation Errors**:
  - Displayed immediately below the invalid control in bold red text (`13px`, `#DC2626`) with an error alert icon.
  - The invalid input control gains a crisp red border (`#DC2626`) and an accessible `aria-invalid="true"`.
  - The asterisk `*` indicates a required field but does not replace the explicit error message.
- **Busy / Duplicate Submission Guard**:
  - Upon clicking "Submit Ticket", the Submit Ticket button becomes disabled and shows *"Submitting..."* with a spinner while the request is in flight, preventing duplicate submission.
- **Creation Resilience & Attachment Failure**:
  - If ticket creation succeeds but one or more attachments fail to upload, the UI displays an amber/red notice:
    > *"Ticket TKT-2026-000001 was created successfully, but attachment [filename.pdf] failed to upload (reason). You can retry uploading the attachment from Ticket Detail."*
  - Links directly to the created Ticket Detail screen. Form text is not lost.
- **Server / Network Failure State**:
  - Prominent red alert banner at top of form: *"Server error: Unable to submit ticket. Please check your network and try again."*
  - **Data Retention Rule**: All entered values in Category, Related System, Priority, Summary, Description, and valid queued attachments remain completely intact.

---

## 6. My Tickets Screen

### 6.1 Page Header & Primary Actions
- **Header**: Title **"My Tickets"** (`28px`, bold) and subtitle *"View and track all of your support requests."*
- **Primary CTA**: Top right green button **"+ Create Ticket"** linking directly to `/tickets/new`.

### 6.2 Filter Toolbar
A unified filter toolbar positioned directly above the ticket data list:
```
+-------------------------------------------------------------------------------------------------------+
| [🔍 Search by ticket # or summary...   ]  [Category: All v]  [Priority: All v]  [Status: All v] [↻ Clear]|
+-------------------------------------------------------------------------------------------------------+
```
- **Search Input**:
  - Magnifying glass icon in input prefix. Placeholder: `"Search by ticket # or summary..."`.
  - **Deterministic Search Behavior**:
    - Typing triggers search automatically after **300 ms of inactivity** (debounced).
    - Pressing `Enter` triggers the search immediately without waiting for debounce.
    - Any search text change automatically **resets pagination to page 1**.
- **Category Filter**: Dropdown with options: `"All Categories"` (default) + seeded categories. Changing selection resets to page 1.
- **Requested Priority Filter**: Dropdown with options: `"All Priorities"` (default), `"Low"`, `"Medium"`, `"High"`. Resets to page 1.
- **Current Status Filter**: Dropdown with options: `"All Statuses"` (default), `"New"`. Resets to page 1.
- **Clear Filters Action**: Button with refresh icon (`↻ Clear Filters`). Resets search to empty string, all filter dropdowns to `"All"`, and pagination to page 1.
- *(Note: IT Priority filter is strictly omitted).*

### 6.3 Desktop Data Table ($\ge 992\text{px}$)
Clean, responsive table with alternating row hover effect (`#F8FAF9`) and pale-green selection highlight:
| Column Header | Sortable | Visual Treatment / Formatting |
| :--- | :--- | :--- |
| **Ticket No.** | Yes (`▲`/`▼`) | Bold primary green link (`#006B3C`), opens Ticket Detail. e.g., `TKT-2026-000001`. |
| **Created Date** | Yes (Default `DESC`) | Formatted: `MMM DD, YYYY hh:mm A` (e.g., `May 12, 2026 09:14 AM`). |
| **Summary** | No | Primary text (`#1C2A24`), truncated with ellipsis if exceeding 45 chars; full text on hover tooltip. |
| **Category** | No | Neutral text label (e.g., `Hardware`, `Software`). |
| **Requested Priority** | No | Semantic pill badge: `Low` (Soft Green), `Medium` (Amber), `High` (Red). |
| **Current Status** | No | Soft Green pill badge: `New`. |
| **Last Updated** | Yes (`▲`/`▼`) | Formatted timestamp; indicates recent updates. |

*(Strictly excludes IT Priority and Ticket Owner columns).*

### 6.4 Mobile Card Layout ($< 768\text{px}$)
On mobile screens, the data table transforms into stacked ticket cards.
- **Card Interaction Rule**: The entire card is **not** an implicit clickable element (to ensure predictable accessibility for screen readers and keyboard users).
- **Card Anatomy**:
  - **Top Row**: Ticket Number as an explicit, high-contrast anchor link (`#006B3C`, bold, `16px`) + Current Status badge (`New`) on the right.
  - **Middle Row**: Ticket Summary (`15px`, medium weight) and Category label (`13px`, muted).
  - **Bottom Row**: Requested Priority badge, Created Date timestamp, and a visible text action button: **"View Details →"** (touch target $\ge 44\text{px}$).

### 6.5 Pagination Controls
Located at the bottom of the table/cards:
- **Summary Info (Left)**: *"Showing 1 to 10 of 24 tickets"*.
- **Page Size Selector (Center)**: Dropdown offering `10`, `25`, `50` per page (default `10`).
- **Page Navigation (Right)**:
  - Accessible `[< Previous]` button (disabled on page 1).
  - Numbered page buttons (`[1]`, `[2]`, `[3]`, with active page highlighted in primary green).
  - Accessible `[Next >]` button (disabled on last page).

### 6.6 List States
- **Loading State**: Render 5 table skeleton rows with subtle pulsing animation (`#E2E8E5`).
- **Empty State (No Tickets Created Yet)**:
  - Clean illustration with ticket icon.
  - Heading: *"No Tickets Found"*.
  - Message: *"You haven't submitted any support tickets yet. Create your first ticket to get started."*
  - Action: Primary green **"+ Create Your First Ticket"** button.
- **No-Results State (Filters / Search Yield Zero Matches)**:
  - Search icon with slash.
  - Heading: *"No Matching Tickets"*.
  - Message: *"No tickets match your search or filter criteria. Try adjusting your filters or search term."*
  - Action: Secondary **"Clear Filters"** button.
- **API Failure State**:
  - Warning/error card: *"Unable to load tickets from the server. Please check your network connection."*
  - Action: **"Try Again"** button.

---

## 7. Requester Ticket Detail Screen

### 7.1 Header & Back Navigation
- **Breadcrumbs**: `My Tickets > Ticket Details`.
- **Back Action**: Top right secondary button: `[← Back to My Tickets]` (navigates safely back to the ticket list with preserved filters where feasible).

### 7.2 Read-Only Ticket Information Card
All ticket fields are presented in a structured, read-only layout using `var(--color-readonly-bg)` (`#F1F5F3`) and crisp labels:
- **Row 1 (Metadata)**:
  - `Ticket No.`: Displayed prominently with lock icon (e.g., `TKT-2026-000001`).
  - `Ticket Date`: Formatted creation timestamp (e.g., `May 12, 2026 09:14 AM`).
  - `Requester`: Selected requester name (e.g., `Jennifer Anderson`).
- **Row 2 (Classification)**:
  - `Category`: Displayed text (e.g., `Hardware`).
  - `Related System`: Displayed text (e.g., `Corporate Laptop`).
  - `Requested Priority`: Priority pill badge (`Low`, `Medium`, or `High`).
  - `Current Status`: Status pill badge (`New`).
- **Row 3 (Summary)**: Full ticket summary text in bold charcoal-green.
- **Row 4 (Description)**: Full multiline description in structured read-only box with preserved whitespace/linebreaks.
- *(Note: IT Priority, Ticket Owner, comments, internal notes, Actions Taken, and status modification controls are strictly omitted).*

### 7.3 Detail States & Error Handling
- **Loading State**: Full-page skeleton placeholder for header and cards.
- **Ownership Failure / 404 State**:
  - If a user navigates to `/tickets/:id` for an unowned ticket or non-existent ID:
  - Card displays:
    > **Ticket Not Found**  
    > *"The requested ticket does not exist or you do not have permission to view it."*
  - Action: Primary green button `[Return to My Tickets]`.
- **Server Error State**: Red alert container with a retry button.

---

## 8. Attachment UI

### 8.1 Active Attachments List
Positioned directly beneath the ticket details card:
- **Section Header**: `Attachments` with counter badge indicating active slots (e.g., `"Attachments (2/5)"`).
- **Active File Row**:
  - Document / image file icon based on extension.
  - Original filename (e.g., `system_error_screenshot.png`).
  - File size formatted in KB or MB (e.g., `1.8 MB`).
  - Upload timestamp (e.g., `May 12, 2026 09:15 AM`).
  - **Action 1 (Download)**: Secondary outline button `[⬇ Download]` (triggers download of the physical binary file).
  - **Action 2 (Remove)**: Destructive outline button `[🗑 Remove]` (opens the soft-removal confirmation modal).

### 8.2 Supplementary Attachment Upload
- When active attachments $< 5$: A dropzone / file-picker control is visible with subtext: *"Add supporting attachment (JPG, PNG, WEBP, PDF, max 5 MB)"*.
- When active attachments $= 5$: The upload dropzone is hidden or disabled, displaying helper text: *"Maximum active attachments (5/5) reached. Remove an existing attachment to upload a new one."*
- Upload progress / busy spinner displays while supplementary upload is being processed.

### 8.3 Soft-Removal Interaction & Confirmation Modal
Clicking the `[🗑 Remove]` button on an active attachment opens an accessible modal dialog:
- **Modal Header**: Title `"Remove Attachment"` and warning icon.
- **Audit Warning Message**:
  > *"Are you sure you want to remove this attachment? The file will be removed from active ticket evidence and cannot be downloaded again. This action is permanently recorded in the audit trail."*
- **Attachment Summary**: Displays the filename and size of the file to be removed.
- **Mandatory Removal Reason**:
  - Label: `Reason for removal *` (`14px`, medium).
  - Textarea (`min-height: 80px`). Helper text: `"5–255 characters"`.
  - Dynamic character count validation.
- **Modal Actions**:
  - `[Cancel]`: Closes modal without making any changes. Focus returns to the triggering `Remove` button.
  - `[Confirm Removal]`: Destructive red button (`#DC2626`). Disabled until a valid reason ($\ge 5$ characters after trimming) is provided.
  - When in flight, button displays *"Removing..."* with spinner.
- **Modal Dismissal Behavior**:
  - Pressing `Escape` or clicking `[Cancel]` closes the modal safely without removal.
  - **Backdrop Rule**: Backdrop clicking must **never** confirm removal. To prevent accidental data loss, clicking outside does not trigger removal.

### 8.4 Soft-Removed Attachment Presentation
- Soft-removed attachments remain listed in a separate, visually distinct collapsible section: **"Removed Attachments (N)"**.
- **Visual Styling**:
  - Muted gray background (`#F8FAF9`) and subtle border.
  - Filename displayed with strikethrough styling (`text-decoration: line-through; color: #64748B;`).
  - Red/gray badge: `[Removed]`.
  - Timestamp of removal and actor: *"Removed on May 13, 2026 10:20 AM"*.
  - Audited reason displayed in italics: *"Reason: Uploaded wrong screenshot with personal data"*.
  - **Inaccessible Download**: Download button is completely omitted. Direct URL access to download returns HTTP 404 Not Found.

---

## 9. Reusable UI Components

The frontend application uses 12 core reusable UI components to ensure visual consistency:

1. **`AppShell`**: Global page wrapper containing the navigation bar, responsive content container (`max-width: 1200px`), and footer.
2. **`NavBar`**: Navigation component with active link indicators, hamburger drawer on mobile, and active Development Requester context pill.
3. **`PageHeader`**: Standard header rendering breadcrumb trail, H1 page title, optional subtitle, and top-right CTA action slot.
4. **`FormField`**: Universal wrapper rendering label, required red asterisk (`*`), input control slot, character counter, helper caption, and field-level error message.
5. **`ReadOnlyField`**: Styled display component for immutable system fields, featuring the Zen Green read-only background (`#F1F5F3`), neutral border, and lock/context icon.
6. **`PriorityBadge`**: Pill badge rendering `LOW` (soft green), `MEDIUM` (amber), and `HIGH` (red) priorities with accessible text and distinct styling.
7. **`StatusBadge`**: Pill badge rendering `NEW` (soft green) status.
8. **`Alert`**: Accessible callout container supporting `info`, `success`, `warning`, and `error` variants with corresponding semantic icons and color tokens.
9. **`Modal`**: Accessible dialog implementing focus trapping, `Escape` key listeners, title labeling (`aria-labelledby`), and focus restoration to the trigger element upon closing.
10. **`AttachmentItem`**: Row component rendering attachment metadata, filetype icon, size, upload timestamp, and actions (Download/Remove for active; strikethrough and reason for soft-removed).
11. **`Pagination`**: Controls rendering total item count, page size selector (`10`, `25`, `50`), previous/next buttons, and numbered page links.
12. **`EmptyState`**: Centered placeholder container with customizable illustration/icon, title, descriptive message, and primary CTA button.

---

## 10. Validation and Feedback States

| Condition | Visual Presentation | User Guidance |
| :--- | :--- | :--- |
| **Missing Required Field** | Red input border (`#DC2626`), bold red text directly beneath input. | *"[Field name] is required."* |
| **Summary Length Out of Range** | Red input border, counter turns red (e.g., `3/100`). | *"Summary must be between 5 and 100 characters."* |
| **Description Length Out of Range** | Red textarea border, counter turns red. | *"Description must be between 10 and 2,000 characters."* |
| **Invalid Attachment Type** | Red inline banner inside attachment dropzone. | *"File type not permitted. Allowed types: JPG, PNG, WEBP, PDF."* |
| **Attachment File Size $> 5\text{ MB}$** | Red inline banner inside dropzone. | *"File exceeds maximum size of 5 MB."* |
| **Max Active Attachments Exceeded** | Dropzone hidden or disabled with amber notice. | *"Maximum active attachments (5/5) reached for this ticket."* |
| **Removal Reason $< 5$ Characters** | Textarea border red, "Confirm Removal" button disabled. | *"Please provide a removal reason of at least 5 characters."* |
| **Form Submitting (Busy)** | Submit button disabled with spinning icon; inputs disabled. | *"Submitting..."* |
| **Ticket Created Successfully** | Full-width Zen Green confirmation banner with Ticket Number. | *"Ticket TKT-YYYY-NNNNNN created successfully."* |
| **Server / API Failure** | Persistent top-level red alert banner. Entered form data preserved. | *"Failed to communicate with server. Please try again."* |
| **No Search / Filter Matches** | Clean no-results card replacing table. | *"No tickets match your filters."* + `[Clear Filters]` |

---

## 11. Accessibility Requirements

1. **Explicit Form Labels**: Every input, select, and textarea is associated with an explicit `<label>` element matching its `id`.
2. **Required Field Indicators**: Required fields feature a visual red asterisk (`*`) and programmatic `aria-required="true"`.
3. **Error Associations**: Field error messages have unique IDs referenced by `aria-describedby` on the input, paired with `aria-invalid="true"`.
4. **Visible Keyboard Focus**: All interactive controls maintain a prominent focus outline: `2px solid #0B7A46; outline-offset: 2px;`.
5. **Modal Accessibility**:
   - `role="dialog"` with `aria-modal="true"` and `aria-labelledby="modal-title"`.
   - Focus is trapped within the modal while open.
   - Pressing `Escape` cancels and closes the modal.
   - Focus is restored to the triggering element upon closure.
   - Backdrop clicking does **never** confirm or submit the modal.
6. **Non-Color Status Indicators**: Priority and status badges never rely solely on color. They contain explicit text labels (`Low`, `Medium`, `High`, `New`) and semantic SVG icons where appropriate.
7. **Semantic Heading Hierarchy**: Every page utilizes exactly one `<h1>` for page identity, followed logically by `<h2>` for major sections and `<h3>` for cards/dialogs.
8. **Touch Targets**: All interactive elements (buttons, inputs, links, pagination items) have a minimum touch target height of `44px` on mobile devices.

---

## 12. Responsive Behavior Matrix

| Viewport Width | Desktop ($\ge 992\text{px}$) | Tablet ($768\text{px}–991\text{px}$) | Mobile ($< 768\text{px}$) |
| :--- | :--- | :--- | :--- |
| **Global Shell** | Horizontal navbar with all links & requester badge visible. | Condensed navbar; requester badge shortened. | Brand logo + hamburger menu button; slide-down nav drawer. |
| **Requester Selection** | Centered card (`max-width: 540px`). | Centered card (`max-width: 500px`). | Full-width card with `16px` margins; stacked buttons. |
| **Create Ticket Layout** | 3-column system row, 3-column classification row. | 2-column system row, 2-column classification row. | Strictly 1-column vertical stack; full-width stacked buttons. |
| **My Tickets List** | Full 7-column data table with sortable headers. | Condensed 7-column table with scroll-safe cell wraps. | **Card view**: Each ticket is an independent card with clear links. |
| **Filter Toolbar** | Single horizontal flex row with all controls. | 2-row layout: Search on row 1, dropdowns on row 2. | 1-column vertical stack of search, filters, and clear button. |
| **Ticket Detail Layout** | 2-column info grid + attachment panel. | 2-column info grid stacked above attachment panel. | Strictly 1-column vertical stack; actions full width. |
| **Attachments Panel** | Multi-column active attachment rows. | Multi-column active attachment rows. | Stacked rows: icon + filename on top, actions below. |
| **Horizontal Scrolling** | None. | None. | **Strictly 0px horizontal page scroll required.** |

---

## 13. Visual Inspection Checklist

This checklist must be verified using Playwright screenshots across viewports (`Desktop: 1280x800`, `Tablet: 820x1180`, `Mobile: 375x667`):

- [ ] **Zen Green Palette Conformance**: App header is `#006B3C`, active tabs/focus rings are `#0B7A46`, page background is `#F5F7F6`, surfaces are `#FFFFFF`.
- [ ] **Zero Horizontal Scroll**: No horizontal scrollbar appears on mobile viewports ($375\text{px}$ width) on any screen.
- [ ] **No Content Clipping or Overlap**: Text labels, character counters, table cells, and attachment names wrap cleanly without clipping.
- [ ] **Editable vs. Read-Only Visual Distinction**: Editable inputs have clean white backgrounds; read-only fields have soft gray-green shading (`#F1F5F3`) and lock/user icons.
- [ ] **Required Field Asterisks**: Visible red asterisks appear on all mandatory fields.
- [ ] **Validation Message Placement**: Error text renders directly beneath the affected input, not solely in a top alert.
- [ ] **Visible Focus Indicators**: Tabbing through all controls shows the `2px solid #0B7A46` focus ring.
- [ ] **Button States**: Submit button shows clear disabled and busy spinner states during submission.
- [ ] **Badge Consistency**: Priority badges (`Low`, `Medium`, `High`) and Status badges (`New`) use consistent padding, font size, and semantic colors.
- [ ] **Empty & No-Results Distinction**: My Tickets empty state (zero tickets) is distinct from the no-results state (filters matched zero).
- [ ] **Modal Focus & Backdrop**: Attachment removal modal traps keyboard focus, closes on `Escape`, and does not confirm on backdrop click.
- [ ] **Mobile Ticket Cards**: Mobile My Tickets view presents legible cards with explicit "Ticket Number" links and "View Details" buttons.

---

## 14. UI Decisions and Rationale

This section formally records the student-owned UI design decisions and distinguishes them from fixed handout rules:

1. **System Fields Pre-Submission Display**:
   - *Decision*: Before ticket creation, Ticket Number displays `"Generated after submission"` and Ticket Date displays `"Assigned after submission"`. Both are displayed in read-only styled boxes alongside the selected Requester.
   - *Rationale*: Clearly communicates to the user that these values are managed by the server without misleading them with dummy numbers or client timestamps before creation succeeds.
2. **Requester Selection Empty State Copy**:
   - *Decision*: When no active requesters exist, the UI displays user-friendly copy: *"No active Development Requesters are available. Please contact the development team."*
   - *Rationale*: Avoids exposing developer-centric instructions (such as "run seed script") in end-user application screens.
3. **Deterministic Search & Pagination Reset**:
   - *Decision*: Typing in search triggers a request after 300 ms of inactivity; pressing `Enter` executes immediately. Any modification to search text or filter dropdowns immediately resets pagination to page 1.
   - *Rationale*: Prevents confusing user experiences where a filter change leaves the user stranded on an empty page number.
4. **Accessible Mobile Ticket Cards**:
   - *Decision*: On mobile viewports, the entire ticket card is **not** an implicit click target. Instead, the Ticket Number is a high-contrast link, and a visible `"View Details →"` button is provided.
   - *Rationale*: Ensures predictable accessibility for screen readers and keyboard navigation, preventing accidental navigations while scrolling on touch devices.
5. **Attachment Removal Modal Safety**:
   - *Decision*: The modal implements keyboard focus trapping and `Escape` key dismissal. Clicking the backdrop does not dismiss or confirm the removal.
   - *Rationale*: Soft removal is an audited state-changing action requiring explicit confirmation; requiring deliberate interaction with the "Cancel" or "Confirm Removal" buttons prevents accidental removal from unintentional background taps.
6. **Mobile Navigation Drawer**:
   - *Decision*: Mobile header uses a hamburger menu button that opens a full-width slide-down drawer with touch targets $\ge 48\text{px}$.
   - *Rationale*: Eliminates horizontal header clutter and ensures touch accessibility on compact smartphone viewports.
7. **Exclusion of IT Priority from Requester Filters**:
   - *Decision*: The filter toolbar on My Tickets includes Category, Requested Priority, and Current Status, but strictly omits IT Priority.
   - *Rationale*: In accordance with the engineering contract, written sprint specifications take precedence over illustrative mockups. IT Priority is an internal IT triage field irrelevant to requesters in Sprint 2.
