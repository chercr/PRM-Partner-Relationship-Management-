import { chromium, expect } from '@playwright/test';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const base = 'http://127.0.0.1:3001';
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function login(password) {
  await page.locator('input[autocomplete="username"]').fill('admin');
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('.login-submit').click();
}
async function changePassword(currentPassword, newPassword) {
  await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '修改登录密码' }).click();
  const inputs = page.locator('#password-form input');
  await inputs.nth(0).fill(currentPassword);
  await inputs.nth(1).fill(newPassword);
  await inputs.nth(2).fill(newPassword);
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/auth/password') && response.ok()),
    page.locator('button[form="password-form"]').click(),
  ]);
  await page.waitForSelector('.modal', { state: 'detached' });
}

try {
  const unauthenticated = await page.request.get(`${base}/api/partners`);
  if (unauthenticated.status() !== 401) throw new Error(`expected 401, got ${unauthenticated.status()}`);
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.login-form');
  await page.screenshot({ path: '.playwright/login.png', fullPage: true });
  await login('wrong-password1');
  await expect(page.locator('.login-form .form-error')).toContainText('账号或密码不正确');
  console.log('security: unauthenticated API rejected / wrong password rejected');

  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/auth/login') && response.ok()),
    login('Qucheng@2026'),
  ]);
  await page.waitForSelector('.app-shell');
  await expect(page.locator('.user-card')).toContainText('admin');
  console.log('login: HttpOnly session accepted');

  await changePassword('Qucheng@2026', 'Qucheng@2027');
  await page.locator('.user-logout').click();
  await page.waitForSelector('.login-form');
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/auth/login') && response.ok()),
    login('Qucheng@2027'),
  ]);
  await page.waitForSelector('.app-shell');
  console.log('password: change, logout, new-password login passed');

  await changePassword('Qucheng@2027', 'Qucheng@2026');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('AUTH E2E PASS');
} finally {
  await browser.close();
}
