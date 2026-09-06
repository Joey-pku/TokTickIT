import { test, expect, api, pdf, select, fillTicket } from '../support/fixtures';

test('AC-06–09: validation, submitting guard and preserved form after API failure', async ({ page, fixture }) => {
  await select(page, fixture.a.id); await page.goto('/tickets/new');
  await expect(page.getByRole('button', { name: 'Submit Ticket' })).toBeEnabled();
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByLabel('Ticket Summary')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Summary must be between 5 and 100 characters.')).toBeVisible();
  await fillTicket(page, fixture); await page.getByLabel('Supporting attachments').setInputFiles(pdf);
  let release!: () => void; const gate = new Promise<void>(resolve => release = resolve); let count = 0;
  await page.route(`${api}/api/tickets`, async route => { count++; await gate; await route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } } }); });
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByRole('button', { name: 'Submitting...' })).toBeDisabled();
  release(); await expect(page.getByText(/Server error: Unable to submit/)).toBeVisible(); expect(count).toBe(1);
  await expect(page.getByLabel('Ticket Summary')).toHaveValue(fixture.body.summary);
  await expect(page.getByLabel('Description')).toHaveValue(fixture.body.description);
  await expect(page.getByText(/evidence.pdf/).first()).toBeVisible();
});

test('AC-11: partial initial upload reports reason and retries from Detail', async ({ page, fixture }) => {
  await select(page, fixture.a.id); await fillTicket(page, fixture);
  await page.getByLabel('Supporting attachments').setInputFiles([pdf, { ...pdf, name: 'retry.pdf' }]);
  let count = 0;
  await page.route('**/api/tickets/*/attachments', async route => {
    count++;
    if (count === 2) await route.fulfill({ status: 415, json: { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'File type not permitted. Allowed types: JPG, PNG, WEBP, PDF.' } } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByText(/retry.pdf upload failed/)).toBeVisible();
  await expect.soft(page.getByText(/File type not permitted/)).toBeVisible();
  await page.getByRole('link', { name: 'Retry failed uploads from Ticket Detail' }).click();
  await expect(page.getByRole('heading', { name: 'Attachments (1/5)' })).toBeVisible();
  await page.getByLabel('Supporting attachments').setInputFiles({ ...pdf, name: 'retry.pdf' });
  await page.getByRole('button', { name: 'Upload attachments', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Attachments (2/5)' })).toBeVisible();
});

test('Requester failed load retains persistence; Retry and successful stale-context check', async ({ page, fixture }) => {
  await page.addInitScript(id => localStorage.setItem('toktickit_selected_requester_id', id), String(fixture.a.id));
  await page.route('**/api/development-requesters', route => route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Unavailable' } } }));
  await page.goto('/tickets'); await expect(page.getByText('Unable to load Development Requesters. Please try again.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('toktickit_selected_requester_id'))).toBe(String(fixture.a.id));
  await page.unroute('**/api/development-requesters'); await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { name: 'My Tickets', exact: true })).toBeVisible();
  await page.route('**/api/development-requesters', async route => {
    const response = await route.fetch(); const body = await response.json(); body.items = body.items.filter((item: any) => item.id !== fixture.a.id); await route.fulfill({ response, json: body });
  });
  await page.reload(); await expect(page).toHaveURL(/select-requester/);
  expect(await page.evaluate(() => localStorage.getItem('toktickit_selected_requester_id'))).toBeNull();
});

test('List API failure has no stale rows and retry recovers', async ({ page, fixture }) => {
  const ticket = await fixture.ticket(); await select(page, fixture.a.id);
  await page.route('**/api/tickets?*', route => route.fulfill({ status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'Unavailable' } } }));
  await page.getByLabel('Search tickets').fill('printer');
  await expect(page.getByText(/Unable to load tickets from the server/)).toBeVisible(); await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.unroute('**/api/tickets?*'); await page.getByRole('button', { name: 'Try Again' }).click();
  await expect(page.getByRole('link', { name: ticket.ticketNumber, exact: true })).toBeVisible();
});
