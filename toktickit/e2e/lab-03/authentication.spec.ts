import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const require = createRequire(resolve('server/package.json'));
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('E2E-AUTH-01: requester signs in, opens My Tickets, and signs out', async ({ page }) => {
  await login(page, process.env.E2E_REQUESTER_EMAIL!, process.env.E2E_REQUESTER_PASS!);
  await expect(page.getByRole('heading', { name: 'My Tickets', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('E2E-AUTH-02: temporary-password user is gated until changing password', async ({ page }) => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || new URL(url).pathname !== '/toktickit_e2e_test') throw new Error('Isolated E2E DB required.');
  const db = new PrismaClient({ datasources: { db: { url } } });
  const email = `password-gate-${randomUUID()}@example.com`;
  const current = 'Initial123!';
  const replacement = 'Changed456!';
  const account = await db.user.create({ data: { name: 'Password Gate', email, passwordHash: await bcrypt.hash(current, 10), mustChangePassword: true } });
  try {
    await login(page, email, current);
    await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();
    await expect(page).toHaveURL(/\/change-password$/);
    await page.getByLabel('Current password').fill(current);
    await page.getByLabel('New password', { exact: true }).fill(replacement);
    await page.getByLabel('Confirm new password').fill(replacement);
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByRole('heading', { name: 'My Tickets', exact: true })).toBeVisible();
  } finally {
    await db.session.deleteMany({ where: { userId: account.id } });
    await db.user.delete({ where: { id: account.id } });
    await db.$disconnect();
  }
});

test('E2E-AUTH-03: unauthenticated protected navigation renders login', async ({ page }) => {
  await page.goto('/tickets');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
