// Explicitly requested browser-driven development verification. This is not an
// E2E fixture: it retains its new ticket/audit record and performs no DB cleanup.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(resolve('server/package.json'));
const { PrismaClient } = require('@prisma/client');
const source = process.env.DATABASE_URL || (await readFile('server/.env', 'utf8')).match(/^DATABASE_URL=["']?([^"'\r\n]+)/m)?.[1];
const target = new URL(source);
assert.equal(target.hostname, 'localhost'); assert.equal(target.pathname, '/toktickit');
const db = new PrismaClient({ datasources: { db: { url: source } } });
const result = { runtime: process.version, api: 'http://localhost:3000', frontend: 'http://localhost:5173', database: 'toktickit', startedAt: new Date().toISOString(), steps: [] };
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const mark = step => { result.steps.push(step); console.log(step); };
try {
  assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name, 'toktickit');
  const a = await db.user.findFirstOrThrow({ where: { email: 'jennifer.anderson@example.com', role: 'REQUESTER', isActive: true } });
  const b = await db.user.findFirstOrThrow({ where: { email: 'david.lee@example.com', role: 'REQUESTER', isActive: true } });
  const categories = (await (await context.request.get(`${result.api}/api/categories`)).json()).items;
  const systems = (await (await context.request.get(`${result.api}/api/related-systems`)).json()).items;
  const login = async user => {
    await page.goto(`${result.frontend}/login`);
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('Initial123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('heading', { name: 'My Tickets', exact: true }).waitFor();
  };
  await login(a); await page.reload(); await page.getByRole('heading', { name: 'My Tickets', exact: true }).waitFor(); mark('Requester authenticated and session persisted after reload');
  await page.goto(`${result.frontend}/tickets/new`);
  await page.getByLabel('Category').selectOption(String(categories[0].id)); await page.getByLabel('Related System').selectOption(String(systems[0].id));
  await page.getByLabel('Ticket Summary').fill('Part 4 manual development verification');
  await page.getByLabel('Description').fill('Browser-driven verification of the complete requester workflow on the development database.');
  const created = page.waitForResponse(r => r.url() === `${result.api}/api/tickets` && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit Ticket' }).click(); const response = await created; assert.equal(response.status(), 201);
  const ticket = await response.json(); result.ticketId = ticket.id; result.ticketNumber = ticket.ticketNumber;
  assert.match(ticket.ticketNumber, /^TKT-\d{4}-\d{6}$/); assert.equal(ticket.createdAt, ticket.updatedAt);
  assert.equal((await db.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).ticketNumber, ticket.ticketNumber); mark('JSON ticket created with backend number; confirmed in development DB');
  await page.getByRole('link', { name: 'Go to My Tickets' }).click(); await page.getByRole('link', { name: ticket.ticketNumber, exact: true }).click();
  await page.getByText('Browser-driven verification of the complete requester workflow on the development database.').waitFor(); mark('My Tickets and owned Detail display new ticket');
  const bytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'); const filename = 'part4-manual-evidence.pdf';
  await page.getByLabel('Supporting attachments').setInputFiles({ name: filename, mimeType: 'application/pdf', buffer: bytes });
  const uploaded = page.waitForResponse(r => r.url().endsWith('/attachments') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Upload attachments', exact: true }).click(); const upload = await uploaded; assert.equal(upload.status(), 201); const attachment = await upload.json(); result.attachmentId = attachment.id;
  const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: `Download ${filename}` }).click();
  const download = await downloading; assert.equal(download.suggestedFilename(), filename); assert.deepEqual(await readFile(await download.path()), bytes); mark('Attachment uploaded and browser download bytes verified');
  await page.getByRole('button', { name: `Remove ${filename}` }).click(); await page.getByLabel('Reason for removal').fill('Manual verification completed; retain this audit record.');
  await page.getByRole('button', { name: 'Confirm Removal' }).click(); await page.getByRole('heading', { name: 'Attachments (0/5)' }).waitFor();
  await page.getByText('Removed Attachments (1)', { exact: true }).click(); await page.getByText('Reason: Manual verification completed; retain this audit record.').waitFor();
  assert.equal((await context.request.get(`${result.api}/api/attachments/${attachment.id}`)).status(), 200);
  assert.equal((await context.request.get(`${result.api}/api/attachments/${attachment.id}/download`)).status(), 404); mark('Soft-removal audit visible; removed download returns 404');
  await page.getByRole('button', { name: 'Sign out' }).click(); await login(b);
  await page.goto(`${result.frontend}/tickets/${ticket.id}`); await page.getByRole('heading', { name: 'Ticket Not Found' }).waitFor();
  assert.equal((await context.request.get(`${result.api}/api/tickets/${ticket.id}`)).status(), 404); mark('Requester session switch and cross-requester isolation verified');
  result.status = 'passed'; result.retained = 'New manual verification ticket and removed attachment audit record retained; no development cleanup performed.';
} catch (error) { result.status = 'failed'; result.error = error.message; throw error; }
finally { result.finishedAt = new Date().toISOString(); await mkdir('artifacts/lab-02/results', { recursive: true }); await writeFile('artifacts/lab-02/results/manual-development.json', JSON.stringify(result, null, 2)); await browser.close(); await db.$disconnect(); }
