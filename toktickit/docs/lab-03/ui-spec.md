# Lab 3 UI Specification

> **Document Status**: Draft — Pending Review  
> **Target Branch**: `docs/lab3-engineering-contract`  
> **Course Stack**: React + TypeScript + Vite + Vanilla CSS (Zen Green Design System)

---

## 1. Purpose and UI Principles

### 1.1 Purpose
This document establishes the binding visual design and interaction specification for **TokTickIT Lab 3 (Users, Roles, IT Staff Ticketing, and Admin Screens)**. It extends the Zen Green design system established in Lab 2 and provides exact component layouts, design tokens, responsive behaviors, screen modes, accessibility requirements, and visual state guidelines for all Lab 3 user journeys.

### 1.2 UI Principles & Zen Green Philosophy
1. **Zen Green Continuity**: Maintain the calm, focused, and professional aesthetic centered on deep forest greens (`#006B3C`), sage accents, quiet near-white surfaces (`#F5F7F6`), and crisp neutral borders. New screens must appear as an organic extension of the application.
2. **Role-Tailored Navigation & Visibility**: The application shell and available navigation items adapt dynamically to the authenticated user's role (`Requester`, `IT Staff`, `Administrator`). Unauthorized navigation targets are never rendered.
3. **Clear Operational vs. Read-Only Context**: Visual cues immediately distinguish immutable audit metadata from editable operational controls (e.g., ticket ownership dropdowns, IT Priority selects, and status transition menus).
4. **Visual Segregation of Confidential Information**: Public Comments and Internal Notes must have unmistakably distinct visual styling to ensure IT Staff never accidentally disclose internal operational notes to requesters.
5. **Responsive-First Fluidity (Zero Page Overflow)**: Every view adapts flawlessly across Desktop ($\ge 992\text{px}$), Tablet ($768\text{px}–991\text{px}$), and Mobile ($< 768\text{px}$) viewports with strictly zero overall horizontal page scrolling.
6. **Accessibility by Design (WCAG 2.1 AA)**: Semantic markup, keyboard focus outlines, ARIA attributes, non-color status indicators, clear validation messaging, and touch-friendly targets ($\ge 44\text{px}$).

---

## 2. Design Tokens and Extended Styles

### 2.1 Color Palette Tokens
| Token Name | Hex Code | Intended Usage & Placement |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | App header bar, primary CTA buttons ("Sign In", "Save User", "Post Comment"). |
| `--color-secondary-green` | `#0B7A46` | Active navigation tabs, focus rings, secondary button outlines, hover highlights. |
| `--color-pale-green` | `#EAF6EF` | Selected table row tint, public comment bubbles, subtle section backgrounds. |
| `--color-page-bg` | `#F5F7F6` | Default body and viewport background (soothing off-white). |
| `--color-surface` | `#FFFFFF` | Card surfaces, modal dialogs, input backgrounds, table containers. |
| `--color-text-main` | `#1C2A24` | Primary body copy, headers, and form labels. |
| `--color-text-muted` | `#475569` | Secondary captions, helper text, timestamps, read-only field text. |
| `--color-text-placeholder` | `#94A3B8` | Form input placeholder text. |
| `--color-border-editable` | `#CBD5E1` | Default neutral border for interactive text inputs, dropdowns, and textareas. |
| `--color-border-subtle` | `#E2E8E5` | Card dividers, table borders, and read-only field borders. |
| `--color-readonly-bg` | `#F1F5F3` | Soft gray-green background for read-only / system-generated fields. |

### 2.2 Semantic, Priority & Role Tokens
| Token Name | Text Color | Border Color | Background Color | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--color-error` | `#DC2626` | `#F87171` | `#FEE2E2` | Error banners, validation alerts, destructive actions. |
| `--color-warning` | `#B45309` | `#FBBF24` | `#FEF3C7` | `MEDIUM` priority badges, `WAITING_FOR_REQUESTER` status. |
| `--color-success` | `#15803D` | `#86EFAC` | `#DCFCE7` | `RESOLVED` status badges, confirmation alerts, active state badges. |
| `--color-info` | `#1D4ED8` | `#93C5FD` | `#DBEAFE` | `OPEN`, `IN_PROGRESS` status badges. |
| `--color-neutral` | `#4B5563` | `#D1D5DB` | `#F3F4F6` | `CLOSED`, `CANCELLED` status badges, inactive user badges. |
| `--color-note-internal-bg` | `#78350F` | `#FDE68A` | `#FFFBEB` | Background, text, and border for confidential Internal Notes thread. |

