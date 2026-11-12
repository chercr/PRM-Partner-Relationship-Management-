import { chromium, expect } from '@playwright/test';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { loginForTest } from './test-auth.mjs';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
const base = 'http://127.0.0.1:3001';
let testId = '';
const failures = [];
page.on('pageerror', (error) => failures.push(error.message));

function offsetDate(offset) {
  const date = new Date(); date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
async function waitForPartnerUpdate() {
  await page.waitForResponse((response) => response.request().method() === 'PUT' && /\/api\/partners\/[^/]+$/.test(new URL(response.url()).pathname) && response.ok());
}

try {
  await loginForTest(page);
  await page.goto(`${base}/partners`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.partners-page');

  if (existsSync(path.resolve('渠道伙伴评估表.xlsx'))) {
    await page.getByRole('button', { name: '导入 Excel', exact: true }).click();
    await page.locator('input[type=file]').setInputFiles(path.resolve('渠道伙伴评估表.xlsx'));
    await page.waitForSelector('.import-preview');
    console.log(`import: ${await page.locator('.import-summary').innerText()}`);
    const importButton = page.getByRole('button', { name: /确认导入/ });
    if (await importButton.isEnabled()) {
      await importButton.click();
      await page.waitForSelector('.modal', { state: 'detached' });
    } else {
      await page.locator('.modal-header .icon-button').click();
    }
  } else {
    console.log('import: fixture not present, skipped optional Excel import check');
  }

  const downloadPromise = page.waitForEvent('download');
  await page.locator('.export-button').click();
  const download = await downloadPromise;
  console.log(`csv: ${download.suggestedFilename()}`);

  await page.getByRole('button', { name: '新增伙伴', exact: true }).click();
  await page.locator('.partner-form input').first().fill('验收测试伙伴（自动）');
  await page.locator('.partner-form select').first().selectOption('AGENT');
  await page.locator('label').filter({ hasText: '所在区域' }).locator('input').fill('华东（上海）');
  await Promise.all([
    page.waitForURL(/\/partners\/[0-9a-f-]+$/),
    page.locator('button[form="partner-form"]').click(),
  ]);
  testId = page.url().split('/').pop();
  await expect(page.locator('.detail-title h1')).toHaveText('验收测试伙伴（自动）');

  await page.locator('.detail-tabs button').nth(1).click();
  const scores = [2, 5, 5, 5, 5, 5];
  for (let index = 0; index < scores.length; index += 1) {
    await page.locator('.assessment-dimension').nth(index).locator('.score-selector button').nth(scores[index] - 1).click();
  }
  await expect(page.locator('.assessment-result')).toContainText('4.25');
  await expect(page.locator('.assessment-result')).toContainText('B 类');
  await expect(page.locator('.assessment-result')).toContainText('一票否决');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/scores') && response.ok()),
    page.getByRole('button', { name: '保存评估结果' }).click(),
  ]);
  console.log('score: 4.25 / B / veto applied');

  for (const next of ['已接触', '已深聊', '已谈合作框架']) {
    await Promise.all([waitForPartnerUpdate(), page.locator('.detail-actions .button-primary').click()]);
    await expect(page.locator('.detail-actions .button-primary')).toContainText(next === '已接触' ? '推进到已深聊' : next === '已深聊' ? '推进到已谈合作框架' : '推进到已签约');
  }
  await page.locator('.detail-actions .button-primary').click();
  await page.locator('.sign-modal-content input[type=date]').fill(offsetDate(-50));
  await Promise.all([waitForPartnerUpdate(), page.getByRole('button', { name: '确认签约并启动倒计时' }).click()]);
  await page.locator('.detail-tabs button').nth(0).click();
  await expect(page.locator('.activation-card')).toContainText('10');
  await expect(page.locator('.activation-card')).toContainText('天后到期');
  console.log('activation: AGENT 60-day line / 10-day warning');

  await page.locator('.detail-actions').getByRole('button', { name: '记跟进' }).click();
  await page.locator('.followup-form textarea').fill('自动化验收：伙伴已报备首条制造业研发客户线索。');
  await page.locator('.tag-options').getByRole('button', { name: '报备线索', exact: true }).click();
  await page.locator('.followup-form input[type=date]').last().fill(offsetDate(1));
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/followups') && response.ok()),
    page.locator('button[form="followup-form"]').click(),
  ]);
  await page.waitForSelector('.modal', { state: 'detached' });
  await expect(page.locator('.status-stepper')).toContainText('已激活');
  await expect(page.locator('.detail-actions .button-primary')).toHaveText('已完成激活');
  console.log('followup: activation tag changed status to 已激活');

  const backup = await page.request.post(`${base}/api/backup`);
  if (!backup.ok()) throw new Error(`backup failed: ${backup.status()}`);
  console.log(`backup: ${(await backup.json()).file}`);

  await page.request.delete(`${base}/api/partners/${testId}`);
  testId = '';
  await page.goto(`${base}/partners`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.partners-page');
  await expect(page.locator('.partners-page')).not.toContainText('验收测试伙伴（自动）');
  console.log('cleanup: test partner removed');
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('E2E PASS');
} finally {
  if (testId) await page.request.delete(`${base}/api/partners/${testId}`);
  await browser.close();
}
