import { test, expect } from '../support/fixtures';

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/(dashboard|staff\/dashboard)$/);
}

async function logout(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
}

test('E2E-01: staff records and completes an Action through the Ticket UI', async ({ page, fixture }) => {
  const ticket = await fixture.ticket({ summary: 'Lab 4 Action browser journey' });
  const staff = await fixture.db.user.findUniqueOrThrow({ where: { email: process.env.E2E_STAFF_EMAIL } });
  await loginAs(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASS!);
  await page.goto(`/staff/tickets/${ticket.id}`);
  await page.getByRole('button', { name: 'Add Action' }).click();
  await page.getByLabel('Assigned to').selectOption(String(staff.id));
  await page.getByLabel('Action Description').fill('Inspect and repair the affected printer queue.');
  await page.getByRole('button', { name: 'Record Action' }).click();
  await expect(page.getByText('Action recorded successfully.')).toBeVisible();
  await page.getByRole('button', { name: 'View / Edit' }).click();
  await page.getByLabel('Result').fill('Queue repaired and a test document printed successfully.');
  await page.getByLabel('Status', { exact: true }).selectOption('COMPLETED');
  await page.getByRole('button', { name: 'Save Action' }).click();
  await expect(page.getByText('Action updated successfully.')).toBeVisible();
  await expect(page.getByText('Queue repaired and a test document printed successfully.')).toBeVisible();
});

test('E2E-03: requester sees Action history and staff resolves, closes, and reopens', async ({ page, fixture }) => {
  const ticket = await fixture.ticket({ summary: 'Lab 4 resolution journey' });
  const staff = await fixture.db.user.findUniqueOrThrow({ where: { email: process.env.E2E_STAFF_EMAIL } });
  await fixture.db.ticketAction.create({ data: { idempotencyKey: crypto.randomUUID(), ticketId: ticket.id, assignedToId: staff.id, performedById: staff.id, description: 'Verified service restoration.', result: 'Requester service restored.', status: 'COMPLETED', version: 1 } });
  await loginAs(page, fixture.a.email, fixture.a.testPassword);
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByRole('heading', { name: 'Actions Taken' })).toBeVisible();
  await expect(page.getByText('Requester service restored.')).toBeVisible();
  await logout(page);
  await loginAs(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASS!);
  await page.goto(`/staff/tickets/${ticket.id}`);
  for (const target of ['OPEN', 'RESOLVED', 'CLOSED', 'REOPENED']) {
    await page.getByLabel('Change status').selectOption(target);
    await page.getByRole('button', { name: 'Update Status' }).click();
    await expect(page.getByText(target.toLowerCase().split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' '), { exact: true })).toBeVisible();
  }
});

test('E2E-04: requester and staff dashboard cards drill into authorized views', async ({ page, fixture }) => {
  await fixture.ticket({ summary: 'Dashboard drill-down evidence' });
  await loginAs(page, fixture.a.email, fixture.a.testPassword);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('link', { name: /active Tickets/ }).click();
  await expect(page).toHaveURL(/\/tickets\?.*view=active/);
  await expect(page.getByRole('cell', { name: 'Dashboard drill-down evidence' })).toBeVisible();
  await logout(page);
  await loginAs(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASS!);
  await expect(page.getByRole('heading', { name: 'Staff Dashboard' })).toBeVisible();
  await page.getByRole('link', { name: /active unassigned Tickets/ }).click();
  await expect(page).toHaveURL(/\/staff\/queue\?.*unassigned/);
  await expect(page.getByRole('cell', { name: 'Dashboard drill-down evidence' })).toBeVisible();
});

test('E2E-05: representative requester, staff, and administrator navigation has no browser errors', async ({ page, fixture }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    const text = message.text();
    if (message.type() === 'error' && !text.includes('401 (Unauthorized)')) browserErrors.push(text);
  });
  await loginAs(page, fixture.a.email, fixture.a.testPassword);
  await page.getByRole('link', { name: 'My Tickets' }).click();
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
  await logout(page);
  await loginAs(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASS!);
  await page.getByRole('link', { name: 'Ticket Queue' }).click();
  await expect(page.getByRole('heading', { name: 'Ticket Queue', exact: true })).toBeVisible();
  await logout(page);
  await loginAs(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASS!);
  await page.getByRole('link', { name: 'User Management' }).click();
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
  test(`E2E-02: dashboards remain keyboard usable without horizontal overflow at ${viewport.width}px`, async ({ page, fixture }) => {
    await page.setViewportSize(viewport);
    await loginAs(page, fixture.a.email, fixture.a.testPassword);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });
}
