import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { addFollowup, createContact, createOpportunity, createPartner, db, findPartnerIdByName, listContacts, listOpportunities, listPartners } from './db';
import type { AiAction, AiMessage, AiProposal } from '../src/types';

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';
const ACTIONS: AiAction[] = ['create_partner', 'add_followup', 'create_contact', 'create_opportunity'];
const SYSTEM_PROMPT = `你是渠道伙伴管理系统的数据助手。用简洁中文回答，并始终把回答放在 JSON 对象中，不要 Markdown 或代码块。
JSON 格式：{"reply":"对用户的话","action":"可选动作","data":{}}。
允许的 action 只有 create_partner、add_followup、create_contact、create_opportunity。只是问答、闲聊或信息不足时不要提供 action。
不得编造用户未提供的公司、联系人、金额、需求或日期。信息不足时在 reply 中询问，不要生成提案。
create_partner 的 data：name 必填，type 必填且只能是 AGENT（代理商）、SI（实施服务商）、IPD（管理咨询）、EXPERT（独立顾问/专家），可选 region、batch、businessDesc、decisionMaker、contact、note。
add_followup 的 data：partnerName、summary 必填，可选 date（YYYY-MM-DD）、channel（上门/电话/微信/会场）、tags 数组、nextFollowupDate。
create_contact 的 data：partnerName、name 必填，可选 title、department、phone、wechat、email、role（决策人/商务对接/售前/交付/普通联系人）、isPrimary、notes。
create_opportunity 的 data：partnerName、customerName、name 必填，可选 demand、expectedAmount（数字万元）、stage（LEAD 或 OPPORTUNITY）。OPPORTUNITY 必须有真实 demand；信息不足时先询问。`;

