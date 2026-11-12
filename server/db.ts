import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Contact, ContactCareer, ContactDraft, ContactMoveDraft, FollowUp, Opportunity, OpportunityDraft, Partner, PartnerDraft, ScoreSet } from '../src/types';

const dataDir = path.resolve('data');
mkdirSync(path.join(dataDir, 'backups'), { recursive: true });
export const db = new DatabaseSync(path.join(dataDir, 'channel.db'));

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    region TEXT NOT NULL DEFAULT '',
    scale TEXT NOT NULL DEFAULT '',
    business_desc TEXT NOT NULL DEFAULT '',
    decision_maker TEXT NOT NULL DEFAULT '',
    source_name TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    verify_status TEXT NOT NULL DEFAULT '待核实',
    verify_note TEXT NOT NULL DEFAULT '',
    batch TEXT NOT NULL DEFAULT '蓄水池',
    priority_order INTEGER NOT NULL DEFAULT 999,
    status TEXT NOT NULL DEFAULT '未接触',
    sign_date TEXT,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS scores (
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
    updated_at TEXT NOT NULL,
    PRIMARY KEY(partner_id, dimension)
  );
  CREATE TABLE IF NOT EXISTS follow_ups (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    channel TEXT NOT NULL,
    summary TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    next_followup_date TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_followups_partner ON follow_ups(partner_id);
  CREATE INDEX IF NOT EXISTS idx_followups_next ON follow_ups(next_followup_date);
  CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    name TEXT NOT NULL,
    demand TEXT NOT NULL DEFAULT '',
    expected_amount REAL,
    stage TEXT NOT NULL DEFAULT 'LEAD' CHECK(stage IN ('LEAD', 'OPPORTUNITY')),
    source_followup_id TEXT REFERENCES follow_ups(id) ON DELETE SET NULL,
    source_contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    converted_at TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_opportunities_partner ON opportunities(partner_id);
  CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    wechat TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '普通联系人',
    is_primary INTEGER NOT NULL DEFAULT 0,
    employment_status TEXT NOT NULL DEFAULT '在职',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS contact_careers (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    start_date TEXT,
    end_date TEXT,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_contacts_partner ON contacts(partner_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(employment_status);
  CREATE INDEX IF NOT EXISTS idx_careers_contact ON contact_careers(contact_id, start_date DESC);
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '系统管理员',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

function ensureColumn(table: string, column: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`);
}
ensureColumn('follow_ups', 'contact_id');
ensureColumn('opportunities', 'source_contact_id');

type PartnerRow = {
  id: string; name: string; type: Partner['type']; region: string; scale: string;
  business_desc: string; decision_maker: string; source_name: string; source_url: string;
  contact: string; verify_status: Partner['verifyStatus']; verify_note: string; batch: Partner['batch'];
  priority_order: number; status: Partner['status']; sign_date?: string; note: string;
  created_at: string; updated_at: string;
};
type FollowupRow = {
  id: string; partner_id: string; contact_id?: string; date: string; channel: FollowUp['channel']; summary: string;
  tags: string; next_followup_date?: string; created_at: string;
};

const PARTNER_COLUMNS = `id, name, type, region, scale, business_desc, decision_maker, source_name,
  source_url, contact, verify_status, verify_note, batch, priority_order, status, sign_date, note, created_at, updated_at`;

function mapFollowup(row: FollowupRow): FollowUp {
  return {
    id: row.id, partnerId: row.partner_id, contactId: row.contact_id || undefined, date: row.date, channel: row.channel,
    summary: row.summary, tags: JSON.parse(row.tags || '[]'), nextFollowupDate: row.next_followup_date || undefined,
    createdAt: row.created_at,
  };
}

function hydrate(row: PartnerRow): Partner {
  const scores: ScoreSet = {};
  const scoreRows = db.prepare('SELECT dimension, score FROM scores WHERE partner_id = ?').all(row.id) as unknown as Array<{ dimension: keyof ScoreSet; score: number }>;
  scoreRows.forEach((score) => { scores[score.dimension] = score.score; });
  const followupRows = db.prepare('SELECT * FROM follow_ups WHERE partner_id = ? ORDER BY date DESC, created_at DESC').all(row.id) as unknown as FollowupRow[];
  return {
    id: row.id, name: row.name, type: row.type, region: row.region, scale: row.scale,
    businessDesc: row.business_desc, decisionMaker: row.decision_maker, sourceName: row.source_name,
    sourceUrl: row.source_url, contact: row.contact, verifyStatus: row.verify_status, verifyNote: row.verify_note,
    batch: row.batch, priorityOrder: row.priority_order, status: row.status, signDate: row.sign_date || undefined,
    note: row.note, scores, followUps: followupRows.map(mapFollowup), createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function listPartners(): Partner[] {
  const rows = db.prepare(`SELECT ${PARTNER_COLUMNS} FROM partners ORDER BY priority_order ASC, created_at DESC`).all() as unknown as PartnerRow[];
  return rows.map(hydrate);
}

export function getPartner(id: string): Partner | null {
  const row = db.prepare(`SELECT ${PARTNER_COLUMNS} FROM partners WHERE id = ?`).get(id) as unknown as PartnerRow | undefined;
  return row ? hydrate(row) : null;
}

export function createPartner(draft: PartnerDraft): Partner {
  if (!draft.name?.trim()) throw new Error('公司名称不能为空');
  if (!['AGENT', 'SI', 'IPD', 'EXPERT'].includes(draft.type)) throw new Error('请选择正确的伙伴类型');
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO partners (
    id, name, type, region, scale, business_desc, decision_maker, source_name, source_url, contact,
    verify_status, verify_note, batch, priority_order, status, sign_date, note, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, draft.name.trim(), draft.type, draft.region || '', draft.scale || '', draft.businessDesc || '',
    draft.decisionMaker || '', draft.sourceName || '', draft.sourceUrl || '', draft.contact || '',
    draft.verifyStatus || '待核实', draft.verifyNote || '', draft.batch || '蓄水池', draft.priorityOrder ?? 999,
    draft.status || '未接触', draft.signDate || null, draft.note || '', now, now,
  );
  if (draft.scores) writeScores(id, draft.scores);
  return getPartner(id)!;
}

export function updatePartner(id: string, draft: Partial<PartnerDraft>): Partner {
  const current = getPartner(id);
  if (!current) throw new Error('伙伴不存在或已被删除');
  const merged = { ...current, ...draft, name: draft.name?.trim() || current.name };
  if (merged.status === '已签约' && !merged.signDate) throw new Error('推进到已签约时，请填写签约日期');
  db.prepare(`UPDATE partners SET name=?, type=?, region=?, scale=?, business_desc=?, decision_maker=?,
    source_name=?, source_url=?, contact=?, verify_status=?, verify_note=?, batch=?, priority_order=?,
    status=?, sign_date=?, note=?, updated_at=? WHERE id=?`).run(
    merged.name, merged.type, merged.region || '', merged.scale || '', merged.businessDesc || '',
    merged.decisionMaker || '', merged.sourceName || '', merged.sourceUrl || '', merged.contact || '',
    merged.verifyStatus, merged.verifyNote || '', merged.batch, merged.priorityOrder, merged.status,
    merged.signDate || null, merged.note || '', new Date().toISOString(), id,
  );
  return getPartner(id)!;
}

function writeScores(id: string, scores: ScoreSet): void {
  const now = new Date().toISOString();
  const statement = db.prepare(`INSERT INTO scores(partner_id, dimension, score, updated_at) VALUES(?, ?, ?, ?)
    ON CONFLICT(partner_id, dimension) DO UPDATE SET score=excluded.score, updated_at=excluded.updated_at`);
  Object.entries(scores).forEach(([dimension, score]) => {
    if (score === undefined || score === null || score === 0) {
      db.prepare('DELETE FROM scores WHERE partner_id=? AND dimension=?').run(id, dimension);
    } else if (Number.isInteger(score) && score >= 1 && score <= 5) {
      statement.run(id, dimension, score, now);
    } else throw new Error('评分必须为 1–5 的整数');
  });
}

export function saveScores(id: string, scores: ScoreSet): Partner {
  if (!getPartner(id)) throw new Error('伙伴不存在或已被删除');
  writeScores(id, scores);
  db.prepare('UPDATE partners SET updated_at=? WHERE id=?').run(new Date().toISOString(), id);
  return getPartner(id)!;
}

export function deletePartner(id: string): void {
  db.prepare('DELETE FROM partners WHERE id=?').run(id);
}

export function addFollowup(id: string, draft: Omit<FollowUp, 'id' | 'partnerId' | 'createdAt'>): Partner {
  const partner = getPartner(id);
  if (!partner) throw new Error('伙伴不存在或已被删除');
  if (!draft.summary?.trim()) throw new Error('请填写本次跟进内容');
  if (!draft.date) throw new Error('请选择跟进日期');
  if (draft.contactId) {
    const contact = getContact(draft.contactId);
    if (!contact || contact.partnerId !== id) throw new Error('所选对接人不属于当前伙伴');
  }
  const followupId = randomUUID();
  db.prepare(`INSERT INTO follow_ups(id, partner_id, contact_id, date, channel, summary, tags, next_followup_date, created_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    followupId, id, draft.contactId || null, draft.date, draft.channel, draft.summary.trim(), JSON.stringify(draft.tags || []),
    draft.nextFollowupDate || null, new Date().toISOString(),
  );
  const activates = (draft.tags || []).some((tag) => ['报备线索', '联合拜访', '方案写入', '写入方案'].includes(tag));
  if (activates && ['已签约', '已暂停'].includes(partner.status)) {
    db.prepare("UPDATE partners SET status='已激活', updated_at=? WHERE id=?").run(new Date().toISOString(), id);
  } else {
    db.prepare('UPDATE partners SET updated_at=? WHERE id=?').run(new Date().toISOString(), id);
  }
  return getPartner(id)!;
}

export function importPartners(drafts: PartnerDraft[]): { inserted: number; skipped: number } {
  let inserted = 0;
  let skipped = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    drafts.forEach((draft) => {
      const exists = db.prepare('SELECT id FROM partners WHERE name=?').get(draft.name.trim());
      if (exists) skipped += 1;
      else { createPartner(draft); inserted += 1; }
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return { inserted, skipped };
}

type ContactRow = {
  id: string; partner_id: string; name: string; title: string; department: string;
  phone: string; wechat: string; email: string; role: Contact['role']; is_primary: number;
  employment_status: Contact['employmentStatus']; notes: string; created_at: string; updated_at: string;
};
type CareerRow = {
  id: string; contact_id: string; partner_id: string; title: string; start_date?: string;
  end_date?: string; note: string; created_at: string;
};

function mapCareer(row: CareerRow): ContactCareer {
  return { id: row.id, contactId: row.contact_id, partnerId: row.partner_id, title: row.title, startDate: row.start_date || undefined, endDate: row.end_date || undefined, note: row.note, createdAt: row.created_at };
}

function hydrateContact(row: ContactRow): Contact {
  const careers = db.prepare('SELECT * FROM contact_careers WHERE contact_id=? ORDER BY start_date DESC, created_at DESC').all(row.id) as unknown as CareerRow[];
  return {
    id: row.id, partnerId: row.partner_id, name: row.name, title: row.title, department: row.department,
    phone: row.phone, wechat: row.wechat, email: row.email, role: row.role, isPrimary: Boolean(row.is_primary),
    employmentStatus: row.employment_status, notes: row.notes, careers: careers.map(mapCareer),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function listContacts(): Contact[] {
  const rows = db.prepare('SELECT * FROM contacts ORDER BY is_primary DESC, name ASC').all() as unknown as ContactRow[];
  return rows.map(hydrateContact);
}

export function getContact(id: string): Contact | null {
  const row = db.prepare('SELECT * FROM contacts WHERE id=?').get(id) as unknown as ContactRow | undefined;
  return row ? hydrateContact(row) : null;
}

function validateContact(draft: ContactDraft): void {
  if (!getPartner(draft.partnerId)) throw new Error('所属伙伴不存在，请重新选择');
  if (!draft.name?.trim()) throw new Error('请填写联系人姓名');
}

export function createContact(draft: ContactDraft): Contact {
  validateContact(draft);
  const id = randomUUID();
  const now = new Date().toISOString();
  const isPrimary = draft.employmentStatus !== '已离职' && draft.isPrimary;
  db.exec('BEGIN IMMEDIATE');
  try {
    if (isPrimary) db.prepare('UPDATE contacts SET is_primary=0 WHERE partner_id=?').run(draft.partnerId);
    db.prepare(`INSERT INTO contacts(id, partner_id, name, title, department, phone, wechat, email, role, is_primary, employment_status, notes, created_at, updated_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, draft.partnerId, draft.name.trim(), draft.title || '', draft.department || '', draft.phone || '',
      draft.wechat || '', draft.email || '', draft.role || '普通联系人', isPrimary ? 1 : 0,
      draft.employmentStatus || '在职', draft.notes || '', now, now,
    );
    db.prepare('INSERT INTO contact_careers(id, contact_id, partner_id, title, start_date, end_date, note, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(
      randomUUID(), id, draft.partnerId, draft.title || '', draft.startDate || now.slice(0, 10),
      draft.employmentStatus === '已离职' ? now.slice(0, 10) : null, '建立联系人档案', now,
    );
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return getContact(id)!;
}

export function updateContact(id: string, draft: Partial<ContactDraft>): Contact {
  const current = getContact(id);
  if (!current) throw new Error('联系人不存在或已被删除');
  if (draft.partnerId && draft.partnerId !== current.partnerId) throw new Error('变更任职伙伴请使用「任职变动」，以保留完整履历');
  const merged: ContactDraft = {
    partnerId: draft.partnerId || current.partnerId, name: draft.name ?? current.name,
    title: draft.title ?? current.title, department: draft.department ?? current.department,
    phone: draft.phone ?? current.phone, wechat: draft.wechat ?? current.wechat, email: draft.email ?? current.email,
    role: draft.role ?? current.role, isPrimary: draft.isPrimary ?? current.isPrimary,
    employmentStatus: draft.employmentStatus ?? current.employmentStatus, notes: draft.notes ?? current.notes,
  };
  validateContact(merged);
  if (merged.employmentStatus === '已离职') merged.isPrimary = false;
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    if (merged.isPrimary) db.prepare('UPDATE contacts SET is_primary=0 WHERE partner_id=? AND id<>?').run(merged.partnerId, id);
    db.prepare('UPDATE contact_careers SET title=? WHERE contact_id=? AND end_date IS NULL').run(merged.title, id);
    if (current.employmentStatus !== '已离职' && merged.employmentStatus === '已离职') {
      db.prepare('UPDATE contact_careers SET end_date=? WHERE contact_id=? AND end_date IS NULL').run(draft.startDate || now.slice(0, 10), id);
    } else if (current.employmentStatus === '已离职' && merged.employmentStatus === '在职') {
      db.prepare('INSERT INTO contact_careers(id, contact_id, partner_id, title, start_date, note, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), id, merged.partnerId, merged.title, now.slice(0, 10), '恢复在职状态', now);
    }
    db.prepare(`UPDATE contacts SET partner_id=?, name=?, title=?, department=?, phone=?, wechat=?, email=?, role=?, is_primary=?, employment_status=?, notes=?, updated_at=? WHERE id=?`).run(
      merged.partnerId, merged.name.trim(), merged.title, merged.department, merged.phone, merged.wechat,
      merged.email, merged.role, merged.isPrimary ? 1 : 0, merged.employmentStatus, merged.notes, now, id,
    );
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return getContact(id)!;
}

export function moveContact(id: string, draft: ContactMoveDraft): Contact {
  const current = getContact(id);
  if (!current) throw new Error('联系人不存在或已被删除');
  if (!draft.newPartnerId || draft.newPartnerId === current.partnerId) throw new Error('请选择不同于当前任职的伙伴');
  if (!getPartner(draft.newPartnerId)) throw new Error('新任职伙伴不存在');
  if (!draft.startDate) throw new Error('请选择新任职开始日期');
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE contact_careers SET end_date=? WHERE contact_id=? AND end_date IS NULL').run(draft.startDate, id);
    db.prepare('INSERT INTO contact_careers(id, contact_id, partner_id, title, start_date, note, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)').run(
      randomUUID(), id, draft.newPartnerId, draft.title || current.title, draft.startDate, draft.note || '加入新伙伴', now,
    );
    db.prepare(`UPDATE contacts SET partner_id=?, title=?, employment_status='在职', is_primary=0, updated_at=? WHERE id=?`).run(
      draft.newPartnerId, draft.title || current.title, now, id,
    );
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return getContact(id)!;
}

export function deleteContact(id: string): void {
  db.prepare('UPDATE follow_ups SET contact_id=NULL WHERE contact_id=?').run(id);
  db.prepare('UPDATE opportunities SET source_contact_id=NULL WHERE source_contact_id=?').run(id);
  db.prepare('DELETE FROM contacts WHERE id=?').run(id);
}

type OpportunityRow = {
  id: string; partner_id: string; customer_name: string; name: string; demand: string;
  expected_amount: number | null; stage: Opportunity['stage']; source_followup_id?: string; source_contact_id?: string;
  created_at: string; converted_at?: string; updated_at: string;
};

function mapOpportunity(row: OpportunityRow): Opportunity {
  return {
    id: row.id, partnerId: row.partner_id, customerName: row.customer_name, name: row.name,
    demand: row.demand, expectedAmount: row.expected_amount, stage: row.stage,
    sourceFollowupId: row.source_followup_id || undefined, sourceContactId: row.source_contact_id || undefined, createdAt: row.created_at,
    convertedAt: row.converted_at || undefined, updatedAt: row.updated_at,
  };
}

function validateOpportunity(draft: OpportunityDraft): void {
  if (!getPartner(draft.partnerId)) throw new Error('来源伙伴不存在，请重新选择');
  if (!draft.customerName?.trim()) throw new Error('请填写客户名称');
  if (!draft.name?.trim()) throw new Error('请填写线索或商机名称');
  if (draft.stage === 'OPPORTUNITY' && !draft.demand?.trim()) throw new Error('转为商机前，请填写客户的真实需求');
  if (draft.expectedAmount !== null && draft.expectedAmount !== undefined && (!Number.isFinite(draft.expectedAmount) || draft.expectedAmount < 0)) throw new Error('预计金额必须为不小于 0 的数字');
  if (draft.sourceContactId) {
    const contact = getContact(draft.sourceContactId);
    if (!contact || (contact.partnerId !== draft.partnerId && !contact.careers.some((career) => career.partnerId === draft.partnerId))) throw new Error('引荐人与所选来源伙伴没有任职关联');
  }
}

export function listOpportunities(): Opportunity[] {
  const rows = db.prepare('SELECT * FROM opportunities ORDER BY created_at DESC').all() as unknown as OpportunityRow[];
  return rows.map(mapOpportunity);
}

export function getOpportunity(id: string): Opportunity | null {
  const row = db.prepare('SELECT * FROM opportunities WHERE id=?').get(id) as unknown as OpportunityRow | undefined;
  return row ? mapOpportunity(row) : null;
}

export function createOpportunity(draft: OpportunityDraft): Opportunity {
  validateOpportunity(draft);
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO opportunities(id, partner_id, customer_name, name, demand, expected_amount, stage, source_followup_id, source_contact_id, created_at, converted_at, updated_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, draft.partnerId, draft.customerName.trim(), draft.name.trim(), draft.demand?.trim() || '',
    draft.expectedAmount ?? null, draft.stage || 'LEAD', draft.sourceFollowupId || null, draft.sourceContactId || null, now,
    draft.stage === 'OPPORTUNITY' ? now : null, now,
  );
  return getOpportunity(id)!;
}

export function updateOpportunity(id: string, draft: Partial<OpportunityDraft>): Opportunity {
  const current = getOpportunity(id);
  if (!current) throw new Error('记录不存在或已被删除');
  const merged: OpportunityDraft = {
    partnerId: draft.partnerId || current.partnerId,
    customerName: draft.customerName ?? current.customerName,
    name: draft.name ?? current.name,
    demand: draft.demand ?? current.demand,
    expectedAmount: draft.expectedAmount === undefined ? current.expectedAmount : draft.expectedAmount,
    stage: draft.stage || current.stage,
    sourceFollowupId: draft.sourceFollowupId || current.sourceFollowupId,
    sourceContactId: draft.sourceContactId === undefined ? current.sourceContactId : draft.sourceContactId,
  };
  validateOpportunity(merged);
  const now = new Date().toISOString();
  const convertedAt = merged.stage === 'OPPORTUNITY' ? current.convertedAt || now : null;
  db.prepare(`UPDATE opportunities SET partner_id=?, customer_name=?, name=?, demand=?, expected_amount=?, stage=?, source_followup_id=?, source_contact_id=?, converted_at=?, updated_at=? WHERE id=?`).run(
    merged.partnerId, merged.customerName.trim(), merged.name.trim(), merged.demand.trim(), merged.expectedAmount ?? null,
    merged.stage, merged.sourceFollowupId || null, merged.sourceContactId || null, convertedAt, now, id,
  );
  return getOpportunity(id)!;
}

export function deleteOpportunity(id: string): void {
  db.prepare('DELETE FROM opportunities WHERE id=?').run(id);
}

export function resetBusinessData(): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM opportunities').run();
    db.prepare('DELETE FROM follow_ups').run();
    db.prepare('DELETE FROM scores').run();
    db.prepare('DELETE FROM contacts').run();
    db.prepare('DELETE FROM partners').run();
    db.prepare(`INSERT INTO app_meta(key, value, updated_at) VALUES('demo_seed_disabled', '1', ?)
      ON CONFLICT(key) DO UPDATE SET value='1', updated_at=excluded.updated_at`).run(new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.exec('VACUUM');
}

export function backupDatabase(): string {
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const file = path.join(dataDir, 'backups', `channel-${stamp}.db`);
  db.prepare('VACUUM INTO ?').run(file);
  return file;
}
