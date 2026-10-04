import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const evidenceDirectory = 'artifacts/lab-03/screenshots';

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('E2E-VIS-01: capture selected Lab 3 delivery evidence from the isolated stack', async ({ page }) => {
  test.setTimeout(60_000);
  test.skip(process.env.CAPTURE_EVIDENCE !== '1', 'Set CAPTURE_EVIDENCE=1 to refresh delivery screenshots.');
  await mkdir(evidenceDirectory, { recursive: true });
  const capture = async (name: string) => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `${evidenceDirectory}/${name}.png`, fullPage: true, animations: 'disabled' });
  };

  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await capture('desktop-authentication');

  await login(page, process.env.E2E_REQUESTER_EMAIL!, process.env.E2E_REQUESTER_PASS!);
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await capture('desktop-profile-menu');
  await page.getByRole('menuitem', { name: 'Change Password' }).click();
  await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();
  await capture('desktop-password-change');
  await page.goto('/tickets');
  const requesterTicket = page.getByRole('link', { name: /^TKT-/ }).first();
  await expect(requesterTicket).toBeVisible();
  await requesterTicket.click();
  await expect(page.getByRole('heading', { name: 'Ticket Details' })).toBeVisible();
  await capture('desktop-requester-ticket-detail');
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();

  await login(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASS!);
  await expect(page).toHaveURL(/\/staff\/queue$/);
  await capture('desktop-staff-queue');
  const staffTicket = page.getByRole('link', { name: /^TKT-/ }).first();
  await expect(staffTicket).toBeVisible();
  await staffTicket.click();
  await expect(page.getByLabel('IT Priority')).toBeVisible();
  await capture('desktop-staff-ticket-detail');
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();

  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASS!);
  await expect(page).toHaveURL(/\/admin\/users$/);
  await capture('desktop-administrator-users');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture('mobile-profile-menu');
  await capture('mobile-administrator-users');
});