### 2.3 Status Badge Matrix
| Status | Badge Background | Badge Text | Visual Cue / Icon |
| :--- | :--- | :--- | :--- |
| **New** | `#DCFCE7` (Pale Green) | `#15803D` (Dark Green) | Green solid dot |
| **Open** | `#DBEAFE` (Pale Blue) | `#1D4ED8` (Blue) | Blue solid dot |
| **In Progress** | `#E0E7FF` (Pale Indigo) | `#4338CA` (Indigo) | Indigo pulsing dot |
| **Waiting for Requester** | `#FEF3C7` (Pale Amber) | `#B45309` (Amber) | Amber pause dot |
| **Resolved** | `#D1FAE5` (Pale Emerald)| `#047857` (Emerald) | Checkmark icon |
| **Closed** | `#F3F4F6` (Pale Gray) | `#4B5563` (Dark Gray) | Lock icon |
| **Reopened** | `#FCE7F3` (Pale Pink) | `#BE185D` (Dark Pink) | Arrow-circle icon |
| **Cancelled** | `#FEE2E2` (Pale Red) | `#B91C1C` (Dark Red) | Cross icon |

### 2.4 Priority, Role & State Badges
- **Requested Priority & IT Priority Badges**:
  - `HIGH`: Background `#FEE2E2`, Text `#B91C1C`, Border `#FCA5A5`
  - `MEDIUM`: Background `#FEF3C7`, Text `#B45309`, Border `#FBBF24`
  - `LOW`: Background `#D1FAE5`, Text `#047857`, Border `#6EE7B7`
- **Role Badges**:
  - `Requester`: Background `#EAF6EF`, Text `#006B3C`, Border `#86EFAC`
  - `IT Staff`: Background `#DBEAFE`, Text `#1E40AF`, Border `#93C5FD`
  - `Administrator`: Background `#F3E8FF`, Text `#6B21A8`, Border `#D8B4FE`
- **User Activation State Badges**:
  - `Active`: Background `#DCFCE7`, Text `#15803D`, Border `#86EFAC`
  - `Inactive`: Background `#FEE2E2`, Text `#B91C1C`, Border `#FCA5A5`

---

## 3. Application Shell and Navigation

### 3.1 Header Navigation Layout
The global navigation header spans the full viewport width:
- **Height**: `64px` on Desktop/Tablet; `56px` on Mobile.
- **Brand Identity (Left)**: A clear clock-face glyph with hands + "TokTickIT" title. The brand remains a link to the application root; the same clock mark is used on authentication screens and as the favicon.
- **Role-Based Navigation Tabs (Center-Left)**:
  - **Requester**:
    - `My Tickets` (`/tickets`)
    - `Create Ticket` (`/tickets/new`)
  - **IT Staff**:
    - `Ticket Queue` (`/staff/queue`)
    - `Create Ticket` (`/tickets/new`)
  - **Administrator**:
    - `User Management` (`/admin/users`)
    - `Ticket Queue` (`/staff/queue`)
- **User Profile Menu (Right)**:
  - One avatar-icon button opens a right-aligned dropdown shared by Requester, IT Staff, and Administrator.
  - The dropdown displays the authenticated user's full name and role badge, followed by `Change Password` and `Logout` actions.
  - The menu closes after an action, an outside click, or Escape. Escape restores focus to the trigger. The trigger exposes an accessible label, `aria-expanded`, and menu relationship; Arrow Down opens the menu and focuses its first action.
  - The menu width is constrained to the mobile viewport and must not cause horizontal page overflow.

```
+-----------------------------------------------------------------------------------------+
| [Clock] TokTickIT   [Ticket Queue / User Management]  [Create Ticket]            | (Profile) |
+-----------------------------------------------------------------------------------------+
```

### 3.2 Mobile Navigation Drawer
- Mobile header presents the clock brand, an accessible hamburger button (`aria-label="Toggle navigation"`), and the same profile-menu button used at larger sizes.
- Activating the hamburger opens a slide-over navigation drawer displaying:
  1. Role-specific navigation links with minimum touch targets of $48\text{px}$.
- Account identity and actions remain consolidated in the separate profile dropdown; they are not duplicated in the navigation drawer.

---

## 4. Screen Layouts and Interaction Specifications

