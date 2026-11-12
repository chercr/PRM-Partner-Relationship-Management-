import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, BadgeCheck, BadgeDollarSign, CalendarRange, ChartNoAxesCombined, CircleCheckBig, CircleDollarSign, Filter, Inbox, Lightbulb, Target, TrendingUp, UsersRound } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../store';
import { calculateScore, dateAtOffset, monthKey, TYPE_META } from '../business';
import { exportPartnersCsv } from '../excel';
import type { PartnerType } from '../types';
import { exportOpportunitiesCsv, formatAmount, getContributionSummary, getPartnerRankings } from '../opportunity-utils';
import { PartnerAvatar } from '../components/UI';

const gradeColors = { A: '#6258d3', B: '#3b91a0', C: '#d5a24a' };
const stageDefinitions = [
  { name: '新接触', statuses: ['已接触', '已深聊', '已谈合作框架', '已签约', '已激活'] },
  { name: '深聊', statuses: ['已深聊', '已谈合作框架', '已签约', '已激活'] },
  { name: '谈框架', statuses: ['已谈合作框架', '已签约', '已激活'] },
  { name: '签约', statuses: ['已签约', '已激活'] },
  { name: '激活', statuses: ['已激活'] },
];

export default function Analytics() {
  const { partners, opportunities, contacts, toast } = useApp();
  const [range, setRange] = useState('month');
  const rangeStart = useMemo(() => {
    const now = new Date();
    if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (range === 'quarter') return new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
    return 0;
  }, [range]);
  const scoped = useMemo(() => partners.filter((p) => !rangeStart || new Date(p.createdAt).getTime() >= rangeStart), [partners, rangeStart]);
  const scopedOpportunities = useMemo(() => opportunities.filter((item) => !rangeStart || new Date(item.convertedAt || item.createdAt).getTime() >= rangeStart), [opportunities, rangeStart]);
  const contribution = getContributionSummary(scopedOpportunities);
  const rankings = getPartnerRankings(partners, scopedOpportunities).slice(0, 6);
  const contributingPartners = new Set(scopedOpportunities.filter((item) => item.stage === 'OPPORTUNITY').map((item) => item.partnerId)).size;
  const noOutputSigned = partners.filter((partner) => ['已签约', '已激活'].includes(partner.status) && !scopedOpportunities.some((item) => item.partnerId === partner.id && item.stage === 'OPPORTUNITY')).length;
  const typeContributions = (Object.keys(TYPE_META) as PartnerType[]).map((type) => {
    const ids = new Set(partners.filter((partner) => partner.type === type).map((partner) => partner.id));
    return { type, ...getContributionSummary(scopedOpportunities.filter((item) => ids.has(item.partnerId))) };
  });
  const currentMonth = monthKey(new Date());
  const monthPartners = partners.filter((p) => p.createdAt.startsWith(currentMonth));
  const monthSigned = partners.filter((p) => p.signDate?.startsWith(currentMonth));
  const monthActivated = partners.filter((p) => p.status === '已激活' && p.followUps.some((f) => f.date.startsWith(currentMonth) && f.tags.some((t) => ['报备线索', '联合拜访', '方案写入', '写入方案'].includes(t))));
  const signed = scoped.filter((p) => ['已签约', '已激活'].includes(p.status));
  const activated = scoped.filter((p) => p.status === '已激活');
  const activationRate = signed.length ? Math.round(activated.length / signed.length * 100) : 0;
  const funnel = stageDefinitions.map((stage) => ({ name: stage.name, value: scoped.filter((p) => stage.statuses.includes(p.status)).length }));
  const gradeData = (['A', 'B', 'C'] as const).map((grade) => ({ name: `${grade} 类伙伴`, grade, value: scoped.filter((p) => calculateScore(p.scores).grade === grade).length })).filter((item) => item.value > 0);
  const pendingCount = scoped.filter((p) => !calculateScore(p.scores).grade).length;
  const typeData = (Object.keys(TYPE_META) as PartnerType[]).map((type) => {
    const typed = scoped.filter((p) => p.type === type);
    const scored = typed.filter((p) => calculateScore(p.scores).total !== null);
    return { name: TYPE_META[type].short, average: scored.length ? Math.round(scored.reduce((sum, p) => sum + (calculateScore(p.scores).total || 0), 0) / scored.length * 100) / 100 : 0, total: typed.length, color: TYPE_META[type].color };
  });
  const trendData = useMemo(() => Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(); date.setMonth(date.getMonth() - (5 - index));
    const key = monthKey(date);
    return { name: `${date.getMonth() + 1}月`, 新增: partners.filter((p) => p.createdAt.startsWith(key)).length, 签约: partners.filter((p) => p.signDate?.startsWith(key)).length, 激活: partners.filter((p) => p.status === '已激活' && p.followUps.some((f) => f.date.startsWith(key) && f.tags.some((t) => ['报备线索', '联合拜访', '方案写入', '写入方案'].includes(t)))).length };
  }), [partners]);

  return <div className="analytics-page page-enter">
    <div className="page-heading"><div><div className="eyebrow"><span />CHANNEL INTELLIGENCE</div><h1>数据看板</h1><p>看清渠道质量与转化效率，用数据校准下一步资源投入。</p></div><div className="heading-actions"><div className="range-select"><CalendarRange size={16} /><select value={range} onChange={(e) => setRange(e.target.value)}><option value="month">本月</option><option value="quarter">近 3 个月</option><option value="all">全部时间</option></select></div><button className="button button-secondary" onClick={() => { exportOpportunitiesCsv(scopedOpportunities, partners, contacts); toast('贡献数据已导出', `时间范围内共 ${scopedOpportunities.length} 条线索与商机`); }}><ArrowDownToLine size={16} />导出数据</button></div></div>
    <section className="analytics-metrics"><article><span className="metric-icon metric-blue"><Inbox size={20} /></span><div><p>客户线索</p><strong>{contribution.totalLeads}<small>条</small></strong><span>待转化 {contribution.openLeads} 条</span></div><ArrowUpRight size={18} /></article><article><span className="metric-icon metric-violet"><Target size={20} /></span><div><p>已转化商机</p><strong>{contribution.opportunityCount}<small>个</small></strong><span>来自 {contributingPartners} 家伙伴</span></div><ArrowUpRight size={18} /></article><article><span className="metric-icon metric-orange"><CircleDollarSign size={20} /></span><div><p>预计商机金额</p><strong>{formatAmount(contribution.expectedAmount, true)}</strong><span>按已转化商机汇总</span></div><ArrowUpRight size={18} /></article><article><span className="metric-icon metric-green"><TrendingUp size={20} /></span><div><p>线索转商机率</p><strong>{contribution.conversionRate}<small>%</small></strong><span>{noOutputSigned} 家签约伙伴暂未产出</span></div><ArrowUpRight size={18} /></article></section>
    <div className="contribution-analysis-grid">
      <section className="panel contribution-ranking"><header className="panel-header"><div><h2>伙伴实际贡献排行</h2><p>按预计商机金额排序，同时关注真实转化数量</p></div><span className="badge badge-purple">结果指标</span></header><div className="table-scroll"><table className="data-table"><thead><tr><th>来源伙伴</th><th>客户线索</th><th>转化商机</th><th>转化率</th><th>预计贡献金额</th></tr></thead><tbody>{rankings.map((item, index) => <tr key={item.partner.id}><td><div className="contribution-partner"><span className="rank-number">{index + 1}</span><PartnerAvatar name={item.partner.name} size="small" /><div><strong>{item.partner.name}</strong><small>{TYPE_META[item.partner.type].short}</small></div></div></td><td>{item.totalLeads} 条</td><td><b>{item.opportunityCount}</b> 个</td><td><div className="rate-cell"><div><i style={{ width: `${item.conversionRate}%` }} /></div><b>{item.conversionRate}%</b></div></td><td><strong className="contribution-amount">{formatAmount(item.expectedAmount)}</strong></td></tr>)}</tbody></table>{!rankings.length && <div className="contribution-empty">当前时间范围还没有线索或商机记录</div>}</div></section>
      <section className="panel type-contribution"><header className="panel-header"><div><h2>各渠道类型产出</h2><p>比较线索质量与预计贡献</p></div></header><div className="type-contribution-list">{typeContributions.map((item) => <div key={item.type}><div className="type-contribution-label"><span><i style={{ background: TYPE_META[item.type].color }} />{TYPE_META[item.type].name}</span><strong>{formatAmount(item.expectedAmount)}</strong></div><div className="type-contribution-bar"><i style={{ width: `${item.expectedAmount / Math.max(...typeContributions.map((row) => row.expectedAmount), 1) * 100}%`, background: TYPE_META[item.type].color }} /></div><small>{item.totalLeads} 条线索 · {item.opportunityCount} 个商机 · 转化率 {item.conversionRate}%</small></div>)}</div><footer className="contribution-insight"><Lightbulb size={16} /><p>伙伴评分用于判断投入优先级，实际商机产出用于验证投入是否有效。</p></footer></section>
    </div>
    <div className="analytics-top-grid">
      <section className="panel analytics-funnel"><header className="panel-header"><div><h2>渠道转化漏斗</h2><p>当前范围内各阶段累计伙伴数</p></div><span className="badge badge-purple">实时数据</span></header><div className="analytics-funnel-body">{funnel.map((stage, index) => <div className="analytics-funnel-stage" key={stage.name}><div className="funnel-stage-label"><span>{stage.name}</span><b>{stage.value}<small> 家</small></b></div><div className="funnel-stage-bar" style={{ width: `${Math.max(16, stage.value / Math.max(funnel[0].value, 1) * 100)}%` }}><span>{index > 0 && funnel[index - 1].value ? `${Math.round(stage.value / funnel[index - 1].value * 100)}% 转化` : '渠道入口'}</span></div>{index < funnel.length - 1 && <i />}</div>)}</div><footer className="funnel-footer-insight"><Lightbulb size={17} /><span>从签约到激活的转化率为 <b>{activationRate}%</b>，激活动作录入后自动计入。</span></footer></section>
      <section className="panel grade-chart-panel"><header className="panel-header"><div><h2>伙伴质量分布</h2><p>ABC 分级占比</p></div></header><div className="donut-wrap"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={gradeData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={84} paddingAngle={4} stroke="none">{gradeData.map((entry) => <Cell key={entry.grade} fill={gradeColors[entry.grade]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e8e8ef', fontSize: 12 }} /></PieChart></ResponsiveContainer><div><strong>{scoped.length - pendingCount}</strong><span>已评估</span></div></div><div className="donut-legend">{gradeData.map((entry) => <div key={entry.grade}><i style={{ background: gradeColors[entry.grade] }} /><span>{entry.name}</span><b>{entry.value}</b><small>{Math.round(entry.value / Math.max(scoped.length - pendingCount, 1) * 100)}%</small></div>)}{pendingCount > 0 && <div><i style={{ background: '#d9dce5' }} /><span>待评估</span><b>{pendingCount}</b><small>—</small></div>}</div></div></section>
    </div>
    <div className="analytics-middle-grid">
      <section className="panel trend-chart-panel"><header className="panel-header"><div><h2>渠道增长趋势</h2><p>近 6 个月新增、签约与激活</p></div><div className="chart-legend"><span><i className="violet" />新增</span><span><i className="green" />签约</span><span><i className="blue" />激活</span></div></header><div className="chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}><defs><linearGradient id="newFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#675bd4" stopOpacity={0.22} /><stop offset="100%" stopColor="#675bd4" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#eeeff4" strokeDasharray="3 3" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8a8d9d' }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8a8d9d' }} /><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e8e8ef', fontSize: 12 }} /><Area type="monotone" dataKey="新增" stroke="#675bd4" strokeWidth={2.5} fill="url(#newFill)" /><Area type="monotone" dataKey="签约" stroke="#35a383" strokeWidth={2} fill="transparent" /><Area type="monotone" dataKey="激活" stroke="#4285c5" strokeWidth={2} fill="transparent" /></AreaChart></ResponsiveContainer></div></section>
      <section className="panel type-chart-panel"><header className="panel-header"><div><h2>各类型平均评分</h2><p>已完成评估伙伴的质量对比</p></div></header><div className="chart-container"><ResponsiveContainer width="100%" height="100%"><BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 24, left: 6, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#eeeff4" strokeDasharray="3 3" /><XAxis type="number" domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8d9d' }} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={58} tick={{ fontSize: 12, fill: '#55596b' }} /><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e8e8ef', fontSize: 12 }} /><Bar dataKey="average" name="平均分" radius={[0, 5, 5, 0]} barSize={17}>{typeData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div></section>
    </div>
    <section className="panel type-performance"><header className="panel-header"><div><h2>类型转化表现</h2><p>伙伴规模、评估质量与激活效率综合对比</p></div></header><table className="data-table"><thead><tr><th>伙伴类型</th><th>伙伴数量</th><th>平均评分</th><th>已签约</th><th>已激活</th><th>激活率</th><th>标准激活周期</th></tr></thead><tbody>{typeData.map((row, index) => { const type = (Object.keys(TYPE_META) as PartnerType[])[index]; const typed = scoped.filter((p) => p.type === type); const typeSigned = typed.filter((p) => ['已签约', '已激活'].includes(p.status)); const typeActivated = typed.filter((p) => p.status === '已激活'); return <tr key={row.name}><td><span className="type-table-name"><i style={{ background: row.color }} />{TYPE_META[type].name}</span></td><td><b>{row.total}</b> 家</td><td><b>{row.average ? row.average.toFixed(2) : '—'}</b></td><td>{typeSigned.length} 家</td><td>{typeActivated.length} 家</td><td><div className="rate-cell"><div><i style={{ width: `${typeSigned.length ? typeActivated.length / typeSigned.length * 100 : 0}%`, background: row.color }} /></div><b>{typeSigned.length ? Math.round(typeActivated.length / typeSigned.length * 100) : 0}%</b></div></td><td>{TYPE_META[type].activationDays ? `${TYPE_META[type].activationDays} 天` : '不限期'}</td></tr>; })}</tbody></table></section>
  </div>;
}
