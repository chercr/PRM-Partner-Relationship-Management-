import assert from 'node:assert/strict';
import test from 'node:test';
import { formatAmount, getContributionSummary, getPartnerRankings } from '../src/opportunity-utils';
import type { Opportunity, Partner } from '../src/types';

const records = [
  { id: '1', partnerId: 'a', customerName: '客户一', name: '商机一', demand: '需求一', expectedAmount: 38, stage: 'OPPORTUNITY', createdAt: '', updatedAt: '' },
  { id: '2', partnerId: 'a', customerName: '客户二', name: '线索二', demand: '需求二', expectedAmount: null, stage: 'LEAD', createdAt: '', updatedAt: '' },
  { id: '3', partnerId: 'b', customerName: '客户三', name: '商机三', demand: '需求三', expectedAmount: 26.8, stage: 'OPPORTUNITY', createdAt: '', updatedAt: '' },
  { id: '4', partnerId: 'b', customerName: '客户四', name: '线索四', demand: '', expectedAmount: null, stage: 'LEAD', createdAt: '', updatedAt: '' },
] as Opportunity[];

test('贡献汇总只统计商机金额并保留线索转化口径', () => {
  const result = getContributionSummary(records);
  assert.equal(result.totalLeads, 4);
  assert.equal(result.openLeads, 2);
  assert.equal(result.opportunityCount, 2);
  assert.equal(result.expectedAmount, 64.8);
  assert.equal(result.conversionRate, 50);
});

test('伙伴贡献排行按预计金额排列', () => {
  const partners = [{ id: 'a', name: '伙伴 A' }, { id: 'b', name: '伙伴 B' }, { id: 'c', name: '无产出伙伴' }] as Partner[];
  const ranking = getPartnerRankings(partners, records);
  assert.equal(ranking.length, 2);
  assert.equal(ranking[0].partner.id, 'a');
  assert.equal(ranking[0].expectedAmount, 38);
  assert.equal(ranking[1].partner.id, 'b');
});

test('金额显示与待评估状态正确', () => {
  assert.equal(formatAmount(82.8), '82.8 万');
  assert.equal(formatAmount(null), '待评估');
  assert.equal(formatAmount(10000, true), '1.00 亿');
});
