import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { loginForTest } from './test-auth.mjs';

mkdirSync('.playwright', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('fonts.googleapis')) errors.push(`console: ${message.text()}`); });

async function capture(path, name, selector) {
  await page.goto(`http://127.0.0.1:3001${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(selector, { timeout: 15000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `.playwright/${name}.png`, fullPage: true });
  const overflow = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
  console.log(`${name}: ${await page.title()} | ${JSON.stringify(overflow)}`);
}

await loginForTest(page);
await capture('/', 'dashboard', '.metric-grid');
await capture('/partners', 'partners', '.partners-page');
await capture('/contacts', 'contacts', '.contacts-page');
await capture('/followups', 'followups', '.schedule-list-panel');
await capture('/opportunities', 'opportunities', '.opportunities-page');
await capture('/analytics', 'analytics', '.analytics-funnel');
await capture('/settings', 'settings', '.font-size-options');
await capture('/playbook', 'playbook', '.playbook-hero');
await page.goto('http://127.0.0.1:3001/partners', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.partners-page');
if (await page.locator('.partner-table tbody tr').count()) {
  await page.locator('.partner-table tbody tr').first().click();
  await page.waitForSelector('.detail-header-panel');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.playwright/partner-detail.png', fullPage: true });
  await page.locator('.detail-tabs button').nth(1).click();
  await page.waitForSelector('.assessment-result');
  await page.screenshot({ path: '.playwright/assessment.png', fullPage: true });
  await page.locator('.detail-tabs button').nth(4).click();
  await page.waitForSelector('.partner-contacts-panel');
  await page.locator('.contact-record').first().getByTitle('查看任职履历').click();
  await page.screenshot({ path: '.playwright/partner-contacts.png', fullPage: true });
  console.log(`detail: ${await page.locator('.detail-title h1').textContent()}`);
} else {
  console.log('detail: no records in clean workspace, skipped');
}
await page.setViewportSize({ width: 1366, height: 900 });
await capture('/', 'dashboard-1366', '.metric-grid');
await capture('/partners', 'partners-1366', '.partners-page');
await capture('/contacts', 'contacts-1366', '.contacts-page');
await capture('/opportunities', 'opportunities-1366', '.opportunities-page');
await page.evaluate(() => localStorage.setItem('channel-font-size', 'large'));
await capture('/', 'dashboard-large', '.metric-grid');
const largeFont = await page.locator('.metric-card > p').first().evaluate((element) => getComputedStyle(element).fontSize);
console.log(`large font size: ${largeFont}`);
await page.evaluate(() => localStorage.setItem('channel-font-size', 'standard'));
console.log(`errors: ${JSON.stringify(errors)}`);
await browser.close();
if (errors.length) process.exitCode = 1;