function encryptionKey(): Buffer {
  if (process.env.AI_ENCRYPTION_KEY) return scryptSync(process.env.AI_ENCRYPTION_KEY, 'channel-os-ai', 32);
  const file = path.resolve('data', 'ai-secret.key');
  try { return Buffer.from(readFileSync(file, 'utf8').trim(), 'base64'); }
  catch {
    const key = randomBytes(32);
    writeFileSync(file, key.toString('base64'), { mode: 0o600 });
    return key;
  }
}
function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
}
function decrypt(value: string): string {
  const [iv, tag, content] = value.split('.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(content, 'base64')), decipher.final()]).toString('utf8');
}

export function getAiConfig() {
  const row = db.prepare('SELECT * FROM ai_settings WHERE id=1').get() as { base_url: string; model: string; api_key_encrypted: string } | undefined;
  return {
    configured: Boolean(row?.api_key_encrypted),
    baseUrl: row?.base_url || DEFAULT_BASE_URL,
    model: row?.model || DEFAULT_MODEL,
    apiKeyMask: row?.api_key_encrypted ? `••••••••${decrypt(row.api_key_encrypted).slice(-4)}` : '',
  };
}

export function saveAiConfig(baseUrl: string, model: string, apiKey: string) {
  const current = db.prepare('SELECT api_key_encrypted FROM ai_settings WHERE id=1').get() as { api_key_encrypted: string } | undefined;
  let parsed: URL;
  try { parsed = new URL(baseUrl); } catch { throw new Error('API 地址格式不正确'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('API 地址仅支持 HTTP 或 HTTPS');
  if (!model.trim()) throw new Error('请填写模型名称');
  if (!apiKey && !current?.api_key_encrypted) throw new Error('首次配置请填写 API Token');
  const encrypted = apiKey ? encrypt(apiKey.trim()) : current!.api_key_encrypted;
  db.prepare(`INSERT INTO ai_settings(id, base_url, model, api_key_encrypted, updated_at) VALUES(1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET base_url=excluded.base_url, model=excluded.model, api_key_encrypted=excluded.api_key_encrypted, updated_at=excluded.updated_at`).run(
    baseUrl.trim().replace(/\/$/, ''), model.trim(), encrypted, new Date().toISOString(),
  );
  return getAiConfig();
}

export function deleteAiConfig(): void { db.prepare('DELETE FROM ai_settings WHERE id=1').run(); }

async function callProvider(messages: Array<{ role: string; content: string }>): Promise<string> {
  const config = getAiConfig();
  if (!config.configured) throw new Error('尚未配置 AI 服务，请管理员先点击窗口顶部的配置按钮');
  const row = db.prepare('SELECT api_key_encrypted FROM ai_settings WHERE id=1').get() as { api_key_encrypted: string };
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${decrypt(row.api_key_encrypted)}` },
    body: JSON.stringify({ model: config.model, messages, temperature: 0.2, max_tokens: 1200 }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`AI 服务返回 ${response.status}，请检查地址、模型和 Token`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI 服务没有返回有效内容');
  return content;
}

export async function testAiConfig(): Promise<void> {
  await callProvider([{ role: 'user', content: '请只回复：连接成功' }]);
}

function proposalSummary(action: AiAction, data: Record<string, unknown>): string {
  if (action === 'create_partner') return `新增伙伴「${data.name}」`;
  if (action === 'add_followup') return `为「${data.partnerName}」添加跟进`;
  if (action === 'create_contact') return `为「${data.partnerName}」新增联系人「${data.name}」`;
  return `为「${data.partnerName}」登记${data.stage === 'OPPORTUNITY' ? '商机' : '线索'}「${data.name}」`;
}
function saveMessage(userId: string, role: 'user' | 'assistant', content: string, proposalId?: string): void {
  db.prepare('INSERT INTO ai_messages(id, user_id, role, content, proposal_id, created_at) VALUES(?, ?, ?, ?, ?, ?)').run(randomUUID(), userId, role, content, proposalId || null, new Date().toISOString());
}
function parseAiContent(content: string): { reply: string; action?: AiAction; data?: Record<string, unknown> } {
  const clean = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed: { reply?: string; action?: string; data?: Record<string, unknown> };
  try { parsed = JSON.parse(clean); }
  catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return { reply: clean };
    parsed = JSON.parse(match[0]);
  }
  return { reply: parsed.reply || '我已理解你的需求。', action: ACTIONS.includes(parsed.action as AiAction) ? parsed.action as AiAction : undefined, data: parsed.data };
}

export async function chatWithAi(userId: string, message: string): Promise<void> {
  const text = message.trim();
  if (!text) throw new Error('请输入需要沟通的内容');
  if (text.length > 4000) throw new Error('单次消息不能超过 4000 个字符');
  const history = db.prepare('SELECT role, content FROM ai_messages WHERE user_id=? ORDER BY created_at DESC LIMIT 6').all(userId).reverse() as Array<{ role: string; content: string }>;
  saveMessage(userId, 'user', text);
  try {
    const content = await callProvider([{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: text }]);
    const parsed = parseAiContent(content);
    if (!parsed.action) { saveMessage(userId, 'assistant', parsed.reply); return; }
    const data = parsed.data || {};
    if (parsed.action === 'create_partner' && (!data.name || !data.type)) { saveMessage(userId, 'assistant', '还需要伙伴名称和类型（代理商 / 实施服务商 / 管理咨询 / 专家），请补充后我再生成写入预览。'); return; }
    if (parsed.action === 'add_followup' && (!data.partnerName || !data.summary)) { saveMessage(userId, 'assistant', '请补充伙伴名称和本次跟进内容。'); return; }
    if (parsed.action === 'create_contact' && (!data.partnerName || !data.name)) { saveMessage(userId, 'assistant', '请补充所属伙伴和联系人姓名。'); return; }
    if (parsed.action === 'create_opportunity' && (!data.partnerName || !data.customerName || !data.name)) { saveMessage(userId, 'assistant', '请补充来源伙伴、客户名称和线索/商机名称。'); return; }
    const proposalId = randomUUID();
    const now = new Date();
    db.prepare('INSERT INTO ai_proposals(id, user_id, action, payload, status, created_at, expires_at) VALUES(?, ?, ?, ?, \'pending\', ?, ?)').run(
      proposalId, userId, parsed.action, JSON.stringify(data), now.toISOString(), new Date(now.getTime() + 3600000).toISOString(),
    );
    saveMessage(userId, 'assistant', `${parsed.reply}\n请核对下面的写入预览，确认后自动入库。`, proposalId);
  } catch (error) {
    saveMessage(userId, 'assistant', error instanceof Error ? error.message : 'AI 服务暂时不可用，请稍后重试');
  }
}

export function getAiMessages(userId: string): AiMessage[] {
  const rows = db.prepare(`SELECT m.id, m.role, m.content, m.created_at, p.id AS proposal_id, p.action, p.payload, p.status, p.result_id
    FROM ai_messages m LEFT JOIN ai_proposals p ON p.id=m.proposal_id WHERE m.user_id=? ORDER BY m.created_at ASC`).all(userId) as unknown as Array<{
      id: string; role: 'user' | 'assistant'; content: string; created_at: string;
      proposal_id?: string; action?: AiAction; payload?: string; status?: AiProposal['status']; result_id?: string;
    }>;
  return rows.map((row) => ({
    id: row.id, role: row.role, content: row.content, createdAt: row.created_at,
    proposal: row.proposal_id && row.action ? { id: row.proposal_id, action: row.action, summary: proposalSummary(row.action, JSON.parse(row.payload || '{}')), data: JSON.parse(row.payload || '{}'), status: row.status || 'pending', resultId: row.result_id || undefined } : undefined,
  }));
}

export function executeAiProposal(userId: string, proposalId: string): void {
  const proposal = db.prepare('SELECT * FROM ai_proposals WHERE id=? AND user_id=?').get(proposalId, userId) as { id: string; action: AiAction; payload: string; status: string; expires_at: string } | undefined;
  if (!proposal || proposal.status !== 'pending') throw new Error('该写入提案已处理或不存在');
  if (proposal.expires_at <= new Date().toISOString()) throw new Error('该写入提案已过期，请重新与 AI 沟通');
  const data = JSON.parse(proposal.payload) as Record<string, unknown>;
  let resultId = '';
  if (proposal.action === 'create_partner') {
    const partner = createPartner({
      name: String(data.name), type: String(data.type) as 'AGENT', region: String(data.region || ''), scale: '', businessDesc: String(data.businessDesc || ''),
      decisionMaker: String(data.decisionMaker || ''), sourceName: 'AI 助手', sourceUrl: '', contact: String(data.contact || ''), verifyStatus: '待核实', verifyNote: '',
      batch: ['首批联系', '蓄水池', '专项批次'].includes(String(data.batch)) ? String(data.batch) as '首批联系' : '蓄水池', priorityOrder: 999,
      status: '未接触', note: String(data.note || ''), scores: {},
    }, userId);
    resultId = partner.id;
  } else if (proposal.action === 'add_followup') {
    const partnerId = findPartnerIdByName(String(data.partnerName));
    const channel = ['上门', '电话', '微信', '会场'].includes(String(data.channel)) ? String(data.channel) as '微信' : '微信';
    const partner = addFollowup(partnerId, {
      date: String(data.date || new Date().toISOString().slice(0, 10)), channel, summary: String(data.summary),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [], nextFollowupDate: data.nextFollowupDate ? String(data.nextFollowupDate) : undefined,
    }, userId);
    resultId = partner.id;
  } else if (proposal.action === 'create_contact') {
    const partnerId = findPartnerIdByName(String(data.partnerName));
    const contact = createContact({
      partnerId, name: String(data.name), title: String(data.title || ''), department: String(data.department || ''), phone: String(data.phone || ''),
      wechat: String(data.wechat || ''), email: String(data.email || ''), role: ['决策人', '商务对接', '售前', '交付', '普通联系人'].includes(String(data.role)) ? String(data.role) as '普通联系人' : '普通联系人',
      isPrimary: data.isPrimary === true || data.isPrimary === 'true', employmentStatus: '在职', notes: String(data.notes || ''), startDate: new Date().toISOString().slice(0, 10),
    }, userId);
    resultId = contact.id;
  } else {
    const partnerId = findPartnerIdByName(String(data.partnerName));
    const opportunity = createOpportunity({
      partnerId, customerName: String(data.customerName), name: String(data.name), demand: String(data.demand || ''),
      expectedAmount: data.expectedAmount === null || data.expectedAmount === undefined || data.expectedAmount === '' ? null : Number(data.expectedAmount),
      stage: data.stage === 'OPPORTUNITY' ? 'OPPORTUNITY' : 'LEAD',
    }, userId);
    resultId = opportunity.id;
  }
  db.prepare("UPDATE ai_proposals SET status='executed', result_id=? WHERE id=?").run(resultId, proposalId);
  saveMessage(userId, 'assistant', `已自动写入：${proposalSummary(proposal.action, data)}。`);
}

export function cancelAiProposal(userId: string, proposalId: string): void {
  const proposal = db.prepare('SELECT payload, action FROM ai_proposals WHERE id=? AND user_id=? AND status=\'pending\'').get(proposalId, userId) as { payload: string; action: AiAction } | undefined;
  if (!proposal) throw new Error('该写入提案已处理或不存在');
  db.prepare("UPDATE ai_proposals SET status='cancelled' WHERE id=?").run(proposalId);
  saveMessage(userId, 'assistant', `已取消：${proposalSummary(proposal.action, JSON.parse(proposal.payload))}。`);
}
export function clearAiMessages(userId: string): void {
  db.prepare('DELETE FROM ai_messages WHERE user_id=?').run(userId);
  db.prepare('DELETE FROM ai_proposals WHERE user_id=?').run(userId);
}
