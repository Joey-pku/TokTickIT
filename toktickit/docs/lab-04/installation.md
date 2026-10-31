# Installation and Operations Guide

## Prerequisites

- Node.js 22 or newer and npm. The final Lab 4 verification used Node 24.14.0.
- PostgreSQL reachable on `localhost:5432`, or an equivalent connection represented by `DATABASE_URL`.
- A PostgreSQL role permitted to create the isolated test databases when running automated database or browser tests.
- Chromium installed by Playwright for browser verification.

On Windows PowerShell, use `npm.cmd` and `npx.cmd` if the execution policy blocks `npm.ps1` or `npx.ps1`.

## Environment variables

Copy `server/.env.example` to `server/.env`; never commit the populated file.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection used by development, migrations, seed, and the running API. |
| `PORT` | No | API port; defaults to `3000`. |
| `UPLOAD_DIR` | No | Private attachment directory; defaults under `server/uploads/attachments`. |
| `NODE_ENV` | No | Set to `production` for secure cookies; tests set it to `test`. |
| `TEST_DATABASE_URL` | Tests only | Isolated API-test database. Its database name must end in `_test`. |

Copy `client/.env.example` to `client/.env` if a nondefault API address is needed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000` | Browser-visible API base URL. |

Playwright derives `toktickit_e2e_test` from the effective development PostgreSQL connection, then exports its own `TEST_DATABASE_URL`, temporary `UPLOAD_DIR`, and seeded browser credentials for child processes. Do not manually point E2E at the development database.

## Development installation

From the application root:

```powershell
cd server
npm.cmd ci
Copy-Item .env.example .env
# Edit .env before continuing.
npm.cmd exec -- prisma validate
npm.cmd exec -- prisma migrate status
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
npm.cmd run dev
```

`prisma:migrate` runs `prisma migrate dev`. Confirm the effective database name first. Stop if Prisma reports drift, requests a reset, or proposes unexpected schema work; do not reset a database containing needed Lab 1-3 data.

In a second terminal:

```powershell
cd client
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev -- --host localhost --strictPort
```

- Client: `http://localhost:5173`
- API: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

The checked-in seed is deterministic and non-destructive: it inserts missing canonical accounts, Tickets, and Actions without overwriting existing user-modified records. Seed accounts require a password change when first provisioned. Do not publish seed credentials.

## Production-style local build

```powershell
cd server
npm.cmd run build
npm.cmd start

cd ..\client
npm.cmd run build
npm.cmd run preview
```

The compiled API entry point is `server/dist/src/index.js`. Client preview is a local review server, not a production deployment specification.

## Isolated verification

API tests use a guarded database whose name ends in `_test`:

```powershell
cd server
npm.cmd run test:db
npm.cmd test
```

Frontend component tests do not use the development database:

```powershell
cd client
npm.cmd test
```

Playwright starts the compiled API on `3001`, Vite on `5174`, and uses `toktickit_e2e_test` plus a temporary upload directory:

```powershell
cd tocktickit
npm.cmd ci
npm.cmd exec -- playwright install chromium
npm.cmd run test:e2e
```

Run only one E2E invocation at a time against that database. Generated JSON results and failure traces are written under ignored `test-results/`.

## Troubleshooting

- **`npm.ps1` is blocked:** use `npm.cmd`/`npx.cmd` or follow the institution's approved PowerShell policy.
- **Database connection fails:** verify PostgreSQL is running, the host/port/user are correct, and the database in `DATABASE_URL` exists.
- **Migration drift or reset prompt:** stop; confirm the correct database and reconcile migration history before proceeding.
- **Port already in use:** stop the known project process or choose a deliberate alternate port; do not terminate unrelated processes.
- **Prisma engine file is locked on Windows:** stop API/test processes before regenerating Prisma Client.
- **Playwright browser missing:** run `npm.cmd exec -- playwright install chromium` from the application root.
- **`tsx` reports `uv_os_get_passwd`/`ENOMEM` on Windows:** E2E already compiles the seed and API before running them; use the checked-in Playwright setup rather than invoking a separate TypeScript runtime in that constrained environment.
- **Attachment problems:** ensure the API process can create/write the configured private upload directory. Removed attachment metadata remains for audit purposes while requester download access is denied.
