import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const base = 'http://127.0.0.1:4173';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('fonts.googleapis')) errors.push(message.text()); });
const pages = ['index.html', 'features.html', 'scenarios.html', 'deploy.html', 'download.html'];

async function overflowCheck(name) {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  if (sizes.content > sizes.viewport) throw new Error(`${name} horizontal overflow: ${JSON.stringify(sizes)}`);
  console.log(`${name}: ${sizes.viewport}px / no overflow`);
}

try {
  for (const name of pages) {
    const response = await page.goto(`${base}/${name}`, { waitUntil: 'domcontentloaded' });
    if (!response?.ok()) throw new Error(`${name} returned ${response?.status()}`);
    await page.waitForSelector('.site-footer');
    await overflowCheck(name);
  }

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-demo-target="contacts"]').click();
  await expect(page.locator('[data-demo-panel="contacts"]')).toBeVisible();
  await expect(page.locator('[data-demo-panel="partners"]')).toBeHidden();
  await page.locator('[data-demo-target="opportunities"]').click();
  await expect(page.locator('[data-demo-panel="opportunities"]')).toBeVisible();
  await page.locator('[data-demo-target="partners"]').click();
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(750); await page.screenshot({ path: '.playwright/website-home.png', fullPage: true });
  console.log('interactive product demo: passed');

  const internalLinks = await page.locator('a[href]').evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute('href')).filter((href) => href && !href.startsWith('http') && !href.startsWith('#')))]);
  for (const href of internalLinks) {
    const response = await page.request.get(`${base}/${href}`);
    if (!response.ok()) throw new Error(`Broken link ${href}: ${response.status()}`);
  }
  const template = await page.request.get(`${base}/assets/partner-import-template.xlsx`);
  if (!template.ok()) throw new Error(`Import template returned ${template.status()}`);
  console.log(`internal links: ${internalLinks.length} unique targets passed; import template available`);

  await page.goto(`${base}/features.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(750); await page.screenshot({ path: '.playwright/website-features.png', fullPage: true });
  await page.goto(`${base}/deploy.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('.faq-item summary').first().click();
  await expect(page.locator('.faq-item').first()).toHaveAttribute('open', '');
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(750); await page.screenshot({ path: '.playwright/website-deploy.png', fullPage: true });
  await page.goto(`${base}/download.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('button[data-copy]').first().click();
  await expect(page.locator('button[data-copy]').first()).toContainText(/已复制|请手动复制/);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(750); await page.screenshot({ path: '.playwright/website-download.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('.menu-toggle').click();
  await expect(page.locator('.site-nav')).toBeVisible();
  await page.locator('.site-nav a[href="features.html"]').click();
  await page.waitForURL(/features\.html$/);
  await expect(page.locator('.page-hero h1')).toBeVisible();
  await overflowCheck('mobile features');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(750); await page.screenshot({ path: '.playwright/website-mobile.png', fullPage: true });
  await overflowCheck('mobile home');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('WEBSITE E2E PASS');
} finally {
  await browser.close();
}
