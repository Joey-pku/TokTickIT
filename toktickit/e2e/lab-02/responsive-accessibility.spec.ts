import { test, expect, api, pdf, select, fillTicket } from '../support/fixtures';

test('Contract: search resets page immediately before the 300ms request debounce', async ({ page, fixture }) => {
  for (let i = 0; i < 11; i++) await fixture.ticket({ summary: `Pagination issue ${i}` });
  await select(page, fixture.a.id); await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await page.getByLabel('Search tickets').fill('issue');
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await page.clock.runFor(300);
});

test('Contract: detail grid, badge tokens and semantic read-only icons', async ({ page, fixture }) => {
  const low = await fixture.ticket({ requestedPriority: 'LOW' }); await fixture.ticket({ requestedPriority: 'HIGH' });
  await select(page, fixture.a.id);
  await expect.soft(page.locator('.ticket-table .badge-low')).toHaveCSS('color', 'rgb(4, 120, 87)');
  await expect.soft(page.locator('.ticket-table .badge-low')).toHaveCSS('background-color', 'rgb(209, 250, 229)');
  await expect.soft(page.locator('.ticket-table .badge-high')).toHaveCSS('border-top-color', 'rgb(252, 165, 165)');
  await page.goto(`/tickets/${low.id}`); await expect(page.getByText(fixture.body.description)).toBeVisible();
  expect.soft(await page.locator('.ticket-grid').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
  await page.goto('/tickets/new');
  for (const label of ['Ticket Number', 'Ticket Date', 'Requester']) await expect.soft(page.locator('.ticket-readonly').filter({ has: page.getByText(label, { exact: true }) }).locator('svg')).toHaveCount(1);
});

test('Contract: attachment picker icon and red queue removal', async ({ page, fixture }) => {
  await select(page, fixture.a.id); await fillTicket(page, fixture); await page.getByLabel('Supporting attachments').setInputFiles(pdf);
  await expect.soft(page.locator('.attachment-picker > svg')).toHaveCount(1);
  await expect.soft(page.locator('.attachment-queue li svg')).toHaveCount(1);
  await expect.soft(page.locator('.attachment-queue button')).toHaveCSS('color', 'rgb(220, 38, 38)');
  await expect.soft(page.locator('.attachment-queue button')).toHaveAccessibleName(/Remove/);
});

test('VIS typography: page, section and badge sizes follow UI section 2.3', async ({ page, fixture }) => {
  const ticket = await fixture.ticket(); await select(page, fixture.a.id);
  await expect.soft(page.locator('.ticket-table .ticket-badge').first()).toHaveCSS('font-size', '11px');
  await expect.soft(page.locator('h1')).toHaveCSS('font-weight', '600');
  await page.goto(`/tickets/${ticket.id}`);
  await expect.soft(page.getByRole('heading', { name: 'Attachments (0/5)' })).toHaveCSS('font-size', '22px');
});

test('Contract: removal validation and focus after the trigger disappears', async ({ page, request, fixture }) => {
  const ticket = await fixture.ticket(); await request.post(`${api}/api/tickets/${ticket.id}/attachments`, { headers: fixture.headers, multipart: { file: pdf } });
  await select(page, fixture.a.id); await page.goto(`/tickets/${ticket.id}`);
  await page.getByRole('button', { name: `Remove ${pdf.name}`, exact: true }).click();
  const reason = page.getByLabel('Reason for removal'); await reason.fill('bad');
  await expect.soft(reason).toHaveCSS('border-top-color', 'rgb(220, 38, 38)');
  await reason.fill('Wrong document uploaded'); await page.getByRole('button', { name: 'Confirm Removal' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement !== document.body && document.activeElement?.isConnected)).toBe(true);
});

for (const [width, height] of [[1280,800],[820,1180],[375,667],[768,1024],[375,812]]) {
  test(`E2E-008,010 / AC-30–32: responsive ${width}x${height}`, async ({ page, fixture }) => {
    await page.setViewportSize({ width, height }); const ticket = await fixture.ticket(); await select(page, fixture.a.id);
    if (width < 768) { await expect(page.locator('.ticket-cards')).toBeVisible(); await expect(page.locator('.ticket-table-wrap')).toBeHidden(); await page.getByRole('button', { name: 'Toggle Navigation' }).click(); await expect(page.getByRole('button', { name: 'Change Requester' })).toBeVisible(); await page.keyboard.press('Escape'); }
    else await expect(page.locator('.ticket-table-wrap')).toBeVisible();
    if (width >= 768 && width < 992) {
      const search = await page.locator('.ticket-search').boundingBox(); const category = await page.locator('.ticket-toolbar > div').nth(1).boundingBox();
      expect.soft(category!.y).toBeGreaterThanOrEqual(search!.y + search!.height);
    }
    for (const path of ['/tickets', '/tickets/new', `/tickets/${ticket.id}`]) {
      await page.goto(path); await expect(page.locator('h1')).toBeVisible();
      if (path.includes('/new')) { await expect(page.getByRole('button', { name: 'Submit Ticket' })).toBeEnabled(); expect(await page.locator('.ticket-grid').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width < 768 ? 1 : width < 992 ? 2 : 3); }
      if (path === `/tickets/${ticket.id}`) await expect(page.getByText(fixture.body.description)).toBeVisible();
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width < 768) {
        const small = await page.locator('.zen-app a:visible, .zen-app button:visible, .zen-app input:visible, .zen-app select:visible, .zen-app summary:visible').evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().height < 44).map(el => el.textContent || el.getAttribute('aria-label')));
        expect.soft(small).toEqual([]);
      }
    }
  });
}
