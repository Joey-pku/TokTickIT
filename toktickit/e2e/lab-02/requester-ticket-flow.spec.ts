import { test, expect, api, pdf, select, fillTicket } from '../support/fixtures';
import { readFile } from 'node:fs/promises';

test('E2E-001,002: requester persistence, JSON creation and sequential initial attachments', async ({ page, fixture }) => {
  await page.goto('/tickets/new'); await expect(page).toHaveURL(/select-requester/);
  await select(page, fixture.a.id); await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('toktickit_selected_requester_id'))).toBe(String(fixture.a.id));
  await fillTicket(page, fixture);
  await expect(page.getByText('Generated after submission')).toBeVisible();
  await expect(page.getByText('Assigned after submission')).toBeVisible();
  await page.getByLabel('Supporting attachments').setInputFiles([pdf, { ...pdf, name: 'second.pdf' }]);
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  const creation = page.waitForResponse(r => r.url() === `${api}/api/tickets` && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  const response = await creation; expect(response.status()).toBe(201);
  expect(response.request().headers()['content-type']).toContain('application/json');
  expect(Object.keys(response.request().postDataJSON()).sort()).toEqual(['categoryId','description','relatedSystemId','requestedPriority','summary']);
  const ticket = await response.json(); expect(ticket.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/); expect(ticket.createdAt).toBe(ticket.updatedAt);
  await expect(page.getByText('second.pdf uploaded successfully.')).toBeVisible();
  expect(posts).toEqual([`${api}/api/tickets`, `${api}/api/tickets/${ticket.id}/attachments`, `${api}/api/tickets/${ticket.id}/attachments`]);
  await page.getByRole('link', { name: 'Go to My Tickets' }).click();
  await page.getByRole('link', { name: ticket.ticketNumber, exact: true }).click();
  await expect(page.getByText(fixture.body.description)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Attachments (2/5)' })).toBeVisible();
});

test('E2E-003,004 and AC-29: requester switching hides tickets and attachment resources', async ({ page, request, fixture }) => {
  const ticket = await fixture.ticket();
  const uploaded = await request.post(`${api}/api/tickets/${ticket.id}/attachments`, { headers: fixture.headers, multipart: { file: pdf } });
  expect(uploaded.status()).toBe(201); const attachment = await uploaded.json();
  await select(page, fixture.a.id); await expect(page.getByRole('link', { name: ticket.ticketNumber, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Change Requester' }).click();
  expect(await page.evaluate(() => localStorage.getItem('toktickit_selected_requester_id'))).toBeNull();
  await page.getByRole('combobox', { name: 'Development Requester' }).selectOption(String(fixture.b.id));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'No Tickets Found' })).toBeVisible();
  await page.goto(`/tickets/${ticket.id}`); await expect(page.getByRole('heading', { name: 'Ticket Not Found' })).toBeVisible();
  await expect(page.getByText(fixture.body.description)).toHaveCount(0);
  const headers = { 'x-requester-id': String(fixture.b.id) };
  for (const suffix of ['', '/download']) expect((await request.get(`${api}/api/attachments/${attachment.id}${suffix}`, { headers })).status()).toBe(404);
  expect((await request.patch(`${api}/api/attachments/${attachment.id}/remove`, { headers, data: { removalReason: 'Not my attachment' } })).status()).toBe(404);
});

