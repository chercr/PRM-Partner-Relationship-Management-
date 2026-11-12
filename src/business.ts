import type { DimensionKey, Grade, Partner, PartnerStatus, PartnerType, ScoreSet } from './types';

export const DIMENSIONS: Array<{
  key: DimensionKey;
  name: string;
  short: string;
  weight: number;
  anchors: { 1: string; 3: string; 5: string };
}> = [
  { key: 'overlap', name: '客户重叠度', short: '重叠', weight: 0.25, anchors: { 1: '客户几乎不涉制造业研发', 3: '有部分制造客户，以大型集团或小微为主', 5: '制造业研发团队占比高，多为 50–500 人团队' } },
  { key: 'willingness', name: '合作意愿', short: '意愿', weight: 0.2, anchors: { 1: '态度冷淡或敷衍', 3: '口头积极但无实质动作', 5: '已引荐客户、安排拜访或推动内部立项' } },
  { key: 'decision', name: '决策效率', short: '决策', weight: 0.15, anchors: { 1: '流程冗长或决策人不明', 3: '需多层汇报，周期约 1 个月', 5: '老板或合伙人直谈，见面两次内能拍板' } },
  { key: 'sales', name: '销售售前能力', short: '售前', weight: 0.15, anchors: { 1: '无售前，纯关系型销售', 3: '销售可讲产品，方案依赖厂家支持', 5: '有专职售前，能独立讲清联合方案' } },
  { key: 'benefit', name: '利益匹配度', short: '利益', weight: 0.15, anchors: { 1: '几乎无利可图，仅人情合作', 3: '有一定收益但非其主营利益', 5: '分润显著，或能明显帮助赢标、提客单价' } },
  { key: 'delivery', name: '交付能力', short: '交付', weight: 0.1, anchors: { 1: '无交付能力，只能靠我们', 3: '能交付但需我们大量支持', 5: '自有实施团队，可承接部署与培训' } },
];

export const TYPE_META: Record<PartnerType, { name: string; short: string; activationDays: number | null; color: string; bg: string }> = {
  AGENT: { name: 'PLM 代理商', short: '代理商', activationDays: 60, color: '#6657d9', bg: '#eeebff' },
  SI: { name: '实施服务商', short: '实施商', activationDays: 90, color: '#187d75', bg: '#e3f5f1' },
  IPD: { name: 'IPD 研发咨询', short: 'IPD 咨询', activationDays: 120, color: '#ad6717', bg: '#fff2dd' },
  EXPERT: { name: '独立顾问 / 专家', short: '专家', activationDays: null, color: '#3270b9', bg: '#e7f1fc' },
};

export const STATUSES: PartnerStatus[] = ['未接触', '已接触', '已深聊', '已谈合作框架', '已签约', '已激活', '已暂停'];
export const ACTIVE_STATUSES: PartnerStatus[] = ['已接触', '已深聊', '已谈合作框架', '已签约', '已激活'];
export const ACTIVATION_TAGS = ['报备线索', '联合拜访', '方案写入', '写入方案'];
export const CHANNELS = ['电话', '微信', '上门', '会场'] as const;

export function calculateScore(scores: ScoreSet): { total: number | null; grade: Grade; capped: boolean; completed: number } {
  const completed = DIMENSIONS.filter((d) => Number.isFinite(scores[d.key])).length;
  if (completed !== DIMENSIONS.length) return { total: null, grade: null, capped: false, completed };
  const total = Math.round(DIMENSIONS.reduce((sum, d) => sum + (scores[d.key] || 0) * d.weight, 0) * 100) / 100;
  let grade: Grade = total >= 4.2 ? 'A' : total >= 3.5 ? 'B' : 'C';
  const capped = (scores.overlap || 0) < 3 && grade === 'A';
  if (capped) grade = 'B';
  return { total, grade, capped, completed };
}

export function dateAtOffset(offset: number, base = new Date()): string {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function getNextFollowup(partner: Partner): string | undefined {
  const latest = [...partner.followUps]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
  return latest?.nextFollowupDate;
}

export function getActivation(partner: Partner) {
  const meta = TYPE_META[partner.type];
  if (partner.status === '已激活') return { kind: 'activated' as const, days: null, deadline: null, label: '已激活' };
  if (partner.status === '已暂停') return { kind: 'none' as const, days: null, deadline: null, label: '已暂停' };
  if (partner.status !== '已签约') return { kind: 'none' as const, days: null, deadline: null, label: '—' };
  if (meta.activationDays === null) return { kind: 'unlimited' as const, days: null, deadline: null, label: '不限期' };
  if (!partner.signDate) return { kind: 'none' as const, days: null, deadline: null, label: '待签约日期' };
  const deadline = dateAtOffset(meta.activationDays, new Date(`${partner.signDate}T00:00:00`));
  const days = daysBetween(dateAtOffset(0), deadline);
  if (days < 0) return { kind: 'overdue' as const, days, deadline, label: `已逾期 ${Math.abs(days)} 天` };
  if (days <= 14) return { kind: 'warning' as const, days, deadline, label: `剩 ${days} 天` };
  return { kind: 'safe' as const, days, deadline, label: `剩 ${days} 天` };
}

export function formatDate(value?: string, withYear = false): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return withYear ? `${year}.${month}.${day}` : `${Number(month)}月${Number(day)}日`;
}

export function relativeDay(value?: string): string {
  if (!value) return '未安排';
  const days = daysBetween(dateAtOffset(0), value);
  if (days === 0) return '今天';
  if (days === 1) return '明天';
  if (days === -1) return '昨天';
  if (days < 0) return `逾期 ${Math.abs(days)} 天`;
  return `${days} 天后`;
}

export function statusIndex(status: PartnerStatus): number {
  return STATUSES.indexOf(status);
}

export function getInitials(name: string): string {
  const clean = name.replace(/^(上海|北京|深圳|杭州|苏州|南京)/, '');
  return clean.slice(0, 1) || '渠';
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
