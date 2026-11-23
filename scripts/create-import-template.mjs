import XLSX from 'xlsx';
import { mkdirSync } from 'node:fs';
import { DIMENSIONS } from '../src/business';
import { parsePartnerWorkbook } from '../src/excel';

const workbook = XLSX.utils.book_new();
const instructions = [
  ['渠成 Channel OS · 候选伙伴导入模板'],
  ['本模板不包含真实业务数据，请将示例行替换为自己的伙伴信息。'],
  ['请保留「候选名单」工作表名称及表头；公司名称为必填项。'],
  ['如需同步评分，请保留「评估表」工作表和六维评分列，评分范围为 1–5 的整数。'],
  ['也可以只导入候选名单，然后在系统详情页完成评估。'],
];
const candidates = [
  ['公司名称', '类型', '区域', '规模线索', '客户/行业线索', '信息来源名称', '来源链接', '已登记到评估表', '验证情况', '联系方式线索', '联系优先级'],
  ['示例伙伴 A', 'PLM代理商', '华东（示例）', '50人（示例）', '请填写主营行业与客户画像', '请填写来源', '', '是', '待核实', '', 1],
];
const evaluations = [
  ['序号', '公司名称', '类型', '规模(人数)', '主要客户行业', '年实施项目量(个)', '决策人', '决策人态度', '客户重叠度(1-5)', '合作意愿(1-5)', '决策效率(1-5)', '销售售前能力(1-5)', '利益匹配度(1-5)', '交付能力(1-5)', '加权总分', '合作优先级', '接触状态', '下次跟进时间', '备注'],
  ['', '（评分由系统按权重计算）', '', '', '', '', '', '', 0.25, 0.2, 0.15, 0.15, 0.15, 0.1, '', '', '', '', ''],
  [1, '示例伙伴 A', 'PLM代理商', '50人（示例）', '请填写客户行业', '', '', '', '', '', '', '', '', '', '', '', '未接触', '', '请在导入前替换或删除示例行'],
];
const standards = [['维度', '权重', '5 分参考', '3 分参考', '1 分参考'], ...DIMENSIONS.map((item) => [item.name, `${item.weight * 100}%`, item.anchors[5], item.anchors[3], item.anchors[1]])];
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instructions), '使用说明');
const candidateSheet = XLSX.utils.aoa_to_sheet(candidates);
candidateSheet['!cols'] = candidates[0].map((header) => ({ wch: Math.max(16, String(header).length * 2 + 4) }));
XLSX.utils.book_append_sheet(workbook, candidateSheet, '候选名单');
const evaluationSheet = XLSX.utils.aoa_to_sheet(evaluations);
evaluationSheet['!cols'] = evaluations[0].map((header) => ({ wch: Math.max(14, String(header).length * 2 + 3) }));
XLSX.utils.book_append_sheet(workbook, evaluationSheet, '评估表');
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(standards), '评分标准');
mkdirSync('public/templates', { recursive: true });
const file = 'public/templates/partner-import-template.xlsx';
XLSX.writeFile(workbook, file);
const contents = XLSX.readFile(file);
const buffer = XLSX.write(contents, { type: 'buffer', bookType: 'xlsx' });
const drafts = await parsePartnerWorkbook(new File([new Uint8Array(buffer)], 'partner-import-template.xlsx'));
if (drafts.length !== 1 || drafts[0].name !== '示例伙伴 A') throw new Error('Template import verification failed');
console.log(`Created and verified ${file}`);
