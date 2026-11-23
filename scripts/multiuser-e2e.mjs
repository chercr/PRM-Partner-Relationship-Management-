import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const base = 'http://127.0.0.1:3001';
const username = `member_${Date.now()}`;
const password = 'Member@2026';
let userId = '';
let partnerId = '';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const partnerDraft = { name: '多用户验收伙伴（自动）', type: 'AGENT', region: '华东', scale: '', businessDesc: '', decisionMaker: '', sourceName: '', sourceUrl: '', contact: '', verifyStatus: '待核实', verifyNote: '', batch: '蓄水池', priorityOrder: 999, status: '未接触', note: '', scores: {} };

async function cleanup() {
  const adminContext = await browser.newContext();
  await adminContext.request.post(`${base}/api/auth/login`, { data: { username: 'admin', password: 'Qucheng@2026' } });
  const partners = await adminContext.request.get(`${base}/api/partners`).then((response) => response.ok() ? response.json() : []);
  for (const partner of partners.filter((item) => item.name === partnerDraft.name)) await adminContext.request.delete(`${base}/api/partners/${partner.id}`);
  const users = await adminContext.request.get(`${base}/api/users`).then((response) => response.ok() ? response.json() : []);
  for (const user of users.filter((item) => item.username === username)) await adminContext.request.delete(`${base}/api/users/${user.id}`);
  await adminContext.close();
  partnerId = ''; userId = '';
}

try {
  await cleanup();
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.login-form');
  await page.locator('.auth-switch').click();
  await page.locator('input[autocomplete="name"]').fill('验收成员A');
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="email"]').fill('member@example.com');
  await page.locator('input[autocomplete="new-password"]').nth(0).fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  const registerResponse = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/auth/register') && response.status() === 201),
    page.locator('.login-submit').click(),
  ]);
  userId = (await registerResponse[0].json()).user.id;
  await page.waitForSelector('.app-shell');
  await expect(page.locator('.user-card')).toContainText('成员');
  console.log('registration: member account created and signed in');

  await page.locator('.sidebar-collapse').click();
  await expect(page.locator('.app-shell')).toHaveClass(/sidebar-collapsed/);
  await page.waitForTimeout(300);
  const width = await page.locator('.sidebar').evaluate((element) => getComputedStyle(element).width);
  if (width !== '76px') throw new Error(`sidebar width ${width}`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.app-shell');
  await expect(page.locator('.app-shell')).toHaveClass(/sidebar-collapsed/);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400); await page.screenshot({ path: '.playwright/sidebar-collapsed.png', fullPage: false });
  await page.locator('.sidebar-collapse').click();
  console.log('sidebar: 76px icon mode and persisted preference passed');

  await page.locator('.user-avatar').click();
  await page.waitForURL(/\/profile$/);
  await page.locator('label').filter({ hasText: '姓名 / 显示名称' }).locator('input').fill('验收成员A+');
  await page.locator('label').filter({ hasText: '职务 / 角色说明' }).locator('input').fill('渠道测试成员');
  await page.locator('.avatar-color-options button').nth(1).click();
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/profile') && response.ok()),
    page.getByRole('button', { name: '保存个人资料' }).click(),
  ]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.profile-card')).toContainText('验收成员A+');
  await expect(page.locator('.profile-card')).toContainText('渠道测试成员');
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400); await page.screenshot({ path: '.playwright/multiuser-profile.png', fullPage: true });
  console.log('profile: name, title, and avatar preference persisted');

  const forbiddenUsers = await page.request.get(`${base}/api/users`);
  const forbiddenReset = await page.request.post(`${base}/api/admin/reset-data`, { data: { password, confirmation: '清空' } });
  if (forbiddenUsers.status() !== 403 || forbiddenReset.status() !== 403) throw new Error('member permission boundary failed');
  const createdPartner = await page.request.post(`${base}/api/partners`, { data: partnerDraft }).then((response) => response.json());
  partnerId = createdPartner.id;
  if (createdPartner.createdBy !== userId) throw new Error('partner creator attribution failed');
  const partnerWithFollowup = await page.request.post(`${base}/api/partners/${partnerId}/followups`, { data: { date: new Date().toISOString().slice(0, 10), channel: '微信', summary: '多用户创建人验收', tags: [] } }).then((response) => response.json());
  if (partnerWithFollowup.followUps[0].createdByName !== '验收成员A+') throw new Error('followup creator attribution failed');
  console.log('permissions: member admin APIs rejected; shared records include creator');

  await page.locator('.user-logout').click();
  await page.waitForSelector('.login-form');
  await page.locator('input[autocomplete="username"]').fill('admin');
  await page.locator('input[autocomplete="current-password"]').fill('Qucheng@2026');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/auth/login') && response.ok()),
    page.locator('.login-submit').click(),
  ]);
  await page.waitForSelector('.app-shell');
  await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.member-management');
  const row = page.locator('.member-table tbody tr').filter({ hasText: username });
  await expect(row).toContainText('验收成员A+');
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/role') && response.ok()), row.locator('select').selectOption('admin')]);
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/role') && response.ok()), row.locator('select').selectOption('member')]);
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/status') && response.ok()), row.getByTitle('停用账号').click()]);
  await expect(row).toContainText('已停用');
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/status') && response.ok()), row.getByTitle('启用账号').click()]);
  await expect(row).toContainText('正常');
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400); await page.screenshot({ path: '.playwright/member-management.png', fullPage: true });
  console.log('admin: role, disable, and enable member actions passed');

  const partners = await page.request.get(`${base}/api/partners`).then((response) => response.json());
  if (!partners.some((item) => item.id === partnerId)) throw new Error('single-tenant shared data not visible to admin');
  await cleanup();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('MULTIUSER E2E PASS');
} finally {
  await cleanup();
  await browser.close();
}
