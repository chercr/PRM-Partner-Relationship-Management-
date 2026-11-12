import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateScore, dateAtOffset, getActivation, getNextFollowup } from '../src/business';
import type { Partner } from '../src/types';

const complete = { overlap: 5, willingness: 5, decision: 5, sales: 5, benefit: 5, delivery: 5 };

test('六维加权总分正确并保留两位小数', () => {
  const result = calculateScore({ overlap: 5, willingness: 4, decision: 4, sales: 4, benefit: 5, delivery: 4 });
  assert.equal(result.total, 4.4);
  assert.equal(result.grade, 'A');
});

test('未完成六维评分时不出总分', () => {
  const result = calculateScore({ overlap: 5, willingness: 4 });
  assert.equal(result.total, null);
  assert.equal(result.grade, null);
  assert.equal(result.completed, 2);
});

test('客户重叠度小于 3 时等级封顶 B', () => {
  const result = calculateScore({ ...complete, overlap: 2 });
  assert.equal(result.total, 4.25);
  assert.equal(result.grade, 'B');
  assert.equal(result.capped, true);
});

test('分级边界符合 4.2 与 3.5 规则', () => {
  assert.equal(calculateScore({ overlap: 4, willingness: 4, decision: 5, sales: 5, benefit: 4, delivery: 4 }).grade, 'A');
  assert.equal(calculateScore({ overlap: 4, willingness: 3, decision: 3, sales: 3, benefit: 4, delivery: 4 }).grade, 'B');
  assert.equal(calculateScore({ overlap: 1, willingness: 1, decision: 1, sales: 1, benefit: 1, delivery: 1 }).grade, 'C');
});

function partner(type: Partner['type'], signDate: string): Partner {
  return { id: '1', name: '测试', type, region: '', scale: '', businessDesc: '', decisionMaker: '', sourceName: '', sourceUrl: '', contact: '', verifyStatus: '已核实', verifyNote: '', batch: '首批联系', priorityOrder: 1, status: '已签约', signDate, note: '', scores: complete, followUps: [], createdAt: '', updatedAt: '' };
}

test('签约后按代理商 60 天激活线预警', () => {
  const result = getActivation(partner('AGENT', dateAtOffset(-50)));
  assert.equal(result.kind, 'warning');
  assert.equal(result.days, 10);
});

test('实施商 90 天与 IPD 120 天激活线正确', () => {
  assert.equal(getActivation(partner('SI', dateAtOffset(-80))).days, 10);
  assert.equal(getActivation(partner('IPD', dateAtOffset(-110))).days, 10);
});

test('逾期与专家不限期规则正确', () => {
  assert.equal(getActivation(partner('AGENT', dateAtOffset(-61))).kind, 'overdue');
  assert.equal(getActivation(partner('EXPERT', dateAtOffset(-500))).kind, 'unlimited');
});

test('暂停伙伴不再触发激活预警', () => {
  const paused = { ...partner('AGENT', dateAtOffset(-80)), status: '已暂停' as const };
  assert.equal(getActivation(paused).kind, 'none');
  assert.equal(getActivation(paused).label, '已暂停');
});

test('下次跟进以最新一条记录为准', () => {
  const item = partner('AGENT', dateAtOffset(-1));
  item.followUps = [
    { id: 'old', partnerId: '1', date: dateAtOffset(-8), channel: '微信', summary: '旧记录', tags: [], nextFollowupDate: dateAtOffset(1), createdAt: '2026-01-01' },
    { id: 'new', partnerId: '1', date: dateAtOffset(-1), channel: '电话', summary: '最新记录', tags: [], createdAt: '2026-01-08' },
  ];
  assert.equal(getNextFollowup(item), undefined);
  item.followUps[1].nextFollowupDate = dateAtOffset(3);
  assert.equal(getNextFollowup(item), dateAtOffset(3));
});
