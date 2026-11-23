import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { loginForTest } from './test-auth.mjs';

const mock = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let content = '连接成功';
    if (body) {
      const request = JSON.parse(body);
      const latest = request.messages?.at(-1)?.content || '';
      if (latest !== '请只回复：连接成功') {
        if (latest.includes('联系人')) {
          content = JSON.stringify({ reply: '已整理联系人信息。', action: 'create_contact', data: { partnerName: 'AI验收伙伴', name: '陈经理', title: '商务经理', role: '商务对接', wechat: 'chen-demo', isPrimary: false, notes: 'AI 验收虚拟联系人' } });
        } else if (latest.includes('商机')) {
          content = JSON.stringify({ reply: '已整理商机与预计金额。', action: 'create_opportunity', data: { partnerName: 'AI验收伙伴', customerName: 'AI虚拟制造企业', name: '研发协同项目', demand: '客户需要研发流程数字化与项目协同', expectedAmount: 12, stage: 'OPPORTUNITY' } });
        } else if (latest.includes('跟进')) {
          content = JSON.stringify({ reply: '已整理本次沟通记录。', action: 'add_followup', data: { partnerName: 'AI验收伙伴', summary: 'AI模拟沟通完成，约定下周再联系', channel: '微信', tags: [] } });
        } else {
          const name = latest.includes('取消') ? 'AI取消伙伴' : 'AI验收伙伴';
          content = JSON.stringify({ reply: `已识别伙伴 ${name} 的信息。`, action: 'create_partner', data: { name, type: 'AGENT', region: '华东', batch: '蓄水池', businessDesc: 'AI 验收虚拟业务画像' } });
        }
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }));
  });
});
await new Promise((resolve) => mock.listen(4099, '127.0.0.1', resolve));

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const base = 'http://127.0.0.1:3001';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await loginForTest(page);
  await page.locator('.ai-launcher').click();
  await page.waitForSelector('.ai-panel');
  await expect(page.locator('.ai-welcome')).toContainText('自然语言');
  await page.locator('.ai-input-area textarea').fill('测试未配置状态');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/ai/chat') && response.ok()),
    page.locator('.ai-send').click(),
  ]);
  await expect(page.locator('.ai-messages')).toContainText('尚未配置 AI 服务');
  await page.getByTitle('配置 AI 服务').click();
  await page.locator('.ai-config-form input').nth(0).fill('http://127.0.0.1:4099/v1');
  await page.locator('.ai-config-form input').nth(1).fill('mock-model');
  await page.locator('.ai-config-form input').nth(2).fill('test-token-not-secret');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/ai/config/test') && response.ok()),
    page.getByRole('button', { name: '保存并测试连接' }).click(),
  ]);
  await expect(page.locator('.ai-header')).toContainText('mock-model');
  console.log('config: encrypted token saved / provider connection passed');

  await page.locator('.ai-input-area textarea').fill('新增伙伴：AI验收伙伴，代理商，华东');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/ai/chat') && response.ok()),
    page.locator('.ai-send').click(),
  ]);
  await expect(page.locator('.ai-proposal')).toContainText('新增伙伴「AI验收伙伴」');
  await expect(page.locator('.ai-proposal')).toContainText('华东');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '.playwright/ai-assistant.png', fullPage: false });
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/execute') && response.ok()),
    page.getByRole('button', { name: '确认写入' }).click(),
  ]);
  await expect(page.locator('.ai-proposal.executed')).toContainText('已自动入库');
  const partners = await page.request.get(`${base}/api/partners`).then((response) => response.json());
  const created = partners.find((item) => item.name === 'AI验收伙伴');
  if (!created || created.createdBy !== (await page.request.get(`${base}/api/auth/me`).then((response) => response.json())).user.id) throw new Error('AI partner was not created with current user');
  console.log('execute: proposal confirmed / partner inserted / creator attributed');

  await page.locator('.ai-input-area textarea').fill('为AI验收伙伴添加一条微信跟进：AI模拟沟通完成，约定下周再联系');
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/api/ai/chat') && response.ok()), page.locator('.ai-send').click()]);
  await expect(page.locator('.ai-proposal').last()).toContainText('添加跟进');
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/execute') && response.ok()), page.getByRole('button', { name: '确认写入' }).last().click()]);
  const withFollowup = await page.request.get(`${base}/api/partners/${created.id}`).then((response) => response.json());
  if (!withFollowup.followUps.some((item) => item.summary === 'AI模拟沟通完成，约定下周再联系' && item.createdBy === created.createdBy)) throw new Error('AI followup insertion failed');
  console.log('followup: AI proposal inserted with current user');

  await page.locator('.ai-input-area textarea').fill('为AI验收伙伴新增联系人陈经理，商务对接，微信chen-demo');
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/api/ai/chat') && response.ok()), page.locator('.ai-send').click()]);
  await expect(page.locator('.ai-proposal').last()).toContainText('陈经理');
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/execute') && response.ok()), page.getByRole('button', { name: '确认写入' }).last().click()]);
  const contacts = await page.request.get(`${base}/api/contacts`).then((response) => response.json());
  if (!contacts.some((item) => item.name === '陈经理' && item.partnerId === created.id && item.createdBy === created.createdBy)) throw new Error('AI contact insertion failed');
  console.log('contact: AI proposal inserted and linked to partner');

  await page.locator('.ai-input-area textarea').fill('为AI验收伙伴登记商机：某制造企业研发协同项目，真实需求为研发流程数字化，预计金额12万元');
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/api/ai/chat') && response.ok()), page.locator('.ai-send').click()]);
  await expect(page.locator('.ai-proposal').last()).toContainText('12 万元');
  await Promise.all([page.waitForResponse((response) => response.url().endsWith('/execute') && response.ok()), page.getByRole('button', { name: '确认写入' }).last().click()]);
  const opportunities = await page.request.get(`${base}/api/opportunities`).then((response) => response.json());
  if (!opportunities.some((item) => item.partnerId === created.id && item.expectedAmount === 12 && item.createdBy === created.createdBy)) throw new Error('AI opportunity insertion failed');
  console.log('opportunity: demand and expected amount inserted correctly');

  await page.locator('.ai-input-area textarea').fill('新增伙伴：AI取消伙伴，代理商，华东');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/ai/chat') && response.ok()),
    page.locator('.ai-send').click(),
  ]);
  await page.getByRole('button', { name: '取消' }).last().click();
  await expect(page.locator('.ai-proposal.cancelled')).toContainText('已取消');
  const afterCancel = await page.request.get(`${base}/api/partners`).then((response) => response.json());
  if (afterCancel.some((item) => item.name === 'AI取消伙伴')) throw new Error('cancelled proposal was executed');
  console.log('cancel: cancelled proposal never writes data');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const panelBounds = await page.locator('.ai-panel').boundingBox();
  if (!panelBounds || panelBounds.x < 0 || panelBounds.x + panelBounds.width > 390) throw new Error('AI panel overflows mobile viewport');
  await page.screenshot({ path: '.playwright/ai-mobile.png', fullPage: false });
  console.log('mobile: AI panel fits 390px viewport');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTitle('清空对话').click();
  await expect(page.locator('.ai-welcome')).toBeVisible();
  await page.request.delete(`${base}/api/partners/${created.id}`);
  await page.request.delete(`${base}/api/ai/config`);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('AI E2E PASS');
} finally {
  await page.request.delete(`${base}/api/ai/config`).catch(() => {});
  await page.request.delete(`${base}/api/ai/messages`).catch(() => {});
  const partners = await page.request.get(`${base}/api/partners`).then((response) => response.ok() ? response.json() : []);
  for (const partner of partners.filter((item) => ['AI验收伙伴', 'AI取消伙伴'].includes(item.name))) await page.request.delete(`${base}/api/partners/${partner.id}`);
  await browser.close();
  await new Promise((resolve) => mock.close(resolve));
}
