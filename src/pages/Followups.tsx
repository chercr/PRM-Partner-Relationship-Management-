import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Calendar, CalendarCheck2, ChevronLeft, ChevronRight, CircleAlert, Clock3, MessageSquarePlus, PhoneCall } from 'lucide-react';
import { useApp } from '../store';
import { dateAtOffset, daysBetween, formatDate, getActivation, getNextFollowup, relativeDay, TYPE_META } from '../business';
import { PartnerAvatar } from '../components/UI';

type Filter = 'all' | 'today' | 'week' | 'risk' | 'overdue' | 'date';

export default function Followups() {
  const { partners, openFollowup } = useApp();
  const [params, setParams] = useSearchParams();
  const initial = (params.get('filter') || 'all') as Filter;
  const [filter, setFilter] = useState<Filter>(initial);
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const navigate = useNavigate();
  const today = dateAtOffset(0);

  const items = useMemo(() => partners.flatMap((partner) => {
    const next = getNextFollowup(partner);
    const activation = getActivation(partner);
    const result = [];
    if (next) result.push({ id: `${partner.id}-next`, partner, kind: 'followup' as const, date: next, days: daysBetween(today, next), summary: partner.followUps[0]?.summary || '已安排下次联系，记得提前准备。' });
    if (['warning', 'overdue'].includes(activation.kind)) result.push({ id: `${partner.id}-activation`, partner, kind: 'risk' as const, date: activation.deadline!, days: activation.days!, summary: `签约激活窗口${activation.days! < 0 ? '已结束' : '即将到期'}，请尽快安排激活动作或确认暂停。` });
    return result;
  }).sort((a, b) => a.date.localeCompare(b.date)), [partners, today]);

  const filtered = items.filter((item) => {
    if (filter === 'today') return item.kind === 'followup' && item.days === 0;
    if (filter === 'week') return item.kind === 'followup' && item.days >= 0 && item.days <= 7;
    if (filter === 'risk') return item.kind === 'risk';
    if (filter === 'overdue') return item.days < 0;
    if (filter === 'date') return item.date === selectedDate;
    return true;
  });
  const counts = {
    today: items.filter((i) => i.kind === 'followup' && i.days === 0).length,
    week: items.filter((i) => i.kind === 'followup' && i.days >= 0 && i.days <= 7).length,
    risk: items.filter((i) => i.kind === 'risk').length,
    overdue: items.filter((i) => i.days < 0).length,
  };
  const calendarCells = buildCalendar(month);
  const monthTitle = `${month.getFullYear()} 年 ${month.getMonth() + 1} 月`;
  function changeFilter(next: Filter) { setFilter(next); setSelectedDate(null); setParams(next === 'all' ? {} : { filter: next }); }
  function shiftMonth(offset: number) { setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1)); setSelectedDate(null); if (filter === 'date') setFilter('all'); }

  return <div className="followups-page page-enter">
    <div className="page-heading"><div><div className="eyebrow"><span />FOLLOW-UP RHYTHM</div><h1>跟进日程</h1><p>把每一次沟通变成明确行动，不让重要伙伴悄悄流失。</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => changeFilter('today')}><Clock3 size={16} />聚焦今天</button></div></div>
    <section className="schedule-stats"><button className={filter === 'today' ? 'active' : ''} onClick={() => changeFilter('today')}><span className="schedule-stat-icon purple"><CalendarCheck2 size={19} /></span><div><strong>{counts.today}</strong><span>今日待跟进</span></div><ArrowRight size={15} /></button><button className={filter === 'week' ? 'active' : ''} onClick={() => changeFilter('week')}><span className="schedule-stat-icon blue"><Calendar size={19} /></span><div><strong>{counts.week}</strong><span>未来 7 日</span></div><ArrowRight size={15} /></button><button className={filter === 'risk' ? 'active' : ''} onClick={() => changeFilter('risk')}><span className="schedule-stat-icon orange"><CircleAlert size={19} /></span><div><strong>{counts.risk}</strong><span>激活预警</span></div><ArrowRight size={15} /></button><button className={filter === 'overdue' ? 'active' : ''} onClick={() => changeFilter('overdue')}><span className="schedule-stat-icon red"><Clock3 size={19} /></span><div><strong>{counts.overdue}</strong><span>已逾期事项</span></div><ArrowRight size={15} /></button></section>
    <div className="schedule-layout">
      <section className="panel schedule-list-panel"><header className="schedule-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => changeFilter('all')}>全部事项 <span>{items.length}</span></button><button className={filter === 'today' ? 'active' : ''} onClick={() => changeFilter('today')}>今天</button><button className={filter === 'week' ? 'active' : ''} onClick={() => changeFilter('week')}>未来 7 天</button><button className={filter === 'risk' ? 'active' : ''} onClick={() => changeFilter('risk')}>激活预警</button>{filter === 'date' && <button className="active">{formatDate(selectedDate || today)}<button onClick={() => changeFilter('all')}>×</button></button>}</header><div className="schedule-list">{filtered.map((item) => <article className={`schedule-item ${item.days < 0 ? 'is-overdue' : ''}`} key={item.id}><div className="schedule-date"><strong>{formatDate(item.date)}</strong><span className={item.days <= 0 ? 'urgent' : ''}>{relativeDay(item.date)}</span></div><PartnerAvatar name={item.partner.name} /><div className="schedule-content"><div><button onClick={() => navigate(`/partners/${item.partner.id}`)}>{item.partner.name}</button><span className={`schedule-kind ${item.kind === 'risk' ? 'risk' : ''}`}>{item.kind === 'risk' ? '激活预警' : '伙伴跟进'}</span></div><p>{item.summary}</p><small>{TYPE_META[item.partner.type].short} · {item.partner.status} · {item.partner.region || '区域待核验'}</small></div><div className="schedule-action">{item.kind === 'followup' ? <button className="button button-secondary button-small" onClick={() => openFollowup(item.partner)}><MessageSquarePlus size={15} />去跟进</button> : <button className="button button-warning-soft button-small" onClick={() => navigate(`/partners/${item.partner.id}`)}>立即处理<ArrowRight size={14} /></button>}</div></article>)}{!filtered.length && <div className="schedule-empty"><CalendarCheck2 size={34} /><h3>这里暂时没有待办</h3><p>当前筛选下没有事项，保持好节奏。</p></div>}</div></section>
      <aside className="schedule-side">
        <section className="panel mini-calendar-card"><header><h2>{monthTitle}</h2><div><button onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></button><button onClick={() => shiftMonth(1)}><ChevronRight size={16} /></button></div></header><div className="calendar-weekdays">{['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarCells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;
          const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayItems = items.filter((item) => item.date === date);
          return <button key={date} className={`${date === today ? 'today' : ''} ${date === selectedDate ? 'selected' : ''} ${dayItems.length ? 'has-items' : ''}`} onClick={() => { setSelectedDate(date); setFilter('date'); }}><span>{day}</span>{dayItems.length > 0 && <i className={dayItems.some((item) => item.kind === 'risk') ? 'risk-dot' : ''} />}</button>;
        })}</div><footer><span><i />跟进安排</span><span><i className="risk-dot" />激活预警</span></footer></section>
        <section className="panel rhythm-card"><header><h2>本周跟进节奏</h2><span>周一至周日</span></header><div className="rhythm-bars">{Array.from({ length: 7 }).map((_, index) => { const offset = index - ((new Date().getDay() + 6) % 7); const date = dateAtOffset(offset); const count = items.filter((item) => item.kind === 'followup' && item.date === date).length; return <div key={date}><span>{['一', '二', '三', '四', '五', '六', '日'][index]}</span><div><i className={offset === 0 ? 'today' : ''} style={{ height: `${Math.max(8, Math.min(100, count * 28 + 8))}%` }} /></div><b>{count || '—'}</b></div>; })}</div><p><PhoneCall size={14} />建议每天集中一个时段处理跟进，并及时留下记录。</p></section>
      </aside>
    </div>
  </div>;
}

function buildCalendar(month: Date): Array<number | null> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  return [...Array.from({ length: firstDay }, () => null), ...Array.from({ length: days }, (_, index) => index + 1)];
}
