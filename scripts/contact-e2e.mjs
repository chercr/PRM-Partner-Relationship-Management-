import { chromium, expect } from '@playwright/test';
import { loginForTest } from './test-auth.mjs';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const base = 'http://127.0.0.1:3001';
let partnerA = '';
let partnerB = '';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const partnerDraft = (name) => ({ name, type: 'AGENT', region: '华东（上海）', scale: '测试', businessDesc: '联系人业务验收', decisionMaker: '', sourceName: '自动化测试', sourceUrl: '', contact: '', verifyStatus: '待核实', verifyNote: '', batch: '蓄水池', priorityOrder: 999, status: '未接触', note: '', scores: {} });
async function cleanup() {
  if (partnerA) await page.request.delete(`${base}/api/partners/${partnerA}`);
  if (partnerB) await page.request.delete(`${base}/api/partners/${partnerB}`);
}
async function addContact(name, primary) {
  await page.getByRole('button', { name: '新增联系人', exact: true }).click();
  await page.locator('label').filter({ hasText: '所属伙伴' }).locator('select').selectOption({ label: '验收伙伴甲（自动）' });
  await page.locator('label').filter({ hasText: '姓名' }).locator('input').fill(name);
  await page.locator('label').filter({ hasText: '当前职务' }).locator('input').fill('渠道合作负责人');
  if (primary) await page.locator('.toggle').click();
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/contacts') && response.request().method() === 'POST' && response.ok()),
    page.locator('button[form="contact-form"]').click(),
  ]);
  await page.waitForSelector('.modal', { state: 'detached' });
}

try {
  await loginForTest(page);
  partnerA = (await (await page.request.post(`${base}/api/partners`, { data: partnerDraft('验收伙伴甲（自动）') })).json()).id;
  partnerB = (await (await page.request.post(`${base}/api/partners`, { data: partnerDraft('验收伙伴乙（自动）') })).json()).id;
  await page.goto(`${base}/contacts`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.contact-metrics');
  await addContact('验收联系人甲', true);
  await addContact('验收联系人乙', true);
  let contacts = await page.request.get(`${base}/api/contacts`).then((response) => response.json());
  const first = contacts.find((item) => item.name === '验收联系人甲');
  const second = contacts.find((item) => item.name === '验收联系人乙');
  if (first.isPrimary || !second.isPrimary) throw new Error('primary contact exclusivity failed');
  console.log('multiple contacts: two contacts / latest primary is exclusive');

  await page.goto(`${base}/partners/${partnerA}`, { waitUntil: 'domcontentloaded' });
  await page.locator('.detail-actions').getByRole('button', { name: '记跟进' }).click();
  await page.locator('label').filter({ hasText: '本次对接人' }).locator('select').selectOption(second.id);
  await page.locator('.followup-form textarea').fill('与验收联系人乙完成联系人关联验收。');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/followups') && response.ok()),
    page.locator('button[form="followup-form"]').click(),
  ]);
  await page.waitForSelector('.modal', { state: 'detached' });
  await expect(page.locator('.recent-timeline-card')).toContainText('验收联系人乙');
  console.log('followup: linked to selected contact');

  await page.goto(`${base}/opportunities`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '登记商机', exact: true }).click();
  await page.locator('label').filter({ hasText: '来源伙伴' }).locator('select').selectOption({ label: '验收伙伴甲（自动）' });
  await page.locator('label').filter({ hasText: '引荐人 / 来源联系人' }).locator('select').selectOption(second.id);
  await page.locator('.opportunity-form .form-grid input').nth(0).fill('人脉验收客户');
  await page.locator('.opportunity-form .form-grid input').nth(1).fill('人脉贡献验收商机');
  await page.locator('.opportunity-form textarea').fill('客户已确认研发协同需求，用于验证联系人贡献关联。');
  await page.locator('.amount-field input').fill('6.6');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/opportunities') && response.request().method() === 'POST' && response.ok()),
    page.locator('button[form="opportunity-form"]').click(),
  ]);
  await page.waitForSelector('.modal', { state: 'detached' });
  console.log('opportunity: source contact and amount saved');

  await page.goto(`${base}/contacts`, { waitUntil: 'domcontentloaded' });
  await page.locator('.contacts-toolbar input').fill('验收联系人乙');
  let row = page.locator('.contact-record').filter({ hasText: '验收联系人乙' });
  await row.getByTitle('离职或任职变动').click();
  await page.locator('.contact-move-form textarea').fill('验收离职流程，历史关系需要保留。');
  await Promise.all([
    page.waitForResponse((response) => /\/api\/contacts\/[^/]+$/.test(response.url()) && response.request().method() === 'PUT' && response.ok()),
    page.getByRole('button', { name: '确认离职' }).click(),
  ]);
  await page.waitForSelector('.modal', { state: 'detached' });
  await expect(row).toContainText('已离职');
  await expect(row).not.toContainText('首要');

  await row.getByTitle('离职或任职变动').click();
  await page.locator('label').filter({ hasText: '新任职伙伴' }).locator('select').selectOption({ label: '验收伙伴乙（自动）' });
  await page.locator('label').filter({ hasText: '新职务' }).locator('input').fill('新伙伴渠道负责人');
  await page.locator('.contact-move-form textarea').fill('加入新伙伴，继续负责渠道合作。');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/move') && response.ok()),
    page.getByRole('button', { name: '确认任职变动' }).click(),
  ]);
  await page.waitForSelector('.modal', { state: 'detached' });
  contacts = await page.request.get(`${base}/api/contacts`).then((response) => response.json());
  const moved = contacts.find((item) => item.name === '验收联系人乙');
  if (moved.partnerId !== partnerB || moved.employmentStatus !== '在职' || moved.careers.length !== 2) throw new Error('career move failed');
  console.log('career: leave recorded / new partner assigned / two career entries preserved');

  await page.goto(`${base}/partners/${partnerA}`, { waitUntil: 'domcontentloaded' });
  await page.locator('.detail-tabs button').nth(4).click();
  await expect(page.locator('.partner-contacts-panel')).toContainText('验收联系人乙');
  await expect(page.locator('.partner-contacts-panel')).toContainText('历史任职');
  const partnerData = await page.request.get(`${base}/api/partners/${partnerA}`).then((response) => response.json());
  const opportunities = await page.request.get(`${base}/api/opportunities`).then((response) => response.json());
  const output = opportunities.find((item) => item.customerName === '人脉验收客户');
  if (partnerData.followUps[0].contactId !== second.id || output.sourceContactId !== second.id) throw new Error('historical links were not preserved');
  console.log('history: old partner shows historical role / followup and contribution links unchanged');

  await row.count();
  if (errors.length) throw new Error(errors.join('\n'));
  await cleanup(); partnerA = ''; partnerB = '';
  console.log('CONTACT E2E PASS');
} finally {
  await cleanup();
  await browser.close();
}
