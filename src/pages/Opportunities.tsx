import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeDollarSign, Building2, ChevronLeft, ChevronRight, CircleDollarSign, Download, Edit3, Inbox, LoaderCircle, Plus, Search, Sparkles, Target, Trash2, TrendingUp } from 'lucide-react';
import { useApp } from '../store';
import { exportOpportunitiesCsv, formatAmount, getContributionSummary } from '../opportunity-utils';
import type { Opportunity } from '../types';
import { EmptyState, PartnerAvatar } from '../components/UI';

const PAGE_SIZE = 15;

export default function Opportunities() {
  const { opportunities, partners, contacts, loading, openOpportunityForm, updateOpportunity, deleteOpportunity, toast } = useApp();
  const [filter, setFilter] = useState<'all' | 'lead' | 'opportunity'>('all');
  const [search, setSearch] = useState('');
  const [partnerId, setPartnerId] = useState('all');
  const [page, setPage] = useState(1);
  const [convertingId, setConvertingId] = useState('');
  const navigate = useNavigate();
  const partnerMap = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [partners]);
  const summary = getContributionSummary(opportunities);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthOpportunities = opportunities.filter((item) => item.stage === 'OPPORTUNITY' && item.convertedAt?.startsWith(currentMonth)).length;
  const filtered = useMemo(() => opportunities.filter((item) => {
    const partner = partnerMap.get(item.partnerId);
    const query = search.trim().toLowerCase();
    return (filter === 'all' || (filter === 'lead' ? item.stage === 'LEAD' : item.stage === 'OPPORTUNITY'))
      && (partnerId === 'all' || item.partnerId === partnerId)
      && (!query || [item.customerName, item.name, item.demand, partner?.name || ''].some((value) => value.toLowerCase().includes(query)));
  }), [opportunities, filter, partnerId, search, partnerMap]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filter, search, partnerId]);

  async function convert(item: Opportunity) {
    if (!item.demand.trim() || item.expectedAmount === null) {
      openOpportunityForm({ opportunity: item, stage: 'OPPORTUNITY' });
      return;
    }
    setConvertingId(item.id);
    try { await updateOpportunity(item.id, { stage: 'OPPORTUNITY' }); toast('已成功转为商机', `${item.customerName} · 预计 ${formatAmount(item.expectedAmount)}`); }
    catch (error) { toast('转换失败', error instanceof Error ? error.message : undefined, 'error'); }
    finally { setConvertingId(''); }
  }

  async function remove(item: Opportunity) {
    if (!window.confirm(`确定删除「${item.name}」吗？此操作不可撤销。`)) return;
    await deleteOpportunity(item.id);
    toast('记录已删除', item.name, 'info');
  }

  if (loading) return <div className="page-loading"><span className="loader" /><p>正在整理线索与商机…</p></div>;
  return <div className="opportunities-page page-enter">
    <div className="page-heading"><div><div className="eyebrow"><span />CHANNEL CONTRIBUTION</div><h1>线索与商机</h1><p>不只关心签了多少伙伴，更关心伙伴带来了多少真实客户机会。</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => { exportOpportunitiesCsv(filtered, partners, contacts); toast('线索商机已导出', `共 ${filtered.length} 条记录`); }}><Download size={16} />导出</button><button className="button button-secondary" onClick={() => openOpportunityForm({ stage: 'OPPORTUNITY' })}><BadgeDollarSign size={16} />登记商机</button><button className="button button-primary" onClick={() => openOpportunityForm({ stage: 'LEAD' })}><Plus size={17} />登记线索</button></div></div>
    <section className="opportunity-metrics">
      <article><span className="metric-icon metric-blue"><Inbox size={20} /></span><div><p>累计客户线索</p><strong>{summary.totalLeads}<small>条</small></strong><span>待转化 {summary.openLeads} 条</span></div></article>
      <article><span className="metric-icon metric-violet"><Target size={20} /></span><div><p>已转化商机</p><strong>{summary.opportunityCount}<small>个</small></strong><span>本月新增 {monthOpportunities} 个</span></div></article>
      <article><span className="metric-icon metric-orange"><CircleDollarSign size={20} /></span><div><p>预计商机金额</p><strong className="amount-metric">{formatAmount(summary.expectedAmount, true)}</strong><span>仅统计已转化商机</span></div></article>
      <article><span className="metric-icon metric-green"><TrendingUp size={20} /></span><div><p>线索转商机率</p><strong>{summary.conversionRate}<small>%</small></strong><span>{summary.opportunityCount} / {summary.totalLeads} 条完成转化</span></div></article>
    </section>
    <section className="panel opportunity-directory">
      <div className="opportunity-toolbar"><div className="opportunity-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部记录<span>{opportunities.length}</span></button><button className={filter === 'lead' ? 'active' : ''} onClick={() => setFilter('lead')}>客户线索<span>{summary.openLeads}</span></button><button className={filter === 'opportunity' ? 'active' : ''} onClick={() => setFilter('opportunity')}>已转商机<span>{summary.opportunityCount}</span></button></div><div className="opportunity-filters"><div className="table-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索客户、商机或来源伙伴" /></div><select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}><option value="all">全部来源伙伴</option>{partners.filter((partner) => opportunities.some((item) => item.partnerId === partner.id)).map((partner) => <option value={partner.id} key={partner.id}>{partner.name}</option>)}</select></div></div>
      {pageRows.length ? <div className="table-scroll"><table className="data-table opportunity-table"><thead><tr><th>客户 / 线索商机</th><th>来源伙伴</th><th>真实需求</th><th>预计金额</th><th>登记时间</th><th>记录状态</th><th>操作</th></tr></thead><tbody>{pageRows.map((item) => {
        const partner = partnerMap.get(item.partnerId);
        return <tr key={item.id}><td><div className="opportunity-name-cell"><PartnerAvatar name={item.customerName} /><div><strong>{item.customerName}</strong><span>{item.name}</span></div></div></td><td><div className="source-partner-cell"><button className="source-partner-link" onClick={() => partner && navigate(`/partners/${partner.id}`)}>{partner?.name || '未知伙伴'}<ArrowRight size={12} /></button>{item.sourceContactId && <small>引荐人：{contacts.find((contact) => contact.id === item.sourceContactId)?.name || '历史联系人'}</small>}</div></td><td><p className="demand-preview" title={item.demand}>{item.demand || '需求待核实'}</p></td><td><strong className={item.expectedAmount !== null ? 'opportunity-amount' : 'amount-pending'}>{formatAmount(item.expectedAmount)}</strong></td><td><span className="opportunity-date">{item.createdAt.slice(0, 10)}</span></td><td><span className={`opportunity-stage stage-${item.stage.toLowerCase()}`}><i />{item.stage === 'OPPORTUNITY' ? '已转商机' : '客户线索'}</span></td><td><div className="opportunity-actions">{item.stage === 'LEAD' && <button className="button button-primary button-small" disabled={convertingId === item.id} onClick={() => convert(item)}>{convertingId === item.id ? <LoaderCircle size={14} className="spin" /> : <ArrowRight size={14} />}一键转商机</button>}<button className="table-action" title="编辑" onClick={() => openOpportunityForm({ opportunity: item })}><Edit3 size={16} /></button><button className="table-action delete" title="删除" onClick={() => remove(item)}><Trash2 size={16} /></button></div></td></tr>;
      })}</tbody></table></div> : <EmptyState icon={<Building2 size={32} />} title="还没有匹配的记录" description="可以从伙伴详情或右上角登记第一条客户线索。" action={<button className="button button-primary" onClick={() => openOpportunityForm({ stage: 'LEAD' })}><Plus size={15} />登记线索</button>} />}
      <footer className="table-pagination"><span>共 {filtered.length} 条记录 · 金额为预估值</span><div><button disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button><button className="active">{page}</button><button disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button></div></footer>
    </section>
  </div>;
}
