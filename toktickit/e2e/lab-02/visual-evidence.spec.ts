import { test, expect, api, pdf, login, fillTicket } from '../support/fixtures';
import { mkdir } from 'node:fs/promises';

test('VIS-001–015: selected visual evidence and keyboard/mobile modal inspection', async ({ page, request, fixture }) => {
  test.setTimeout(60000);
  const capture = async (name: string) => {
    if (process.env.CAPTURE_EVIDENCE === '1') {
      await mkdir('artifacts/lab-02/screenshots', { recursive: true });
      if (!name.includes('modal')) await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); return new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
      await page.screenshot({ path: `artifacts/lab-02/screenshots/${name}.png`, fullPage: !name.includes('modal'), animations: 'disabled' });
    }
  };
  await page.goto('/login'); await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled(); await capture('desktop-login');
  await login(page, fixture.a); await fillTicket(page, fixture);
  await page.getByLabel('Ticket Summary').fill('bad'); await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus'); await expect(focused).toHaveCSS('outline-color', 'rgb(11, 122, 70)');
  await expect(page.locator('.ticket-readonly > div').first()).toHaveCSS('background-color', 'rgb(241, 245, 243)');
  await expect(page.locator('.zen-header')).toHaveCSS('background-color', 'rgb(0, 107, 60)');
  await capture('desktop-create-validation-focus');
  await page.getByLabel('Ticket Summary').fill(fixture.body.summary);
  const created = page.waitForResponse(r => r.url() === `${api}/api/tickets` && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit Ticket' }).click(); const ticket = await (await created).json();
  await expect(page.getByText(`Ticket ${ticket.ticketNumber} created successfully.`)).toBeVisible(); await capture('desktop-create-success');
  for (const priority of ['LOW','HIGH']) await fixture.ticket({ requestedPriority: priority, summary: `${priority} priority verification example` });
  const longFile = { ...pdf, name: 'supporting-evidence-with-a-long-descriptive-filename-for-responsive-layout-verification.pdf' };
  const attachment = await (await request.post(`${api}/api/tickets/${ticket.id}/attachments`, { headers: fixture.headers, multipart: { file: longFile } })).json();
  const removed = await (await request.post(`${api}/api/tickets/${ticket.id}/attachments`, { headers: fixture.headers, multipart: { file: pdf } })).json();
  expect((await request.patch(`${api}/api/attachments/${removed.id}/remove`, { headers: fixture.headers, data: { removalReason: 'Replaced with the corrected supporting evidence.' } })).status()).toBe(200);
  for (const [name, width, height] of [['desktop',1280,800],['tablet-ui',820,1180],['tablet-vis',768,1024],['mobile-ui',375,667],['mobile-vis',375,812]] as const) {
    await page.setViewportSize({ width, height });
    if (name === 'mobile-ui') { await page.getByRole('button', { name: 'Open profile menu' }).click(); await page.getByRole('menuitem', { name: 'Logout' }).click(); await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled(); await capture(`${name}-login`); await login(page, fixture.a); }
    for (const [screen, path] of [['create','/tickets/new'],['list','/tickets'],['detail',`/tickets/${ticket.id}`]]) {
      await page.goto(path);
      if (screen === 'create') await expect(page.getByRole('button', { name: 'Submit Ticket' })).toBeEnabled();
      if (screen === 'list') await expect(page.locator(width < 768 ? '.ticket-cards article' : 'tbody tr')).toHaveCount(3);
      if (screen === 'detail') { await expect(page.getByRole('heading', { name: 'Attachments (1/5)' })).toBeVisible(); await page.getByText('Removed Attachments (1)', { exact: true }).click(); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (!(name === 'desktop' && screen === 'create') && !(name === 'mobile-ui' && screen !== 'detail') && !(name === 'tablet-ui' && screen === 'detail')) await capture(`${name}-${screen}`);
    }
    await page.getByRole('button', { name: `Remove ${longFile.name}`, exact: true }).click();
    const reason = page.getByLabel('Reason for removal'); await expect(reason).toBeFocused();
    await reason.fill('Wrong evidence was selected');
    await page.keyboard.press('Shift+Tab'); await expect(page.getByRole('button', { name: 'Confirm Removal' })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(reason).toBeFocused();
    const bounds = await page.getByRole('dialog').boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.width).toBeLessThanOrEqual(width);
    if (name === 'desktop' || name === 'mobile-ui') await capture(`${name}-removal-modal`);
    await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: `Remove ${longFile.name}`, exact: true })).toBeFocused();
  }
  expect((await request.get(`${api}/api/attachments/${attachment.id}/download`, { headers: fixture.headers })).status()).toBe(200);
  // Breakpoint checks need no extra screenshots.
  for (const width of [767,768,991,992]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/tickets/new');
    await expect(page.getByRole('button', { name: 'Submit Ticket' })).toBeEnabled();
    expect(await page.locator('.ticket-grid').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width < 768 ? 1 : width < 992 ? 2 : 3);
  }
});