### 4.1 Login Screen (`/login`)
- **URL Route**: `/login`
- **Access**: Public (redirects authenticated users to their role default screen).
- **Structure**:
  - Centered card container (max-width `440px`) on `--color-page-bg`.
  - Brand header: TokTickIT clock logo, "Sign in to your account" heading, subtitle.
  - Form fields:
    - **Email address**: Input (`type="email"`), placeholder `name@example.com`, autofocus.
    - **Password**: Input (`type="password"`), toggle show/hide password eye button. (Password input is not trimmed).
  - Action button:
    - **Sign In** button: Primary green full-width button. Enters disabled busy state with spinner when processing.
  - Feedback / Error Handling:
    - Safe generic error banner on invalid credentials or inactive account: *"Invalid email or password. Please try again."*
    - Field-level validation for missing email or password.
    - Rate limit exceeded banner (HTTP 429): *"Too many failed login attempts. Please try again later."*

```
+--------------------------------------------------+
|                    [TokTickIT]                   |
|              Sign in to your account             |
|                                                  |
|  Email address *                                 |
|  [ jennifer.anderson@example.com               ] |
|                                                  |
|  Password *                                      |
|  [ ************                              (o) ] |
|                                                  |
|  [!] Invalid email or password. Please try again. |
|                                                  |
|  [                 Sign In                     ] |
+--------------------------------------------------+
```

---

### 4.2 Mandatory Change Password Screen (`/change-password`)
- **URL Route**: `/change-password`
- **Access**: Authenticated users.
- **Structure**:
  - Centered card container (max-width `480px`).
  - Heading: "Change Your Password". Subtitle: "You must change your password to continue."
  - Form fields (none are trimmed or truncated):
    - **Current (temporary) password**: Input with visibility toggle.
    - **New password**: Input with visibility toggle.
    - **Confirm new password**: Input with visibility toggle.
  - Password Requirements Checklist (dynamically updates with green checkmarks as requirements are met):
    - [x] Be at least 8 characters (measured using `Array.from(pwd).length >= 8`)
    - [x] At most 72 UTF-8 bytes (measured using `new TextEncoder().encode(pwd).length <= 72`)
    - [x] Include uppercase and lowercase letters
    - [x] Include a number and a special character
    - [x] Must differ from current password
  - Actions:
    - **Continue / Save Password** button: Primary CTA button, disabled until all criteria are satisfied.
    - **Sign Out** secondary button (allows user to abort session).

```
+--------------------------------------------------+
|               Change Your Password               |
|     You must change your password to continue.   |
|                                                  |
|  Current (temporary) password *                  |
|  [ *******                                   (o) ] |
|                                                  |
|  New password *                                  |
|  [ ************                              (o) ] |
|                                                  |
|  Confirm new password *                          |
|  [ ************                              (o) ] |
|                                                  |
|  Password must:                                  |
|  [v] Be at least 8 characters (max 72 bytes)     |
|  [v] Include uppercase and lowercase letters     |
|  [v] Include a number and a special character    |
|  [v] Differ from current password                |
|                                                  |
|  [                Continue                     ] |
+--------------------------------------------------+
```

---

### 4.3 Requester Ticket Detail & Public Comments
- **URL Route**: `/tickets/:ticketId`
- **Access**: Ticket Owner only (404 for non-owner requesters).
- **Features**:
  - Header: Ticket Number, Creation Date, Current Status badge, Requested Priority badge.
  - Details Grid: Requester Name (read-only), Category, Related System, IT Priority (read-only for Requester).
  - Summary & Description: Card displaying user submission.
  - **"Problem Appears Resolved" Action**:
    - Displayed in the header banner for the ticket owner when status is in `OPEN`, `IN_PROGRESS`, or `WAITING_FOR_REQUESTER`.
    - Clicking opens a confirmation dialog: *"Confirm Problem Resolved? This will notify IT Staff that your issue appears resolved."*
    - Explanatory UI caption: *"Posting a new comment will clear this indication."*
    - On confirmation, submits `POST /api/tickets/:ticketId/appear-resolved` with `{}`.
    - Updates UI to display green alert: *"You indicated on [Date/Time] that the problem appears resolved. (Posting a new comment will clear this indication)."*
  - **Public Comments Section**:
    - Comment feed showing author avatar, author name, role badge, timestamp, and comment text (rendered safely as plain text).
    - "Add Public Comment" textarea (1-2000 characters) with "Post Comment" button.
  - **Attachments Section**:
    - Preserves Lab 2 attachment list, upload dropzone, download triggers, and soft-removal modal with audit tracking.

