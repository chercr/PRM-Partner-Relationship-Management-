import assert from 'node:assert/strict';
import test from 'node:test';
import XLSX from 'xlsx';
import { parsePartnerWorkbook } from '../src/excel';

function fixtureFile(): File {
  const workbook = XLSX.utils.book_new();
  const candidates = XLSX.utils.aoa_to_sheet([
    ['公司名称', '类型', '区域', '规模线索', '客户/行业线索', '信息来源名称', '来源链接', '已登记到评估表', '验证情况', '联系方式线索', '联系优先级'],
    ['测试伙伴甲', 'PLM代理商', '华东', '50人', '制造业研发', '测试来源', '', '是', '待沟通验证', '', ''],
    ['（补充方法）测试', '—', '—', '—', '不属于伙伴', '测试来源', '', '否', '', '', ''],
    ['测试伙伴乙', 'IPD/研发管理咨询', '华南', '20人', '研发咨询', '测试来源', '', '否', '待沟通验证', '', ''],
  ]);
  const evaluations = XLSX.utils.aoa_to_sheet([
    ['序号', '公司名称', '类型', '规模(人数)', '主要客户行业', '客户重叠度(1-5)', '合作意愿(1-5)', '决策效率(1-5)', '销售售前能力(1-5)', '利益匹配度(1-5)', '交付能力(1-5)'],
    ['权重', '（打分说明）', '', '', '', 0.25, 0.2, 0.15, 0.15, 0.15, 0.1],
    [1, '测试伙伴甲', 'PLM代理商', '50人', '制造业研发', '未接触', '', '', '', '', ''],
    [2, '仅存在评估表的测试伙伴', 'IPD/研发管理咨询', '20人', '研发咨询', '', '', '', '', '', ''],
  ]);
  XLSX.utils.book_append_sheet(workbook, candidates, '候选名单');
  XLSX.utils.book_append_sheet(workbook, evaluations, '评估表');
  const contents = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return new File([new Uint8Array(contents)], 'fixture.xlsx');
}

test('Excel 导入过滤版式行并补充评估表独有伙伴', async () => {
  const drafts = await parsePartnerWorkbook(fixtureFile());
  assert.equal(drafts.length, 3);
  assert.equal(drafts.some((item) => item.name.includes('打分说明')), false);
  assert.equal(drafts.some((item) => item.name.startsWith('（补充方法）')), false);
  assert.equal(drafts.some((item) => item.name === '仅存在评估表的测试伙伴'), true);
  assert.equal(drafts.find((item) => item.name === '测试伙伴甲')?.priorityOrder, 1);
});

test('未打分的原始评估项保持待评估', async () => {
  const drafts = await parsePartnerWorkbook(fixtureFile());
  drafts.forEach((item) => assert.deepEqual(item.scores, {}));
});
