import type { Contact, Opportunity, Partner } from './types';

export function formatAmount(amount: number | null | undefined, compact = false): string {
  if (amount === null || amount === undefined) return '待评估';
  if (compact && amount >= 10000) return `${(amount / 10000).toFixed(2)} 亿`;
  return `${amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 万`;
}

export function getContributionSummary(opportunities: Opportunity[]) {
  const converted = opportunities.filter((item) => item.stage === 'OPPORTUNITY');
  return {
    totalLeads: opportunities.length,
    openLeads: opportunities.filter((item) => item.stage === 'LEAD').length,
    opportunityCount: converted.length,
    expectedAmount: Math.round(converted.reduce((sum, item) => sum + (item.expectedAmount || 0), 0) * 100) / 100,
    conversionRate: opportunities.length ? Math.round(converted.length / opportunities.length * 100) : 0,
  };
}

export function getPartnerContribution(partnerId: string, opportunities: Opportunity[]) {
  return getContributionSummary(opportunities.filter((item) => item.partnerId === partnerId));
}

export function getPartnerRankings(partners: Partner[], opportunities: Opportunity[]) {
  return partners.map((partner) => ({ partner, ...getPartnerContribution(partner.id, opportunities) }))
    .filter((item) => item.totalLeads > 0)
    .sort((a, b) => b.expectedAmount - a.expectedAmount || b.opportunityCount - a.opportunityCount || b.totalLeads - a.totalLeads);
}

export function exportOpportunitiesCsv(opportunities: Opportunity[], partners: Partner[], contacts: Contact[] = []): void {
  const partnerMap = new Map(partners.map((partner) => [partner.id, partner.name]));
  const contactMap = new Map(contacts.map((contact) => [contact.id, contact.name]));
  const headers = ['记录类型', '客户名称', '线索/商机名称', '来源伙伴', '引荐人', '真实需求', '预计金额（万元）', '登记时间', '转商机时间'];
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = opportunities.map((item) => [item.stage === 'OPPORTUNITY' ? '商机' : '线索', item.customerName, item.name, partnerMap.get(item.partnerId) || '未知伙伴', item.sourceContactId ? contactMap.get(item.sourceContactId) || '历史联系人' : '—', item.demand, item.expectedAmount ?? '待评估', item.createdAt.slice(0, 10), item.convertedAt?.slice(0, 10) || '—']);
  const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `线索商机_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