---

### 4.4 IT Staff Ticket Queue (`/staff/queue`)
- **URL Route**: `/staff/queue`
- **Access**: IT Staff, Administrator.
- **Structure**:
  - Page Title: "Ticket Queue" (with total open ticket count pill).
  - Search & Filter Bar:
    - Search input: Placeholder *"Search by ticket number, summary, or requester..."*
    - Category filter dropdown.
    - Status filter dropdown (`All Statuses`, `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`).
    - IT Priority filter dropdown (`All Priorities`, `High`, `Medium`, `Low`).
    - Ownership filter tabs/dropdown: `All Tickets` | `Assigned to Me` | `Unassigned`.
  - Desktop Table View ($\ge 992\text{px}$):
    - Columns: `Ticket No.` (clickable link), `Created Date`, `Summary`, `Category`, `Req Priority`, `IT Priority`, `Status`, `Owner`, `Last Updated`.
    - Column sorting indicators (`▲`/`▼`) on sortable columns.
    - Row hover highlight (`--color-pale-green`).
  - Tablet Table View ($768\text{px}–991\text{px}$):
    - Contained within an internal horizontal-scroll element, keeping the outer page fixed (0px page overflow).
  - Mobile Card View ($< 768\text{px}$):
    - Stacked card per ticket displaying Ticket No., Status badge, Summary, Category, IT Priority badge, Owner, and "View Details" button.
  - Pagination Bar:
    - Summary text: *"Showing 1 to 10 of 87 tickets"*
    - Page navigation buttons: `Previous`, `1`, `2`, `3` ... `Next`.
    - Page size selector: `10`, `25`, `50` per page.

```
+------------------------------------------------------------------------------------------------------------------------+
|  Ticket Queue  [87 Open]                                                                                               |
|                                                                                                                        |
|  [ Q Search tickets...                   ] [ Category v ] [ Status v ] [ IT Priority v ] [ Owner: All v ]              |
|                                                                                                                        |
|  Ticket No.    Created Date     Summary                  Category    Req Priority  IT Priority  Status      Owner      |
|  --------------------------------------------------------------------------------------------------------------------  |
|  TKT-2026-0124 May 12, 09:14 AM Laptop battery drains.. Hardware    [Medium]      [High]       [In Progress] Mike B.  |
|  TKT-2026-0123 May 12, 08:02 AM Cannot connect to VPN   Network     [High]        [High]       [Open]        Unassigned |
|  TKT-2026-0122 May 11, 04:40 PM Email sync error on iOS Software    [Medium]      [Medium]     [Waiting]     Sarah J. |
|                                                                                                                        |
|  Showing 1 to 10 of 87 tickets                                                    < Previous  [1]  2  3  ...  Next >   |
+------------------------------------------------------------------------------------------------------------------------+
```

---

### 4.5 IT Staff Ticket Detail (`/staff/tickets/:ticketId`)
- **URL Route**: `/staff/tickets/:ticketId`
- **Access**: IT Staff, Administrator.
- **Structure**:
  - Breadcrumb: `Ticket Queue > Ticket Detail` with `← Back to Queue` button.
  - Top Operational Control Bar:
    - **Owner Assignment Dropdown**: Displays current owner with options: `Claim Ticket (Assign to Me)`, list of active IT Staff / Admins, or `Unassign`. (Claiming a `NEW` ticket automatically transitions status to `OPEN`).
    - **IT Priority Dropdown**: `LOW`, `MEDIUM`, `HIGH` (updates immediately on change).
    - **Current Status Dropdown**: Shows permitted next statuses based on BR-13 transition matrix.
  - Requester Resolution Alert:
    - If `requesterResolved = true`, displays prominent green banner: *"Requester Jennifer Anderson indicated on May 13, 2026 at 09:20 AM that the problem appears resolved."*
  - Ticket Context Cards:
    - Ticket Number, Category, Related System, Requester Name & Email, Creation Date.
    - Summary & Full Description.
  - Tabbed / Stacked Activity Workspace:
    - **Tab 1: Public Comments**:
      - Thread of messages exchanged with Requester (rendered safely as plain text).
      - Input form to post a public response.
    - **Tab 2: Confidential Internal Notes**:
      - Prominently styled container with soft amber background (`--color-note-internal-bg`) and lock icon.
      - Clear callout banner: *"🔒 Internal Notes are strictly confidential and never visible to Requesters."*
      - Feed of internal notes with staff author and timestamp (rendered safely as plain text).
      - "Add Internal Note" input and submit button.
    - **Tab 3: Attachments**:
      - Complete attachment list with active download links, soft-removal triggers, and audit log.

