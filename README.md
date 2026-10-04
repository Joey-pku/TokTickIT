# TokTickIT

TokTickIT is an IT Service Desk application.

## Project Structure

```text
TokTickIT/
|-- README.md                              # Repository overview
`-- toktickit/                             # Application workspace
    |-- client/                            # React + TypeScript frontend
    |   |-- public/favicon.svg             # Browser icon
    |   |-- src/
    |   |   |-- main.tsx, App.tsx          # Frontend entry points
    |   |   |-- AuthApp.tsx, AuthContext.tsx
    |   |   |-- LoginPage.tsx, ChangePasswordPage.tsx
    |   |   |-- AppShell.tsx, BrandMark.tsx, Icons.tsx
    |   |   |-- MyTickets.tsx, CreateTicket.tsx
    |   |   |-- RequesterTicketDetail.tsx
    |   |   |-- StaffTicketQueue.tsx, StaffTicketDetail.tsx
    |   |   |-- UserManagement.tsx
    |   |   |-- AttachmentPicker.tsx, AttachmentSection.tsx
    |   |   |-- RemovalModal.tsx, TicketComponents.tsx
    |   |   |-- api.ts, ticket-api.ts, attachment-api.ts
    |   |   |-- staff-api.ts, admin-api.ts, navigation.ts
    |   |   `-- zen-green.css              # Shared application styles
    |   |-- tests/
    |   |   |-- lab-01/                    # Foundation UI tests
    |   |   |-- lab-02/                    # Requester workflow tests
    |   |   `-- lab-03/                    # Auth, staff and admin tests
    |   |-- index.html
    |   |-- vite.config.ts, tsconfig.json
    |   `-- package.json
    |-- server/                            # Express + TypeScript API
    |   |-- prisma/
    |   |   |-- schema.prisma              # Database models
    |   |   |-- seed.ts, seed-data.ts      # Idempotent sample data
    |   |   `-- migrations/                # Lab 1-3 SQL migrations
    |   |-- scripts/
    |   |   |-- setup-test-db.mjs          # Isolated test DB setup
    |   |   `-- test-feature10.mjs         # Migration/seed verification
    |   |-- src/
    |   |   |-- index.ts, app.ts           # API entry point and middleware
    |   |   |-- auth.ts, admin.ts, staff.ts
    |   |   |-- tickets.ts, attachments.ts
    |   |   |-- attachment-dto.ts
    |   |   |-- attachment-storage.ts
    |   |   |-- attachment-validation.ts
    |   |   |-- status-workflow.ts, ticket-number.ts
    |   |   |-- user-eligibility-lock.ts
    |   |   `-- prisma.ts, errors.ts
    |   |-- tests/
    |   |   |-- lab-01/                    # Health/category API tests
    |   |   |-- lab-02/                    # Requester/attachment API tests
    |   |   `-- lab-03/                    # Auth/staff/admin API tests
    |   |-- .env.example, .env.test
    |   |-- tsconfig.json, vitest.config.ts
    |   `-- package.json
    |-- e2e/
    |   |-- lab-02/                        # Requester browser journeys
    |   |-- lab-03/                        # Auth/staff/admin/UI journeys
    |   `-- support/                       # Fixtures and global setup
    |-- docs/
    |   |-- lab-01/
    |   |-- lab-02/
    |   `-- lab-03/
    |       |-- specification.md, api-spec.md, ui-spec.md
    |       |-- tests.md, verification.md
    |       `-- ai-use.md, reviewer.md
    |-- artifacts/lab-03/
    |   |-- results/e2e-final.json         # Machine-readable E2E result
    |   `-- screenshots/                   # Reviewed UI evidence
    |-- package.json                       # Playwright command
    |-- playwright.config.ts
    `-- README.md                          # Detailed setup and verification
```

Generated folders such as `node_modules/`, `dist/`, `test-results/`, private uploads and local `.env` files are omitted.

## Prerequisites

* Node.js and npm
* PostgreSQL

## Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Backend Setup

```bash
cd server
npm install
```

Create `.env` from `.env.example` and configure the PostgreSQL connection:

```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
```

Start the backend:

```bash
npm run dev
```

Backend runs at `http://localhost:3000`.

## Database and Prisma

Make sure PostgreSQL is running on port `5432`.

Validate the Prisma schema:

```bash
npx prisma validate
```

Run migrations when Prisma models are available:

```bash
npm run prisma:migrate
```

## Testing

### Frontend

```bash
cd client
npm test
```

### Backend

```bash
cd server
npm test
```

## Environment Variables

Do not commit `.env` files or secrets.

Use `.env.example` as the template for local environment configuration.

The maintained application setup, isolated Lab 3 test-database commands, seed-account behavior, and Windows PowerShell instructions are in [`toktickit/README.md`](toktickit/README.md). Do not run test setup against the development database.
