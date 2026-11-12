import { chromium, expect } from '@playwright/test';
import { loginForTest } from './test-auth.mjs';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
const base = 'http://127.0.0.1:3001';
let partnerId = '';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function cleanup() {
  const records = await page.request.get(`${base}/api/opportunities`).then((response) => response.ok() ? response.json() : []);
  for (const item of records.filter((record) => record.customerName === '验收客户（自动）')) await page.request.delete(`${base}/api/opportunities/${item.id}`);
  if (partnerId) await page.request.delete(`${base}/api/partners/${partnerId}`);
}

try {
  await loginForTest(page);
  partnerId = (await (await page.request.post(`${base}/api/partners`, { data: { name: '商机验收伙伴（自动）', type: 'AGENT', region: '', scale: '', businessDesc: '', decisionMaker: '', sourceName: '', sourceUrl: '', contact: '', verifyStatus: '待核实', verifyNote: '', batch: '蓄水池', priorityOrder: 999, status: '未接触', note: '', scores: {} } })).json()).id;
  await page.goto(`${base}/opportunities`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.opportunities-page');
  await expect(page.locator('.opportunity-metrics')).toContainText('0');
  console.log('initial: clean workspace');

  await page.getByRole('button', { name: '登记线索', exact: true }).click();
  await page.locator('label').filter({ hasText: '来源伙伴' }).locator('select').selectOption(partnerId);
  await page.locator('.opportunity-form .form-grid input').nth(0).fill('验收客户（自动）');
  await page.locator('.opportunity-form .form-grid input').nth(1).fill('研发协同验收线索');
  await page.locator('.opportunity-form textarea').fill('客户有真实的研发项目协同需求，已确认使用团队与业务场景。');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/opportunities') && response.request().method() === 'POST' && response.ok()),
    page.locator('button[form="opportunity-form"]').click(),
  ]);
  await page.waitForSelector('.modal', { state: 'detached' });
  let row = page.locator('.opportunity-table tbody tr').filter({ hasText: '验收客户（自动）' });
  await expect(row).toContainText('客户线索');

  await row.getByRole('button', { name: '一键转商机' }).click();
  await expect(page.locator('.modal-header h2')).toHaveText('一键转为商机');
  await page.locator('.amount-field input').fill('9.8');
  await Promise.all([
    page.waitForResponse((response) => /\/api\/opportunities\/[^/]+$/.test(response.url()) && response.request().method() === 'PUT' && response.ok()),
    page.getByRole('button', { name: '确认转为商机' }).click(),
  ]);
  await page.waitForSelector('.modal', { state: 'detached' });
  row = page.locator('.opportunity-table tbody tr').filter({ hasText: '验收客户（自动）' });
  await expect(row).toContainText('已转商机');
  await expect(row).toContainText('9.8 万');
  await expect(page.locator('.opportunity-metrics')).toContainText('9.8 万');
  console.log('conversion: lead -> opportunity / amount and rate updated');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出', exact: true }).click();
  console.log(`csv: ${(await downloadPromise).suggestedFilename()}`);

  await row.locator('.source-partner-link').click();
  await page.waitForSelector('.detail-header-panel');
  await page.locator('.detail-tabs button').nth(3).click();
  await expect(page.locator('.partner-opportunities-panel')).toContainText('研发协同验收线索');
  await expect(page.locator('.partner-contribution-summary')).toContainText('9.8 万');
  console.log('partner detail: contribution linked correctly');

  await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /大号字体/ }).click();
  const large = await page.evaluate(() => ({ dataset: document.documentElement.dataset.fontSize, stored: localStorage.getItem('channel-font-size') }));
  if (large.dataset !== 'large' || large.stored !== 'large') throw new Error('font setting did not apply');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-font-size', 'large');
  await page.getByRole('button', { name: /标准字号/ }).click();
  console.log('font settings: large applied and persisted; standard restored');

  await page.goto(`${base}/opportunities`, { waitUntil: 'domcontentloaded' });
  await page.locator('.opportunity-filters input').fill('验收客户（自动）');
  row = page.locator('.opportunity-table tbody tr').filter({ hasText: '验收客户（自动）' });
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByTitle('删除').click();
  await expect(page.locator('.opportunity-table tbody tr')).toHaveCount(0);
  await cleanup(); partnerId = '';
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('OPPORTUNITY E2E PASS');
} finally {
  await cleanup();
  await page.evaluate(() => { localStorage.setItem('channel-font-size', 'standard'); }).catch(() => {});
  await browser.close();
}
