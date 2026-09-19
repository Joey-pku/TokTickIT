# TokTickIT

TokTickIT is an IT Service Desk application.

## Project Structure

* `client/` - React + TypeScript + Vite frontend
* `server/` - Node.js + Express + TypeScript backend
* `server/prisma/` - Prisma database configuration

## Prerequisites

* Node.js >=22 and npm. Part 4 was executed on Node 24.14.0; Node 22 was not execution-tested. The installed `file-type@22.0.2` and `content-disposition@3.0.0` require Node >=22.
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

## Lab 3 authentication and verification

Lab 3 replaces the development requester selector and `x-requester-id` identity with
database-backed sessions. Open the application and sign in with a seeded account;
accounts still using their initial password are required to change it before using
ticket features.

On Windows PowerShell use `npm.cmd` to avoid the local script execution-policy restriction on `npm.ps1`.
Before migrating, confirm the effective `DATABASE_URL` identifies the intended development database. Environment variables override `.env`.
From `server/`:

```powershell
npm.cmd ci
npm.cmd exec -- prisma migrate status
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
npm.cmd exec -- prisma validate
$env:NODE_ENV = 'development'
$env:PORT = '3000'
npm.cmd run dev
```

Apply checked-in migrations only. If Prisma reports drift, requests a reset, or proposes unexpected schema work, stop and investigate. Never run test cleanup against development. Stop project server processes before regenerating Prisma Client on Windows if its engine DLL is locked.

From a separate terminal in `client/`:

```powershell
npm.cmd ci
$env:VITE_API_URL = 'http://localhost:3000'
npm.cmd run dev -- --host localhost --strictPort
```

PostgreSQL uses localhost:5432; frontend uses http://localhost:5173; API uses http://localhost:3000. This machine's PostgreSQL service is `postgresql-x64-18`; installations elsewhere may use a different service name. Do not stop another process merely to reclaim a port.

For the compiled server, run `npm.cmd run build` followed by `npm.cmd start` in `server/`. Its entry point is `dist/src/index.js`.

Development attachments default to private `server/uploads/attachments/`. `UPLOAD_DIR` can override that path. Removal retains audit metadata and may retain the binary; requester downloads of removed files return 404.

### Isolated tests

From `server/`, `npm.cmd run test:db` prepares the API-test database configured by `TEST_DATABASE_URL` / `.env.test` (default database name `toktickit_test`), then `npm.cmd test` runs API tests. The database name must end in `_test`. From `client/`, run `npm.cmd test`.

Feature 10 migration and seed verification uses disposable databases whose
names begin `toktickit_feature10_` and end `_test`:

```powershell
cd server
npm.cmd run test:feature10
```

The harness stages the Lab 2 migrations in a temporary directory, verifies an
upgrade and a fresh installation, and drops only databases it created and
tracked. It explicitly refuses the development and shared test database names.
`User.email` case-insensitive uniqueness is maintained by the migration's
SQL-managed `User_email_lower_key` functional index because Prisma 5 cannot
declare functional indexes. `Session.token` stores a SHA-256 digest of a future
opaque cookie token; it must never store the raw cookie token.

For E2E, from `toktickit/`:

```powershell
npm.cmd ci
npm.cmd exec -- playwright install chromium
npm.cmd run test:e2e
```

Playwright uses a real API on 3001, Vite on 5174 and the dedicated `toktickit_e2e_test` database. It derives connection credentials from the effective development connection, replaces the database name, and never resets development. The PostgreSQL role must be able to create the E2E database if absent. E2E preparation does not write `server/.env.test`. Do not share the E2E database with another simultaneous run.

Tests seed reference data, create their own tickets, and clean their mutable data. Uploads use an isolated temporary directory named `toktickit-attachments-test-e2e-*`; normal development storage is untouched. One worker and zero automatic retries are configured.

To refresh the selected screenshot evidence:

```powershell
$env:CAPTURE_EVIDENCE = '1'
$env:E2E_REPORT = 'artifacts/lab-02/results/e2e-green.json'
npm.cmd run test:e2e
```

The explicit development browser check is `node e2e/support/manual-development.mjs` from `toktickit/`, with development servers already running. **It creates and retains a development verification ticket and a soft-removed attachment audit record.** It is not an isolated test and performs no database cleanup.

See [Part 4 verification](docs/lab-02/verification.md), [AI use](docs/lab-02/ai-use.md), and [review findings](docs/lab-02/reviewer.md). The final submission PDF and human peer-review evidence remain separate delivery responsibilities.
