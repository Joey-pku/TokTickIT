# TokTickIT

TokTickIT is an IT Service Desk application.

## Project Structure

* `client/` - React + TypeScript + Vite frontend
* `server/` - Node.js + Express + TypeScript backend
* `server/prisma/` - Prisma database configuration

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
