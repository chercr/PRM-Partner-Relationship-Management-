import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db';
import type { ProfileDraft, RegisterDraft, UserRole, UserStatus } from '../src/types';

export interface AuthUser {
  id: string; username: string; displayName: string; role: UserRole; status: UserStatus;
  email: string; title: string; phone: string; bio: string; avatarColor: string;
  createdAt: string; lastLoginAt?: string;
}
type UserRow = {
  id: string; username: string; password_hash: string; display_name: string;
  role?: UserRole; status?: UserStatus; email?: string; title?: string; phone?: string;
  bio?: string; avatar_color?: string; last_login_at?: string; created_at: string;
};
const SESSION_SECONDS = 7 * 86400;
const failures = new Map<string, { count: number; resetAt: number }>();
const avatarColors = ['#6c63d9', '#278e74', '#367ab5', '#bd771d', '#a4516b', '#4c6a86'];

function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id, username: row.username, displayName: row.display_name,
    role: row.role || 'member', status: row.status || 'active', email: row.email || '',
    title: row.title || '', phone: row.phone || '', bio: row.bio || '',
    avatarColor: row.avatar_color || '#6c63d9', createdAt: row.created_at, lastLoginAt: row.last_login_at || undefined,
  };
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
function emailIsValid(email: string): boolean {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function getUser(id: string): AuthUser | null {
  const row = db.prepare('SELECT * FROM users WHERE id=?').get(id) as unknown as UserRow | undefined;
  return row ? mapUser(row) : null;
}

export function ensureAdmin(): void {
  db.prepare("UPDATE users SET status='active' WHERE status IS NULL OR status=''").run();
  db.prepare("UPDATE users SET role='member' WHERE role IS NULL OR role=''").run();
  const username = process.env.ADMIN_USERNAME || 'admin';
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM users WHERE username=?').get(username) as unknown as UserRow | undefined;
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Qucheng@2026');
    if (!password) throw new Error('生产环境首次启动前必须设置 ADMIN_PASSWORD');
    if (!passwordIsValid(password)) throw new Error('ADMIN_PASSWORD 至少 8 位，且需包含字母和数字');
    db.prepare(`INSERT INTO users(id, username, password_hash, display_name, role, status, email, title, phone, bio, avatar_color, created_at, updated_at)
      VALUES(?, ?, ?, ?, 'admin', 'active', '', '', '', '', ?, ?, ?)`).run(
      randomUUID(), username, hashPassword(password), process.env.ADMIN_DISPLAY_NAME || '系统管理员', '#6c63d9', now, now,
    );
  } else {
    db.prepare("UPDATE users SET role='admin', status='active', updated_at=? WHERE id=?").run(now, existing.id);
    if (process.env.ADMIN_PASSWORD) {
      if (!passwordIsValid(process.env.ADMIN_PASSWORD)) throw new Error('ADMIN_PASSWORD 至少 8 位，且需包含字母和数字');
      db.prepare('UPDATE users SET password_hash=?, updated_at=? WHERE id=?').run(hashPassword(process.env.ADMIN_PASSWORD), now, existing.id);
    }
  }
  db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
}

export function registerUser(draft: RegisterDraft): AuthUser {
  const username = draft.username.trim();
  const displayName = draft.displayName.trim();
  if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) throw new Error('账号需为 3–24 位字母、数字或 _ . -');
  if (!displayName || displayName.length > 30) throw new Error('姓名不能为空，且不能超过 30 个字符');
  if (!emailIsValid(draft.email.trim())) throw new Error('邮箱格式不正确');
  if (!passwordIsValid(draft.password)) throw new Error('密码至少 8 位，且需包含字母和数字');
  if (db.prepare('SELECT id FROM users WHERE username=? COLLATE NOCASE').get(username)) throw new Error('该账号已被注册');
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO users(id, username, password_hash, display_name, role, status, email, title, phone, bio, avatar_color, created_at, updated_at)
    VALUES(?, ?, ?, ?, 'member', 'active', ?, '', '', '', ?, ?, ?)`).run(
    id, username, hashPassword(draft.password), displayName, draft.email.trim(), avatarColors[Date.now() % avatarColors.length], now, now,
  );
  return getUser(id)!;
}

export function updateProfile(userId: string, draft: ProfileDraft): AuthUser {
  const current = getUser(userId);
  if (!current) throw new Error('账号不存在');
  const displayName = draft.displayName.trim();
  if (!displayName || displayName.length > 30) throw new Error('姓名不能为空，且不能超过 30 个字符');
  if (!emailIsValid(draft.email.trim())) throw new Error('邮箱格式不正确');
  if (!/^#[0-9a-fA-F]{6}$/.test(draft.avatarColor)) throw new Error('头像颜色格式不正确');
  db.prepare(`UPDATE users SET display_name=?, email=?, title=?, phone=?, bio=?, avatar_color=?, updated_at=? WHERE id=?`).run(
    displayName, draft.email.trim(), draft.title.trim(), draft.phone.trim(), draft.bio.trim(), draft.avatarColor, new Date().toISOString(), userId,
  );
  return getUser(userId)!;
}

export function listUsers(): AuthUser[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as unknown as UserRow[];
  return rows.map(mapUser);
}
export function setUserRole(id: string, role: UserRole, operatorId: string): AuthUser {
  if (id === operatorId) throw new Error('不能修改自己的管理员角色');
  if (!['admin', 'member'].includes(role)) throw new Error('角色不正确');
  db.prepare('UPDATE users SET role=?, updated_at=? WHERE id=?').run(role, new Date().toISOString(), id);
  const user = getUser(id);
  if (!user) throw new Error('账号不存在');
  return user;
}
export function setUserStatus(id: string, status: UserStatus, operatorId: string): AuthUser {
  if (id === operatorId) throw new Error('不能停用自己的账号');
  if (!['active', 'disabled'].includes(status)) throw new Error('账号状态不正确');
  db.prepare('UPDATE users SET status=?, updated_at=? WHERE id=?').run(status, new Date().toISOString(), id);
  if (status === 'disabled') db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
  const user = getUser(id);
  if (!user) throw new Error('账号不存在');
  return user;
}
export function deleteUser(id: string, operatorId: string): void {
  if (id === operatorId) throw new Error('不能删除当前登录的管理员账号');
  if (!getUser(id)) throw new Error('账号不存在');
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
  db.prepare('DELETE FROM users WHERE id=?').run(id);
}

export function verifyLogin(username: string, password: string): AuthUser | null {
  const row = db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE').get(username) as unknown as UserRow | undefined;
  if (!row || row.status === 'disabled' || !matchesPassword(password, row.password_hash)) return null;
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_at=? WHERE id=?').run(now, row.id);
  return { ...mapUser(row), lastLoginAt: now };
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
  const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token=? AND s.expires_at>? AND u.status='active'`).get(token, new Date().toISOString()) as unknown as UserRow | undefined;
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
export function requireAdmin(_req: Request, res: Response, next: NextFunction): void {
  if (res.locals.user?.role !== 'admin') { res.status(403).json({ error: '仅管理员可以执行此操作' }); return; }
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
