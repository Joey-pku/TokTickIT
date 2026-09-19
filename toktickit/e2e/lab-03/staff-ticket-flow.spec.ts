import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
const require = createRequire(resolve('server/package.json'));
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login'); await page.getByLabel('Email address').fill(email); await page.getByLabel('Password', { exact: true }).fill(password); await page.getByRole('button', { name: 'Sign in' }).click(); await page.waitForURL(/\/(tickets|staff\/queue)$/);
}

test('E2E-STAFF-01: staff finds, claims, prioritizes, progresses, and notes a ticket', async ({ page }) => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  const requester = await db.user.findFirstOrThrow({ where: { role: 'REQUESTER', isActive: true } });
  const staff = await db.user.findUniqueOrThrow({ where: { email: process.env.E2E_STAFF_EMAIL } });
  const category = await db.category.findFirstOrThrow(), system = await db.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const marker = `Workflow ${randomUUID()}`;
  const ticket = await db.ticket.create({ data: { ticketNumber: `E2E-${randomUUID()}`, summary: marker, description: 'Feature 12 staff workflow browser verification.', requestedPriority: 'MEDIUM', itPriority: 'MEDIUM', requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id } });
  try {
    await login(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASS!); await expect(page).toHaveURL(/\/staff\/queue$/);
    await page.getByLabel('Search tickets').fill(marker); await expect(page.getByRole('link', { name: ticket.ticketNumber })).toBeVisible(); await page.getByRole('link', { name: ticket.ticketNumber }).click();
    await page.getByLabel('Assigned Owner').selectOption(String(staff.id)); await expect(page.getByLabel('Current Status')).toHaveValue('OPEN');
    await page.getByLabel('IT Priority').selectOption('HIGH'); await expect(page.getByLabel('IT Priority')).toHaveValue('HIGH');
    await page.getByLabel('Current Status').selectOption('IN_PROGRESS'); await expect(page.getByLabel('Current Status')).toHaveValue('IN_PROGRESS');
    await page.getByLabel('Add Internal Note').fill('<b>diagnostic remains plain text</b>'); await page.getByRole('button', { name: 'Post Internal Note' }).click();
    await expect(page.getByText('<b>diagnostic remains plain text</b>')).toBeVisible();
  } finally { await db.internalNote.deleteMany({ where: { ticketId: ticket.id } }); await db.comment.deleteMany({ where: { ticketId: ticket.id } }); await db.ticket.delete({ where: { id: ticket.id } }); await db.$disconnect(); }
});

test('E2E-STAFF-02: requester resolution indication is visible to staff', async ({ page }) => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  const password = 'Fixture123!'; const suffix = randomUUID();
  const requester = await db.user.create({ data: { name: 'Resolution Requester', email: `resolution-${suffix}@example.com`, passwordHash: await bcrypt.hash(password, 4), mustChangePassword: false } });
  const category = await db.category.findFirstOrThrow(), system = await db.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const ticket = await db.ticket.create({ data: { ticketNumber: `E2E-${randomUUID()}`, summary: `Resolution ${suffix}`, description: 'Requester resolution browser verification.', requestedPriority: 'LOW', itPriority: 'LOW', currentStatus: 'OPEN', requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id } });
  try {
    await login(page, requester.email, password); await page.goto(`/tickets/${ticket.id}`); await page.getByRole('button', { name: 'Problem Appears Resolved' }).click(); await expect(page.getByRole('dialog')).toContainText('This will notify IT Staff that your issue appears resolved.'); await page.getByRole('button', { name: 'Confirm' }).click(); await expect(page.getByText(/You indicated.*that the problem appears resolved/)).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click(); await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible(); await login(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASS!); await page.goto(`/staff/tickets/${ticket.id}`); await expect(page.getByText(/Requester Resolution Requester indicated.*that the problem appears resolved/)).toBeVisible();
  } finally { await db.comment.deleteMany({ where: { ticketId: ticket.id } }); await db.ticket.delete({ where: { id: ticket.id } }); await db.session.deleteMany({ where: { userId: requester.id } }); await db.user.delete({ where: { id: requester.id } }); await db.$disconnect(); }
});
