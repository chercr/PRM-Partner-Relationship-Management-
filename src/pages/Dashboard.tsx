import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CalendarCheck2, CalendarDays, CheckCircle2, CircleAlert, Clock3, Download, Flame, Plus, Sparkles, TrendingUp, UserPlus, UsersRound } from 'lucide-react';
import { useApp } from '../store';
import { calculateScore, dateAtOffset, daysBetween, formatDate, getActivation, getNextFollowup, monthKey, relativeDay, TYPE_META } from '../business';
import PartnerTable from '../components/PartnerTable';
import { GradeBadge, PartnerAvatar } from '../components/UI';
import { getContributionSummary } from '../opportunity-utils';

const funnelStages = [
  { label: '新接触', statuses: ['已接触', '已深聊', '已谈合作框架', '已签约', '已激活'], color: '#a9a4ee' },
  { label: '深聊', statuses: ['已深聊', '已谈合作框架', '已签约', '已激活'], color: '#8a82e3' },
  { label: '谈框架', statuses: ['已谈合作框架', '已签约', '已激活'], color: '#6e64d8' },
  { label: '签约', statuses: ['已签约', '已激活'], color: '#574ec4' },
  { label: '激活', statuses: ['已激活'], color: '#2f9c83' },
];

export default function Dashboard() {
  const { partners, opportunities, user, loading, openPartnerForm, openImport, openFollowup } = useApp();
  const navigate = useNavigate();
  const today = dateAtOffset(0);
  const thisMonth = monthKey(new Date());
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
  const dateText = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now);

  const metrics = useMemo(() => {
    const scored = partners.filter((p) => calculateScore(p.scores).grade);
    const gradeA = scored.filter((p) => calculateScore(p.scores).grade === 'A').length;
    const signed = partners.filter((p) => ['已签约', '已激活'].includes(p.status));
    const activated = partners.filter((p) => p.status === '已激活').length;
    return {
      total: partners.length,
      newMonth: partners.filter((p) => p.createdAt.startsWith(thisMonth)).length,
      gradeA,
      scored: scored.length,
      signedMonth: partners.filter((p) => p.signDate?.startsWith(thisMonth)).length,
      activated,
      activationRate: signed.length ? Math.round(activated / signed.length * 100) : 0,
    };
  }, [partners, thisMonth]);

  const contribution = getContributionSummary(opportunities);
  const contributingPartners = new Set(opportunities.filter((item) => item.stage === 'OPPORTUNITY').map((item) => item.partnerId)).size;

  const reminders = useMemo(() => {
    const items = partners.flatMap((partner) => {
      const next = getNextFollowup(partner);
      const activation = getActivation(partner);
      const list = [];
      if (next && daysBetween(today, next) <= 7) list.push({ partner, kind: 'followup' as const, date: next, days: daysBetween(today, next) });
      if (activation.kind === 'warning' || activation.kind === 'overdue') list.push({ partner, kind: 'activation' as const, date: activation.deadline!, days: activation.days!, activation });
      return list;
    });
    return items.sort((a, b) => a.days - b.days);
  }, [partners, today]);
  const todayCount = reminders.filter((r) => r.kind === 'followup' && r.days === 0).length;
  const weekCount = reminders.filter((r) => r.kind === 'followup' && r.days >= 0 && r.days <= 7).length;
  const riskCount = reminders.filter((r) => r.kind === 'activation').length;
  const priorityPartners = [...partners].filter((p) => !['已暂停', '已激活'].includes(p.status)).sort((a, b) => {
    const scoreA = calculateScore(a.scores).total || 0;
    const scoreB = calculateScore(b.scores).total || 0;
    return a.priorityOrder - b.priorityOrder || scoreB - scoreA;
  }).slice(0, 5);
  const counts = funnelStages.map((stage) => partners.filter((p) => stage.statuses.includes(p.status)).length);
  const maxCount = Math.max(...counts, 1);

  if (loading) return <div className="page-loading"><span className="loader" /><p>正在整理你的渠道工作区…</p></div>;

  return <div className="dashboard-page page-enter">
    <div className="page-heading dashboard-heading"><div><div className="eyebrow"><span />渠道经营工作台</div><h1>{greeting}，{user?.displayName || '管理员'} <span className="wave">👋</span></h1><p>{dateText} · 今天也让优质伙伴向前一步。</p></div><div className="heading-actions"><button className="button button-secondary" onClick={openImport}><Download size={16} />导入名单</button><button className="button button-primary" onClick={() => openPartnerForm()}><Plus size={17} />新增伙伴</button></div></div>

    <section className="reminder-strip">
      <button onClick={() => navigate('/followups?filter=today')} className="reminder-item reminder-today"><span className="reminder-icon"><CalendarCheck2 size={20} /></span><div><span>今日待跟进</span><strong>{todayCount}<small>项</small></strong></div><span className="reminder-note">{todayCount ? '记得记录沟通进展' : '今日安排已清空'}</span><ArrowRight size={16} /></button>
      <button onClick={() => navigate('/followups?filter=week')} className="reminder-item reminder-week"><span className="reminder-icon"><CalendarDays size={20} /></span><div><span>7 日内跟进</span><strong>{weekCount}<small>项</small></strong></div><span className="reminder-note">提前准备，掌握节奏</span><ArrowRight size={16} /></button>
      <button onClick={() => navigate('/followups?filter=risk')} className="reminder-item reminder-risk"><span className="reminder-icon"><CircleAlert size={20} /></span><div><span>激活预警</span><strong>{riskCount}<small>项</small></strong></div><span className="reminder-note">{riskCount ? '需要优先关注' : '当前激活状态健康'}</span><ArrowRight size={16} /></button>
    </section>

    <section className="metric-grid">
      <article className="metric-card"><div className="metric-card-top"><span className="metric-icon metric-violet"><UsersRound size={19} /></span><span className="metric-trend"><ArrowUpRight size={13} />稳步积累</span></div><p>伙伴总数</p><div className="metric-value"><strong>{metrics.total}</strong><span>家</span><MiniSparkline color="#6a60d5" points="0,24 16,19 32,21 48,12 64,15 80,5 96,8" /></div><small>本月新增 <b>{metrics.newMonth}</b> 家候选伙伴</small></article>
      <article className="metric-card"><div className="metric-card-top"><span className="metric-icon metric-orange"><Flame size={19} /></span><span className="metric-label">高潜伙伴</span></div><p>A 类重点伙伴</p><div className="metric-value"><strong>{metrics.gradeA}</strong><span>家</span><div className="metric-dots">{Array.from({ length: 8 }).map((_, i) => <i key={i} className={i < Math.min(metrics.gradeA, 8) ? 'filled' : ''} />)}</div></div><small>已完成评估 <b>{metrics.scored}</b> 家</small></article>
      <article className="metric-card"><div className="metric-card-top"><span className="metric-icon metric-blue"><CheckCircle2 size={19} /></span><span className="metric-label">实际产出</span></div><p>累计转化商机</p><div className="metric-value"><strong>{contribution.opportunityCount}</strong><span>个</span><MiniSparkline color="#397fc4" points="0,24 16,24 32,17 48,18 64,9 80,12 96,3" /></div><small>来自 <b>{contributingPartners}</b> 家伙伴的真实需求</small></article>
      <article className="metric-card"><div className="metric-card-top"><span className="metric-icon metric-green"><TrendingUp size={19} /></span><span className="metric-trend positive"><ArrowUpRight size={13} />贡献预估</span></div><p>预计商机金额</p><div className="metric-value"><strong>{contribution.expectedAmount.toLocaleString('zh-CN')}</strong><span>万元</span><div className="radial-mini" style={{ '--percent': `${contribution.conversionRate * 3.6}deg` } as React.CSSProperties}><i /></div></div><small>线索转商机率 <b>{contribution.conversionRate}%</b></small></article>
    </section>

    <div className="dashboard-main-grid">
      <section className="panel funnel-panel"><header className="panel-header"><div><h2>伙伴转化漏斗</h2><p>从初次接触到产生实际合作</p></div><button className="text-button" onClick={() => navigate('/analytics')}>查看完整看板<ArrowUpRight size={15} /></button></header><div className="funnel-content"><div className="funnel-bars">{funnelStages.map((stage, index) => <div className="funnel-row" key={stage.label}><span>{stage.label}</span><div className="funnel-bar-track"><div className="funnel-bar" style={{ width: `${Math.max(12, counts[index] / maxCount * 100)}%`, background: stage.color }}><b>{counts[index]}</b></div></div><small>{index === 0 ? '100%' : counts[index - 1] ? `${Math.round(counts[index] / counts[index - 1] * 100)}%` : '—'}</small></div>)}</div><div className="funnel-insight"><Sparkles size={17} /><div><strong>本月转化洞察</strong><p>深聊到框架洽谈是当前关键环节，建议优先推进 A 类伙伴的联合方案讨论。</p></div></div></div></section>
      <section className="panel focus-panel"><header className="panel-header"><div><h2>近期焦点</h2><p>按紧急程度为你排序</p></div><span className="count-pill">{reminders.length}</span></header><div className="focus-list">{reminders.slice(0, 4).map((item) => <button key={`${item.partner.id}-${item.kind}`} onClick={() => item.kind === 'followup' ? openFollowup(item.partner) : navigate(`/partners/${item.partner.id}`)} className="focus-item"><PartnerAvatar name={item.partner.name} size="small" /><div><strong>{item.partner.name}</strong><span>{item.kind === 'followup' ? <><Clock3 size={12} />{relativeDay(item.date)}跟进</> : <><CircleAlert size={12} />{item.activation?.label}激活到期</>}</span></div><span className={`focus-day ${item.days < 0 ? 'danger' : item.days <= 1 ? 'warning' : ''}`}>{item.kind === 'followup' ? formatDate(item.date) : item.days < 0 ? '已逾期' : `${item.days} 天`}</span></button>)}{!reminders.length && <div className="focus-empty"><CheckCircle2 size={28} /><strong>近期事项都已安排妥当</strong><span>可以去蓄水池发现新伙伴</span></div>}</div><button className="focus-footer" onClick={() => navigate('/followups')}>查看全部日程<ArrowRight size={15} /></button></section>
    </div>

    <section className="panel priority-panel"><header className="panel-header"><div><h2>重点伙伴推进</h2><p>综合联系优先级与评估得分</p></div><button className="text-button" onClick={() => navigate('/partners')}>全部伙伴<ArrowRight size={15} /></button></header><PartnerTable partners={priorityPartners} compact /></section>
  </div>;
}

function MiniSparkline({ color, points }: { color: string; points: string }) {
  return <svg className="mini-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><defs><linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs><polygon points={`${points} 96,30 0,30`} fill={`url(#gradient-${color.replace('#', '')})`} /><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