```
+---------------------------------------------------------------------------------------------------+
|  < Back to Queue    Ticket TKT-2026-001234                                                        |
|                                                                                                   |
|  Ticket Owner: [ Michael Brown (IT Staff) v ]   IT Priority: [ High v ]   Status: [ In Progress v ] |
|                                                                                                   |
|  [v] Requester Jennifer Anderson indicated on May 13, 09:20 AM that the problem appears resolved.  |
|                                                                                                   |
|  Requester: Jennifer Anderson (Marketing)         Category: Hardware     System: Corporate Laptop |
|  Summary: Laptop battery drains quickly                                                           |
|  Description: My laptop battery is draining much faster than usual even when the system is idle.  |
|                                                                                                   |
|  [ Public Comments (3) ]   [ 🔒 Internal Notes (2) ]   [ Attachments (2) ]                        |
|  +---------------------------------------------------------------------------------------------+  |
|  | 🔒 Confidential Internal Notes (Visible ONLY to IT Staff & Admin)                           |  |
|  |                                                                                             |  |
|  | [MS] Michael Brown (IT Staff) - May 13, 10:30 AM                                            |  |
|  | Battery diagnostic reports 62% battery health. Will order replacement battery unit.         |  |
|  |                                                                                             |  |
|  | [ Add Internal Note...                                                                    ] |  |
|  |                                                                        [ Post Internal Note ] |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

### 4.6 Administrator User Management (`/admin/users`)
- **URL Route**: `/admin/users`
- **Access**: Administrator only.
- **Structure**:
  - Page Header: Title "User Management", subtitle "Manage accounts, roles, and access.", and `+ Create User` button.
  - Search & Filter Bar:
    - Search input: *"Search users by name or email..."*
    - Role filter dropdown: `All Roles` | `Requester` | `IT Staff` | `Administrator`.
  - User List Table:
    - Columns: `Name`, `Email`, `Role` (colored badge), `Status` (`Active` / `Inactive` badge), `Actions` (`Edit` button).
  - **Create User Modal**:
    - Fields:
      - `Full Name *` (text input, min 2 chars).
      - `Email Address *` (email input, validated for case-insensitive uniqueness).
      - `Role *` (dropdown: `Requester`, `IT Staff`, `Administrator`).
      - `Active Status` (toggle switch: `Active` / `Inactive`, default `Active`).
      - `Initial Password *` (typed directly; minimum 8 Unicode code points via `Array.from(pwd).length >= 8`, maximum 72 UTF-8 bytes; un-trimmed).
    - Helper note: *"User will be required to change their password on first login."*
    - Action buttons: `Save User` (primary green), `Cancel`.
  - **Edit User Modal**:
    - Fields:
      - `Full Name *`, `Email Address *`, `Role *`.
      - `Active Status` (toggle switch).
        - *Safety validation*: Disabled or guarded with error tooltip if user is current admin or last active admin.
    - Safety Action:
      - `Reset Initial Password` button (reveals input to type a new temporary password and sets `mustChangePassword = true`).
    - Action buttons: `Save Changes`, `Cancel`.

```
+------------------------------------------------------------------------------------+
|  User Management                                                   [ + Create User ]|
|  Manage accounts, roles, and access.                                               |
|                                                                                    |
|  [ Q Search users by name or email...              ] [ Role: All Roles v ]         |
|                                                                                    |
|  Name                 Email                         Role            Status  Action |
|  --------------------------------------------------------------------------------  |
|  Jennifer Anderson    jennifer.anderson@example.com [Requester]     [Active] [Edit]|
|  Michael Brown        staff.mike@toktickit.com      [IT Staff]      [Active] [Edit]|
|  System Admin         admin@toktickit.com           [Administrator] [Active] [Edit]|
|  Kevin Patel          staff.kevin@toktickit.com     [IT Staff]      [Inact.] [Edit]|
+------------------------------------------------------------------------------------+
```

---

## 5. Screen Modes and Feedback States

Every screen implements dedicated visual representations for the following universal states:
1. **Initial / Pristine Mode**: Clear, clean form controls ready for input with informative placeholders.
2. **Busy / Loading Mode**: Buttons display inline spinners and are disabled; tables show skeleton rows or centered loader.
3. **Success Feedback Mode**: Dismissible green banner alerts (`--color-success`) confirming mutations (e.g. "User created successfully", "Password changed successfully").
4. **Empty / Zero-State Mode**: Clear graphical icon, descriptive title, and helpful callout (e.g. "No tickets in queue").
5. **No-Results Mode**: Clear message when filters yield no matches with a "Reset Filters" action.
6. **Validation Error Mode**: Red border highlight on invalid input fields with inline error text beneath the field.
7. **Forbidden / Unauthorized Mode**: Clean Zen Green 403 screen with explanation and button to return to allowed dashboard.
8. **Safe Server Failure Mode**: Non-technical error banner ("Unable to complete request. Please try again later.").

---

## 6. Responsive and Accessibility Rules

### 6.1 Responsive Breakpoints & Zero-Overflow Rules
- **Desktop ($\ge 992\text{px}$)**: Full multi-column grids, horizontal navigation header, comprehensive data tables.
- **Tablet ($768\text{px}–991\text{px}$)**: Compact tables in responsive horizontal-scroll containers (container-only scroll, keeping the overall page layout fixed with zero window overflow).
- **Mobile ($< 768\text{px}$)**:
  - Header collapses into hamburger navigation drawer.
  - Tables convert into structured vertical card stacks.
  - Modals expand to full-screen overlays with fixed top header and bottom sticky action buttons.
  - Strictly **0px horizontal page overflow**.

### 6.2 Accessibility Standards (WCAG 2.1 AA)
- **Keyboard Navigation**: All interactive elements (inputs, selects, buttons, links, toggles) are reachable via `Tab` / `Shift+Tab`.
- **Focus Rings**: Universal visible focus indicator: `outline: 2px solid var(--color-secondary-green); outline-offset: 2px;`.
- **ARIA & Semantic Roles**:
  - Modals feature `role="dialog"`, `aria-modal="true"`, and trapped focus.
  - Dropdowns feature `aria-expanded` and `aria-haspopup`.
  - Badges and status indicators pair text labels with visual colors (no color-only meaning).
  - Form inputs feature explicit `<label for="...">` associations and `aria-describedby` for validation errors.
- **Touch Targets**: Minimum hit area of $44 \times 44\text{px}$ for all touchable controls on mobile devices.

---

## 7. Practical Visual Verification Checklist

| Area | Verification Item | Expected Behavior |
| :--- | :--- | :--- |
| **Header** | Role-based navigation items | Requester sees My Tickets/Create; Staff sees Queue/Create; Admin sees User Mgmt/Queue. |
| **Header** | User profile avatar & menu | Icon-only accessible trigger; dropdown with full name, role badge, Change Password, and Logout. |
| **Login** | Password visibility toggle | Clicking eye icon toggles password between masked dots and plain text. |
| **Login** | Busy state on submit | Sign In button displays spinner and is disabled while authentication request is in flight. |
| **Change Password** | Password complexity checklist | Dynamic green checkmarks appear as length ($\ge 8$ code points, $\le 72$ bytes), casing, number, symbol, and difference rules pass. |
| **Staff Queue** | Status and priority badges | Consistent badge colors for all 8 statuses and 3 priority levels. |
| **Staff Queue** | Sort & filter reactivity | Changing category/status/priority/owner immediately re-queries queue without reload. |
| **Staff Detail** | Confidential notes distinction | Internal notes container has amber background, lock icon, and prominent confidentiality callout. |
| **Staff Detail** | "Problem Appears Resolved" alert | Prominent green banner displayed when `requesterResolved = true` with date/time. |
| **Requester Detail** | "Problem Appears Resolved" button | Button displayed with caption note: "Posting a new comment will clear this indication." |
| **Admin Users** | User list & active toggle | Badges show Active/Inactive; Admin self-deactivation and last-admin demotion are disabled. |
| **Responsive** | Mobile viewport (<768px) | Hamburger menu opens drawer; tables stack into cards; 0px horizontal page overflow. |
| **Accessibility** | Focus indicator ring | Pressing Tab displays clear green outline (`#0B7A46`) on all interactive elements. |
