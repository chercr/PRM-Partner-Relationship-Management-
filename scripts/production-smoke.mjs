import { chromium, expect } from '@playwright/test';
import { loginForTest } from './test-auth.mjs';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const base = 'http://127.0.0.1:3001';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  const unauthorized = await page.request.get(`${base}/api/partners`);
  if (unauthorized.status() !== 401) throw new Error('Production API is not protected');
  await loginForTest(page);
  await page.waitForSelector('.metric-grid');
  await expect(page.locator('.metric-card').first()).toContainText('0');
  await page.goto(`${base}/partners`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.empty-state');
  await expect(page.locator('.empty-state')).toContainText('没有找到匹配的伙伴');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: '.playwright/production-empty.png', fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PRODUCTION SMOKE PASS: authenticated / empty / no page errors');
} finally {
  await browser.close();
}
