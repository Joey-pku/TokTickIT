# TokTickIT

TokTickIT is a role-based IT service-desk application for submitting, coordinating, documenting, and resolving support Tickets. Lab 4 completes the workflow with auditable Actions Taken, controlled eight-state Ticket transitions, Requester and Staff dashboards, and responsive Zen Green interfaces.

## Capabilities

- **Requesters:** sign in, create and search their Tickets, manage attachments, read public comments and Actions Taken, use the personal dashboard, and indicate that a problem appears resolved.
- **IT Staff:** use the operational dashboard and queue, assign Tickets, set IT priority, add public comments and confidential notes, record and complete Actions, and perform permitted Ticket transitions.
- **Administrators:** have Staff operational access plus User Management for provisioning, role/active-state changes, and temporary-password resets.
- **Platform:** database-backed sessions, CSRF checks, role/ownership enforcement, optimistic workflow and Action versions, idempotent Action creation, audit revisions, and private attachment storage.

## Technology and architecture

React 18, TypeScript, Vite, Bootstrap, and the Zen Green CSS system provide the browser client. Express and TypeScript expose a JSON API backed by PostgreSQL through Prisma. Vitest, Testing Library, Supertest, and Playwright provide unit, component, API/integration, and browser coverage.

```text
Browser (localhost:5173)
  -> React routes and role shell
  -> credentialed JSON requests
API (localhost:3000)
  -> session, CSRF, role and ownership checks
  -> service transactions and Prisma
PostgreSQL + private attachment directory
```

## Repository layout

```text
toktickit/
|-- client/                 React application and component tests
|-- server/                 Express API, Prisma, migrations and API tests
|-- e2e/                    Playwright Labs 2-4 journeys and safe setup
|-- docs/lab-04/            Contract, guides, traceability and evidence
|-- artifacts/              Opt-in reviewed browser evidence
|-- playwright.config.ts
`-- package.json            Playwright command
```

## Quick start

Requirements: Node.js 22 or newer, npm, and PostgreSQL. Commands below are run from this `toktickit/` directory; use `npm.cmd` instead of `npm` on Windows systems that block `npm.ps1`.

```powershell
cd server
npm.cmd ci
Copy-Item .env.example .env
# Edit .env and verify DATABASE_URL names the intended development database.
npm.cmd exec -- prisma migrate status
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
npm.cmd run dev
```

In another terminal:

```powershell
cd client
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev -- --host localhost --strictPort
```

Open `http://localhost:5173`; the API is `http://localhost:3000`. Seed accounts use an initial password and must change it after sign-in. Credentials belong in controlled course/demo material, not documentation or source control.

See the [installation guide](docs/lab-04/installation.md) for database safety, environment variables, production builds, isolated tests, and troubleshooting.

## Development and verification commands

| Area | Command | Working directory |
| --- | --- | --- |
| API development | `npm run dev` | `server/` |
| Client development | `npm run dev` | `client/` |
| API build/start | `npm run build`; `npm start` | `server/` |
| Client production build | `npm run build`; `npm run preview` | `client/` |
| Backend tests | `npm run test:db`; `npm test` | `server/` |
| Frontend tests | `npm test` | `client/` |
| Browser tests | `npm run test:e2e` | application root |
| Prisma validation | `npx prisma validate` | `server/` |

## Documentation

- [Engineering specification](docs/lab-04/specification.md)
- [Approved API contract](docs/lab-04/api-spec.md)
- [UI contract](docs/lab-04/ui-spec.md)
- [Test design and traceability](docs/lab-04/tests.md)
- [Installation and operations](docs/lab-04/installation.md)
- [Role-based user guide](docs/lab-04/user-guide.md)
- [Implemented API index](docs/lab-04/api-reference.md)
- [Feature 21 test report](docs/lab-04/feature-21-test-report.md)
- [Feature 22 UI/accessibility review](docs/lab-04/feature-22-ui-accessibility-review.md)
- [Final delivery evidence and checklist](docs/lab-04/final-delivery.md)

## Known limitations

- The application is configured for local origins `http://localhost:5173` and `http://localhost:5174`; deployment configuration is outside the Lab 4 scope.
- Attachment storage is local/private filesystem storage, not an external object store.
- Action audit revisions are internal evidence and have no user-facing read API or screen.
- Automated checks do not prove full WCAG compliance. Screen-reader, 200% zoom, and subjective visual/contrast review remain manual.
- Screenshot evidence is opt-in; verify the official handout and course submission portal for any required PDF, video, screenshots, naming, or upload format.
