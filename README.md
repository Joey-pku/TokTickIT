# TokTickIT

TokTickIT is an IT Service Desk application.

## Project Structure

```text
TokTickIT/
|-- README.md                    # Repository overview
`-- toktickit/                   # Application workspace
    |-- client/                  # React, TypeScript and Vite frontend
    |   |-- public/              # Static assets and favicon
    |   |-- src/                 # Pages, components and API clients
    |   `-- tests/               # Vitest component and client tests
    |-- server/                  # Node.js, Express and TypeScript API
    |   |-- prisma/              # Schema, migrations and seed data
    |   |-- scripts/             # Guarded database verification scripts
    |   |-- src/                 # API routes and business logic
    |   `-- tests/               # Vitest unit and API tests
    |-- e2e/                     # Playwright browser tests and support
    |   |-- lab-02/
    |   |-- lab-03/
    |   `-- support/
    |-- docs/                    # Specifications and delivery records
    |   |-- lab-01/
    |   |-- lab-02/
    |   `-- lab-03/
    |-- artifacts/               # Saved verification results and screenshots
    |-- package.json             # Repository-level E2E commands
    `-- playwright.config.ts     # Playwright configuration
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
