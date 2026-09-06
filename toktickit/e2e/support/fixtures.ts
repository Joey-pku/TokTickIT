import { test as base, expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve, join, relative } from 'node:path';
import { unlink } from 'node:fs/promises';
const require = createRequire(resolve('server/package.json'));
const { PrismaClient } = require('@prisma/client');
export const api = 'http://127.0.0.1:3001';
export const pdf = { name: 'evidence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF') };
export const test = base.extend<{ fixture: any }>({
  fixture: async ({ request }, use) => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url || new URL(url).pathname !== '/toktickit_e2e_test') throw new Error('Isolated E2E DB required.');
    const db = new PrismaClient({ datasources: { db: { url } } });
    const before = (await db.ticket.findMany({ select: { id: true } })).map((t: any) => t.id);
    const requesters = await db.developmentRequester.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    const a = requesters.find((r: any) => r.name === 'Jennifer Anderson'), b = requesters.find((r: any) => r.name === 'David Lee');
    const categories = await db.category.findMany({ orderBy: { id: 'asc' } });
    const system = await db.relatedSystem.findFirst({ where: { isActive: true } });
    const body = { categoryId: categories[0].id, relatedSystemId: system.id, requestedPriority: 'MEDIUM', summary: 'E2E printer problem', description: 'The printer cannot print the required document.' };
    const headers = { 'x-requester-id': String(a.id) };
    try { await use({ a, b, categories, body, headers, db, async ticket(overrides = {}) { const response = await request.post(`${api}/api/tickets`, { headers, data: { ...body, ...overrides } }); expect(response.status()).toBe(201); return response.json(); } }); }
    finally {
      const tickets = await db.ticket.findMany({ where: { id: { notIn: before } }, select: { id: true } });
      const ids = tickets.map((t: any) => t.id);
      const attachments = await db.attachment.findMany({ where: { ticketId: { in: ids } } });
      await db.attachment.deleteMany({ where: { ticketId: { in: ids } } });
      await db.ticket.deleteMany({ where: { id: { in: ids } } });
      for (const file of attachments) { const path = join(process.env.UPLOAD_DIR!, file.storedFileName); if (relative(process.env.UPLOAD_DIR!, path) !== file.storedFileName) throw new Error('Unsafe fixture filename.'); await unlink(path).catch((e: any) => { if (e.code !== 'ENOENT') throw e; }); }
      await db.$disconnect();
    }
  },
});
export { expect };
export async function select(page: Page, id: number) {
  await page.goto('/select-requester');
  await page.getByRole('combobox', { name: 'Development Requester' }).selectOption(String(id));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'My Tickets', exact: true })).toBeVisible();
}
export async function fillTicket(page: Page, fixture: any) {
  await page.goto('/tickets/new');
  await page.getByLabel('Category', { exact: false }).selectOption(String(fixture.body.categoryId));
  await page.getByLabel('Related System', { exact: false }).selectOption(String(fixture.body.relatedSystemId));
  await page.getByLabel('Ticket Summary').fill(fixture.body.summary);
  await page.getByLabel('Description', { exact: false }).fill(fixture.body.description);
}
