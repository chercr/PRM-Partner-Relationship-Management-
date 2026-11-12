export async function loginForTest(page, base = 'http://127.0.0.1:3001') {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const login = page.locator('.login-form');
  if (await login.count()) {
    await page.locator('input[autocomplete="username"]').fill(process.env.ADMIN_USERNAME || 'admin');
    await page.locator('input[autocomplete="current-password"]').fill(process.env.TEST_ADMIN_PASSWORD || 'Qucheng@2026');
    await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/auth/login') && response.ok()),
      page.locator('.login-submit').click(),
    ]);
    await page.waitForSelector('.app-shell');
  }
}
