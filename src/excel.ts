import * as XLSX from 'xlsx';
import { ACTIVATION_TAGS, DIMENSIONS, calculateScore, dateAtOffset, getActivation, getNextFollowup } from './business';
import type { Partner, PartnerDraft, PartnerType } from './types';

function mapType(value: unknown): PartnerType {
  const text = String(value || '');
  if (text.includes('IPD') || text.includes('研发管理咨询')) return 'IPD';
  if (text.includes('代理') || text.includes('分销')) return 'AGENT';
  if (text.includes('实施') || text.includes('集成') || text.includes('厂商') || text.includes('测试')) return 'SI';
  return 'EXPERT';
}

function rowsFromSheet(workbook: XLSX.WorkBook, name: string): unknown[][] {
  const sheet = workbook.Sheets[name];
  return sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as unknown[][] : [];
}

function findHeader(rows: unknown[][], title: string): number {
  return rows.findIndex((row) => row.some((cell) => String(cell).trim() === title));
}

export async function parsePartnerWorkbook(file: File): Promise<PartnerDraft[]> {
  const workbook = XLSX.read(await file.arrayBuffer());
  const candidateRows = rowsFromSheet(workbook, '候选名单');
  const evaluationRows = rowsFromSheet(workbook, '评估表');
  const headerIndex = findHeader(candidateRows, '公司名称');
  if (headerIndex < 0) throw new Error('未找到「候选名单」工作表或公司名称表头');
  const headers = candidateRows[headerIndex].map(String);
  const col = (title: string) => headers.indexOf(title);
  const evaluationHeader = findHeader(evaluationRows, '公司名称');
  const evalHeaders = evaluationHeader >= 0 ? evaluationRows[evaluationHeader].map(String) : [];
  const evalCol = (title: string) => evalHeaders.indexOf(title);
  const evalMap = new Map<string, unknown[]>();
  if (evaluationHeader >= 0) {
    evaluationRows.slice(evaluationHeader + 1).forEach((row) => {
      const name = String(row[evalCol('公司名称')] || '').trim();
      const sequence = Number(row[evalCol('序号')]);
      if (name && Number.isFinite(sequence) && sequence > 0) evalMap.set(name, row);
    });
  }
  // 可在这里配置公司简称映射；默认不包含任何真实业务数据。
  const aliases: Record<string, string> = {};
  const drafts: PartnerDraft[] = [];
  candidateRows.slice(headerIndex + 1).forEach((row) => {
    const name = String(row[col('公司名称')] || '').trim();
    if (!name || name.startsWith('（补充方法）') || name.startsWith('（区域型）')) return;
    const evaluation = evalMap.get(name) || evalMap.get(aliases[name]);
    const source = String(row[col('信息来源名称')] || '');
    const contactHint = String(row[col('联系方式线索')] || '');
    const registered = String(row[col('已登记到评估表')] || '') === '是';
    const batch = contactHint.includes('专项批次') ? '专项批次' : registered || evaluation ? '首批联系' : '蓄水池';
    const priorityText = evaluation?.[evalCol('序号')] || row[col('联系优先级')];
    const priority = Number.parseInt(String(priorityText), 10);
    const verifyText = String(row[col('验证情况')] || '');
    const scores: PartnerDraft['scores'] = {};
    DIMENSIONS.forEach((dimension, index) => {
      const scoreCol = evalCol(['客户重叠度(1-5)', '合作意愿(1-5)', '决策效率(1-5)', '销售售前能力(1-5)', '利益匹配度(1-5)', '交付能力(1-5)'][index]);
      const score = Number(evaluation?.[scoreCol]);
      if (score >= 1 && score <= 5) scores[dimension.key] = score;
    });
    drafts.push({
      name,
      type: mapType(evaluation?.[evalCol('类型')] || row[col('类型')]),
      region: String(row[col('区域')] || ''),
      scale: String(evaluation?.[evalCol('规模(人数)')] || row[col('规模线索')] || ''),
      businessDesc: String(evaluation?.[evalCol('主要客户行业')] || row[col('客户/行业线索')] || ''),
      decisionMaker: String(evaluation?.[evalCol('决策人')] || '').replace(/^—$/, ''),
      sourceName: source,
      sourceUrl: String(row[col('来源链接')] || ''),
      contact: contactHint.replace(/专项批次·[^；]*/, '').trim(),
      verifyStatus: verifyText.includes('已核验更正') ? '已核实有误' : verifyText.includes('已核验') ? '已核实' : '待核实',
      verifyNote: verifyText.includes('已核验') ? verifyText : '',
      batch,
      priorityOrder: Number.isFinite(priority) ? priority : 999,
      status: '未接触',
      note: String(evaluation?.[evalCol('备注')] || verifyText || ''),
      scores,
    });
  });
  evalMap.forEach((evaluation, evaluationName) => {
    if (drafts.some((draft) => draft.name === evaluationName || aliases[draft.name] === evaluationName)) return;
    const priority = Number.parseInt(String(evaluation[evalCol('序号')]), 10);
    const scores: PartnerDraft['scores'] = {};
    DIMENSIONS.forEach((dimension, index) => {
      const scoreCol = evalCol(['客户重叠度(1-5)', '合作意愿(1-5)', '决策效率(1-5)', '销售售前能力(1-5)', '利益匹配度(1-5)', '交付能力(1-5)'][index]);
      const score = Number(evaluation[scoreCol]);
      if (score >= 1 && score <= 5) scores[dimension.key] = score;
    });
    drafts.push({
      name: evaluationName, type: mapType(evaluation[evalCol('类型')]), region: '',
      scale: String(evaluation[evalCol('规模(人数)')] || ''),
      businessDesc: String(evaluation[evalCol('主要客户行业')] || ''),
      decisionMaker: String(evaluation[evalCol('决策人')] || '').replace(/^—$/, ''),
      sourceName: '渠道伙伴评估表 · 首批名单', sourceUrl: '', contact: '', verifyStatus: '待核实', verifyNote: '',
      batch: '首批联系', priorityOrder: Number.isFinite(priority) ? priority : 999, status: '未接触',
      note: String(evaluation[evalCol('备注')] || ''), scores,
    });
  });
  return drafts;
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function exportPartnersCsv(partners: Partner[]): void {
  const headers = ['公司名称', '伙伴类型', '区域', '批次', '接触状态', ...DIMENSIONS.map((d) => d.name), '加权总分', 'ABC 级', '激活截止', '激活倒计时', '下次跟进', '核验状态', '决策人', '联系方式', '来源', '备注'];
  const rows = partners.map((partner) => {
    const score = calculateScore(partner.scores);
    const activation = getActivation(partner);
    return [partner.name, partner.type, partner.region, partner.batch, partner.status, ...DIMENSIONS.map((d) => partner.scores[d.key] || ''), score.total ?? '待评估', score.grade || '—', activation.deadline || '—', activation.label, getNextFollowup(partner) || '—', partner.verifyStatus, partner.decisionMaker, partner.contact, partner.sourceName, partner.note];
  });
  const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `渠道伙伴_${dateAtOffset(0)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function isActivationFollowup(tags: string[]): boolean {
  return tags.some((tag) => ACTIVATION_TAGS.includes(tag));
}
