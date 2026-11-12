import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db';

export interface AuthUser { id: string; username: string; displayName: string }
type UserRow = { id: string; username: string; password_hash: string; display_name: string };
const SESSION_SECONDS = 7 * 86400;
const failures = new Map<string, { count: number; resetAt: number }>();

function mapUser(row: UserRow): AuthUser {
  return { id: row.id, username: row.username, displayName: row.display_name };
}
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function matchesPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function passwordIsValid(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function ensureAdmin(): void {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM users WHERE username=?').get(username) as unknown as UserRow | undefined;
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Qucheng@2026');
    if (!password) throw new Error('生产环境首次启动前必须设置 ADMIN_PASSWORD');
    if (!passwordIsValid(password)) throw new Error('ADMIN_PASSWORD 至少 8 位，且需包含字母和数字');
    db.prepare('INSERT INTO users(id, username, password_hash, display_name, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)').run(
      randomUUID(), username, hashPassword(password), process.env.ADMIN_DISPLAY_NAME || '系统管理员', now, now,
    );
  } else if (process.env.ADMIN_PASSWORD) {
    if (!passwordIsValid(process.env.ADMIN_PASSWORD)) throw new Error('ADMIN_PASSWORD 至少 8 位，且需包含字母和数字');
    db.prepare('UPDATE users SET password_hash=?, updated_at=? WHERE id=?').run(hashPassword(process.env.ADMIN_PASSWORD), now, existing.id);
  }
  db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
}

export function verifyLogin(username: string, password: string): AuthUser | null {
  const row = db.prepare('SELECT * FROM users WHERE username=?').get(username) as unknown as UserRow | undefined;
  return row && matchesPassword(password, row.password_hash) ? mapUser(row) : null;
}

export function verifyUserPassword(userId: string, password: string): boolean {
  const row = db.prepare('SELECT * FROM users WHERE id=?').get(userId) as unknown as UserRow | undefined;
  return Boolean(row && matchesPassword(password, row.password_hash));
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  db.prepare('INSERT INTO sessions(token, user_id, expires_at, created_at) VALUES(?, ?, ?, ?)').run(
    token, userId, new Date(now.getTime() + SESSION_SECONDS * 1000).toISOString(), now.toISOString(),
  );
  return token;
}

export function getSessionUser(token?: string): AuthUser | null {
  if (!token) return null;
  const row = db.prepare(`SELECT u.id, u.username, u.password_hash, u.display_name FROM sessions s
    JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?`).get(token, new Date().toISOString()) as unknown as UserRow | undefined;
  return row ? mapUser(row) : null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = parseCookies(req.headers.cookie).channel_session;
  const user = getSessionUser(token);
  if (!user) { res.status(401).json({ error: '登录已失效，请重新登录' }); return; }
  res.locals.user = user;
  res.locals.sessionToken = token;
  next();
}

function parseCookies(value?: string): Record<string, string> {
  const result: Record<string, string> = {};
  (value || '').split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index > 0) result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  });
  return result;
}

export function setSessionCookie(res: Response, token: string): void {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `channel_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}${secure}`);
}
export function clearSessionCookie(res: Response): void {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `channel_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}
export function removeSession(token?: string): void {
  if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(token);
}

export function changePassword(userId: string, sessionToken: string, currentPassword: string, newPassword: string): void {
  if (!verifyUserPassword(userId, currentPassword)) throw new Error('当前密码不正确');
  if (!passwordIsValid(newPassword)) throw new Error('新密码至少 8 位，且需包含字母和数字');
  if (currentPassword === newPassword) throw new Error('新密码不能与当前密码相同');
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash=?, updated_at=? WHERE id=?').run(hashPassword(newPassword), now, userId);
  db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(userId, sessionToken);
}

export function loginBlocked(key: string): boolean {
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= Date.now()) { failures.delete(key); return false; }
  return entry.count >= 5;
}
export function recordLogin(key: string, success: boolean): void {
  if (success) { failures.delete(key); return; }
  const current = failures.get(key);
  if (!current || current.resetAt <= Date.now()) failures.set(key, { count: 1, resetAt: Date.now() + 15 * 60 * 1000 });
  else current.count += 1;
}
