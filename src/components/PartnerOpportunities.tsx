import { ArrowRight, BadgeDollarSign, Building2, Edit3, Inbox, Plus, Target } from 'lucide-react';
import { useApp } from '../store';
import { formatAmount, getPartnerContribution } from '../opportunity-utils';
import type { Partner } from '../types';
import { EmptyState, PartnerAvatar } from './UI';

export default function PartnerOpportunities({ partner }: { partner: Partner }) {
  const { opportunities, openOpportunityForm } = useApp();
  const records = opportunities.filter((item) => item.partnerId === partner.id);
  const summary = getPartnerContribution(partner.id, opportunities);
  return <section className="panel partner-opportunities-panel">
    <header className="panel-header"><div><h2>伙伴实际贡献</h2><p>只记录线索、真实需求与预计商机金额</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => openOpportunityForm({ partnerId: partner.id, stage: 'OPPORTUNITY' })}><BadgeDollarSign size={15} />登记商机</button><button className="button button-primary" onClick={() => openOpportunityForm({ partnerId: partner.id, stage: 'LEAD' })}><Plus size={15} />登记线索</button></div></header>
    <div className="partner-contribution-summary"><div><Inbox size={17} /><span>累计线索</span><strong>{summary.totalLeads}</strong></div><div><Target size={17} /><span>已转商机</span><strong>{summary.opportunityCount}</strong></div><div><BadgeDollarSign size={17} /><span>预计贡献金额</span><strong>{formatAmount(summary.expectedAmount)}</strong></div><div><Target size={17} /><span>线索转化率</span><strong>{summary.conversionRate}%</strong></div></div>
    {records.length ? <div className="partner-opportunity-list">{records.map((item) => <article key={item.id}><PartnerAvatar name={item.customerName} /><div className="partner-opportunity-content"><div><strong>{item.customerName} · {item.name}</strong><span className={`opportunity-stage stage-${item.stage.toLowerCase()}`}><i />{item.stage === 'OPPORTUNITY' ? '已转商机' : '客户线索'}</span></div><p>{item.demand || '真实需求待核实'}</p><small>登记于 {item.createdAt.slice(0, 10)}{item.convertedAt ? ` · 转化于 ${item.convertedAt.slice(0, 10)}` : ''}</small></div><strong className="partner-opportunity-amount">{formatAmount(item.expectedAmount)}</strong><div className="partner-opportunity-actions">{item.stage === 'LEAD' && <button className="button button-primary button-small" onClick={() => openOpportunityForm({ opportunity: item, stage: 'OPPORTUNITY' })}>转商机<ArrowRight size={14} /></button>}<button className="table-action" onClick={() => openOpportunityForm({ opportunity: item })}><Edit3 size={16} /></button></div></article>)}</div> : <EmptyState icon={<Building2 size={30} />} title="这家伙伴还没有客户线索" description="从伙伴带来的第一条潜在客户线索开始记录。" action={<button className="button button-primary" onClick={() => openOpportunityForm({ partnerId: partner.id, stage: 'LEAD' })}><Plus size={15} />登记第一条线索</button>} />}
  </section>;
}