test('E2E-005,006: supplementary upload, download and audited removal', async ({ page, request, fixture }) => {
  const encoded = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2; return canvas.toDataURL('image/jpeg').split(',')[1]; });
  const photo = { name: 'evidence.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(encoded, 'base64') };
  const ticket = await fixture.ticket(); await select(page, fixture.a.id); await page.goto(`/tickets/${ticket.id}`);
  await page.getByLabel('Supporting attachments').setInputFiles(photo);
  const uploaded = page.waitForResponse(r => r.url().endsWith('/attachments') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Upload attachments', exact: true }).click();
  const attachment = await (await uploaded).json();
  await expect(page.getByRole('heading', { name: 'Attachments (1/5)' })).toBeVisible();
  const downloading = page.waitForEvent('download'); const streamed = page.waitForResponse(r => r.url().endsWith('/download'));
  await page.getByRole('button', { name: `Download ${photo.name}`, exact: true }).click();
  const download = await downloading; expect(download.suggestedFilename()).toBe(photo.name);
  expect(await readFile((await download.path())!)).toEqual(photo.buffer);
  expect((await streamed).headers()['content-disposition']).toContain(photo.name);
  await page.getByRole('button', { name: `Remove ${photo.name}`, exact: true }).click();
  const reason = page.getByLabel('Reason for removal'); await expect(reason).toBeFocused();
  await expect(page.getByRole('button', { name: 'Confirm Removal' })).toBeDisabled();
  await reason.fill('bad'); await expect(page.getByRole('button', { name: 'Confirm Removal' })).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Remove ${photo.name}`, exact: true })).toBeFocused();
  await page.getByRole('button', { name: `Remove ${photo.name}`, exact: true }).click();
  await reason.fill('Uploaded the wrong document'); await page.getByRole('button', { name: 'Confirm Removal' }).click();
  await expect(page.getByRole('heading', { name: 'Attachments (0/5)' })).toBeVisible();
  await page.getByText('Removed Attachments (1)', { exact: true }).click();
  await expect(page.getByText('Reason: Uploaded the wrong document')).toBeVisible();
  await expect(page.getByRole('button', { name: `Download ${photo.name}`, exact: true })).toHaveCount(0);
  const metadata = await request.get(`${api}/api/attachments/${attachment.id}`, { headers: fixture.headers }); expect(metadata.status()).toBe(200);
  expect(Object.keys(await metadata.json()).sort()).toEqual(['createdAt','fileSizeBytes','id','isRemoved','mimeType','originalFileName','removalReason','removedAt']);
  const denied = await request.get(`${api}/api/attachments/${attachment.id}/download`, { headers: fixture.headers }); expect(denied.status()).toBe(404);
  expect((await denied.json()).error.code).toBe('ATTACHMENT_NOT_FOUND');
});

test('E2E-007: search, filters, sorting, pagination and no results', async ({ page, fixture }) => {
  for (let i = 0; i < 12; i++) await fixture.ticket({ summary: `Searchable issue ${String(i).padStart(2, '0')}`, requestedPriority: i === 0 ? 'HIGH' : 'LOW', categoryId: fixture.categories[i % 2].id });
  await select(page, fixture.a.id); await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next', exact: true }).click(); await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByLabel('Search tickets').fill('ISSUE 00'); await page.getByLabel('Search tickets').press('Enter'); await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear Filters' }).click(); await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.getByLabel('Category', { exact: true }).selectOption(String(fixture.categories[0].id)); await expect(page.locator('tbody tr')).toHaveCount(6);
  await page.getByLabel('Requested Priority', { exact: true }).selectOption('HIGH'); await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('Current Status', { exact: true }).selectOption('NEW'); await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear Filters' }).click();
  await page.getByLabel('Tickets per page').selectOption('25'); await expect(page.locator('tbody tr')).toHaveCount(12);
  await page.getByRole('button', { name: 'Sort by Ticket No.', exact: true }).click();
  await expect(page.getByRole('columnheader').first()).toHaveAttribute('aria-sort', 'ascending');
  const numbers = await page.locator('tbody tr td:first-child').allTextContents(); expect(numbers).toEqual([...numbers].sort());
  await page.getByLabel('Search tickets').fill('no matching phrase'); await expect(page.getByRole('heading', { name: 'No Matching Tickets' })).toBeVisible();
});

test('E2E-009: empty requester journey', async ({ page, fixture }) => {
  await select(page, fixture.a.id); await expect(page.getByRole('heading', { name: 'No Tickets Found' })).toBeVisible();
  await expect(page.getByRole('link', { name: '+ Create Your First Ticket' })).toBeVisible();
});
