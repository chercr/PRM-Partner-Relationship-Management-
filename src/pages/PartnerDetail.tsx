import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Calendar, CalendarClock, Check, CheckCircle2, ChevronRight, CircleAlert, Clock3, Edit3, ExternalLink, FileText, Link2, LoaderCircle, MailPlus, MapPin, MessageSquarePlus, MoreHorizontal, PauseCircle, Phone, RotateCcw, ShieldCheck, Sparkles, Trash2, UserRound, UsersRound, Video } from 'lucide-react';
import { useApp } from '../store';
import { calculateScore, dateAtOffset, DIMENSIONS, formatDate, getActivation, getNextFollowup, relativeDay, TYPE_META } from '../business';
import { GradeBadge, Modal, PartnerAvatar, ScoreRing, StatusBadge } from '../components/UI';
import PartnerOpportunities from '../components/PartnerOpportunities';
import ContactList from '../components/ContactList';
import type { Partner, ScoreSet } from '../types';

const steps = ['未接触', '已接触', '已深聊', '已谈合作框架', '已签约', '已激活'];
const nextStatus: Record<string, Partner['status']> = { '未接触': '已接触', '已接触': '已深聊', '已深聊': '已谈合作框架', '已谈合作框架': '已签约' };
const channelIcons = { '电话': Phone, '微信': MessageSquarePlus, '上门': Building2, '会场': UsersRound };

export default function PartnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { partners, opportunities, contacts, loading, openPartnerForm, openFollowup, openContactForm, updatePartner, deletePartner, toast } = useApp();
  const [tab, setTab] = useState<'overview' | 'assessment' | 'followups' | 'opportunities' | 'contacts'>('overview');
  const [statusModal, setStatusModal] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [signDate, setSignDate] = useState(dateAtOffset(0));
  const [advancing, setAdvancing] = useState(false);
  const partner = partners.find((item) => item.id === id);

  useEffect(() => { setTab('overview'); }, [id]);
  if (loading) return <div className="page-loading"><span className="loader" /><p>正在打开伙伴档案…</p></div>;
  if (!partner) return <div className="not-found"><Building2 size={36} /><h2>没有找到这家伙伴</h2><p>档案可能已被删除，或链接已失效。</p><button className="button button-primary" onClick={() => navigate('/partners')}>返回伙伴列表</button></div>;

  const score = calculateScore(partner.scores);
  const activation = getActivation(partner);
  const next = getNextFollowup(partner);
  const currentStep = partner.status === '已暂停' ? -1 : steps.indexOf(partner.status);
  const primaryContact = contacts.find((contact) => contact.partnerId === partner.id && contact.isPrimary);
  const decisionContact = contacts.find((contact) => contact.partnerId === partner.id && contact.role === '决策人' && contact.employmentStatus === '在职');
  const currentContacts = contacts.filter((contact) => contact.partnerId === partner.id);
  const relatedContacts = contacts.filter((contact) => contact.partnerId === partner.id || contact.careers.some((career) => career.partnerId === partner.id));

  async function advance() {
    if (!partner) return;
    if (partner.status === '已签约') { openFollowup(partner); return; }
    if (partner.status === '已暂停') {
      await updatePartner(partner.id, { status: '已接触' }); toast('已恢复跟进', '伙伴回到已接触阶段'); return;
    }
    const target = nextStatus[partner.status];
    if (!target) return;
    if (target === '已签约') { setSignDate(partner.signDate || dateAtOffset(0)); setStatusModal(true); return; }
    setAdvancing(true);
    try { await updatePartner(partner.id, { status: target }); toast('接触状态已更新', `${partner.name} → ${target}`); }
    catch (error) { toast('状态更新失败', error instanceof Error ? error.message : undefined, 'error'); }
    finally { setAdvancing(false); }
  }

  async function confirmSign() {
    if (!partner) return;
    setAdvancing(true);
    try { await updatePartner(partner.id, { status: '已签约', signDate }); toast('已记录签约', `${TYPE_META[partner.type].name}激活倒计时已启动`); setStatusModal(false); }
    catch (error) { toast('保存失败', error instanceof Error ? error.message : undefined, 'error'); }
    finally { setAdvancing(false); }
  }

  async function confirmPause() {
    if (!partner) return;
    await updatePartner(partner.id, { status: '已暂停' });
    toast('已暂停该伙伴', '激活预警已停止，可随时恢复跟进', 'info');
  }

  async function removePartner() {
    if (!partner || !window.confirm(`确定删除「${partner.name}」吗？其评分与跟进记录也会一并删除，此操作不可撤销。`)) return;
    await deletePartner(partner.id);
    toast('伙伴档案已删除', partner.name, 'info');
    navigate('/partners');
  }

  return <div className="detail-page page-enter">
    <button className="back-link" onClick={() => navigate('/partners')}><ArrowLeft size={16} />返回伙伴列表</button>
    <section className="detail-header-panel">
      <div className="detail-header-main"><PartnerAvatar name={partner.name} size="large" /><div className="detail-title"><div><h1>{partner.name}</h1><GradeBadge grade={score.grade} showLabel /></div><p><span style={{ color: TYPE_META[partner.type].color }}>{TYPE_META[partner.type].name}</span><i />{partner.region || '区域待核验'}<i />{partner.batch}</p></div><div className="detail-actions"><button className="button button-secondary" onClick={() => openPartnerForm(partner)}><Edit3 size={16} />编辑档案</button><button className="button button-secondary" onClick={() => openFollowup(partner)}><MessageSquarePlus size={16} />记跟进</button><button className="button button-primary" onClick={advance} disabled={advancing || partner.status === '已激活'}>{advancing ? <LoaderCircle size={16} className="spin" /> : partner.status === '已签约' ? <BadgeCheck size={16} /> : partner.status === '已暂停' ? <RotateCcw size={16} /> : <ArrowRight size={16} />}{partner.status === '已签约' ? '记录激活动作' : partner.status === '已暂停' ? '恢复跟进' : partner.status === '已激活' ? '已完成激活' : `推进到${nextStatus[partner.status]}`}</button><div className="detail-more"><button className="icon-button detail-more-trigger" aria-label="更多操作" onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={18} /></button>{moreOpen && <><button className="popover-dismiss" onClick={() => setMoreOpen(false)} /><div className="detail-more-menu">{partner.status !== '已暂停' && partner.status !== '已激活' && <button onClick={() => { setMoreOpen(false); void confirmPause(); }}><PauseCircle size={15} />暂停伙伴</button>}<button className="delete-action" onClick={() => { setMoreOpen(false); void removePartner(); }}><Trash2 size={15} />删除档案</button></div></>}</div></div></div>
      <div className="status-stepper">{steps.map((step, index) => <div key={step} className={`${index < currentStep ? 'done' : ''} ${index === currentStep ? 'current' : ''}`}><span>{index < currentStep ? <Check size={13} /> : index + 1}</span><b>{step}</b>{index < steps.length - 1 && <i />}</div>)}{partner.status === '已暂停' && <span className="paused-indicator"><PauseCircle size={15} />当前已暂停</span>}</div>
    </section>

    <nav className="detail-tabs"><button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>伙伴概览</button><button className={tab === 'assessment' ? 'active' : ''} onClick={() => setTab('assessment')}>评估打分{score.completed < 6 && <em>{6 - score.completed}</em>}</button><button className={tab === 'followups' ? 'active' : ''} onClick={() => setTab('followups')}>跟进记录<span>{partner.followUps.length}</span></button><button className={tab === 'opportunities' ? 'active' : ''} onClick={() => setTab('opportunities')}>线索与商机<span>{opportunities.filter((item) => item.partnerId === partner.id).length}</span></button><button className={tab === 'contacts' ? 'active' : ''} onClick={() => setTab('contacts')}>联系人<span>{relatedContacts.length}</span></button></nav>

    {tab === 'overview' && <div className="detail-content-grid">
      <div className="detail-main-column">
        <section className="panel detail-info-card"><header className="panel-header"><div><h2>伙伴画像</h2><p>业务匹配与合作切入点</p></div><button className="icon-button" onClick={() => openPartnerForm(partner)}><Edit3 size={16} /></button></header><div className="business-description">{partner.businessDesc || '尚未补充主营业务与客户画像，点击编辑档案完善。'}</div><div className="info-grid"><InfoItem icon={<Building2 size={16} />} label="团队规模" value={partner.scale} /><InfoItem icon={<UserRound size={16} />} label="决策人" value={partner.decisionMaker || decisionContact?.name} /><InfoItem icon={<Phone size={16} />} label="联系方式" value={partner.contact || primaryContact?.phone || primaryContact?.wechat} /><InfoItem icon={<ShieldCheck size={16} />} label="核验状态" value={partner.verifyStatus} /><InfoItem icon={<Link2 size={16} />} label="信息来源" value={partner.sourceName} link={partner.sourceUrl} /><InfoItem icon={<Clock3 size={16} />} label="联系优先级" value={partner.priorityOrder <= 10 ? `第 ${partner.priorityOrder} 顺位 · 首批联系` : partner.priorityOrder === 999 ? '暂未设置' : `第 ${partner.priorityOrder} 顺位`} /></div>{partner.verifyNote && <div className="verify-note"><CircleAlert size={16} /><div><strong>核验更正说明</strong><p>{partner.verifyNote}</p></div></div>}{partner.note && <div className="partner-note"><FileText size={16} /><div><strong>合作备注</strong><p>{partner.note}</p></div></div>}</section>
        <section className="panel recent-timeline-card"><header className="panel-header"><div><h2>最近跟进</h2><p>关键沟通与合作进展</p></div><button className="text-button" onClick={() => setTab('followups')}>全部记录<ChevronRight size={15} /></button></header><Timeline partner={partner} limit={3} /></section>
      </div>
      <aside className="detail-side-column">
        <section className="panel evaluation-snapshot"><header><h2>综合评估</h2><button className="text-button" onClick={() => setTab('assessment')}>{score.total === null ? '开始评估' : '调整评分'}<ChevronRight size={14} /></button></header><div className="snapshot-score"><ScoreRing value={score.total} grade={score.grade} /><div><GradeBadge grade={score.grade} showLabel /><p>{score.total === null ? `还需完成 ${6 - score.completed} 个维度` : score.capped ? '受客户重叠度规则限制' : '六维评分已完成'}</p></div></div><div className="dimension-mini-list">{DIMENSIONS.map((dimension) => <div key={dimension.key}><span>{dimension.name}<small>{Math.round(dimension.weight * 100)}%</small></span><div>{[1, 2, 3, 4, 5].map((value) => <i key={value} className={value <= (partner.scores[dimension.key] || 0) ? 'filled' : ''} />)}</div><b>{partner.scores[dimension.key] || '—'}</b></div>)}</div>{score.capped && <div className="cap-note"><CircleAlert size={14} />客户重叠度低于 3 分，等级最高为 B</div>}</section>
        {['已签约', '已激活', '已暂停'].includes(partner.status) && <section className={`panel activation-card activation-card-${activation.kind}`}><header><span><BadgeCheck size={18} />激活健康度</span><StatusBadge status={partner.status} /></header>{partner.status === '已激活' ? <div className="activated-message"><CheckCircle2 size={32} /><strong>伙伴已成功激活</strong><p>已产生实际合作动作，继续保持联合跟进。</p></div> : partner.status === '已暂停' ? <div className="activated-message"><PauseCircle size={32} /><strong>伙伴已暂停</strong><p>激活预警已停止，恢复跟进后可重新安排。</p></div> : <><div className="activation-countdown"><strong>{activation.days !== null ? Math.abs(activation.days) : '∞'}</strong><span>{activation.kind === 'overdue' ? '天已逾期' : activation.kind === 'unlimited' ? '不限激活期' : '天后到期'}</span></div><p>{activation.deadline ? `激活截止：${formatDate(activation.deadline, true)}` : '专家型伙伴采用转介绍模式，不限激活期'}</p><div className="activation-progress"><i style={{ width: activation.kind === 'overdue' ? '100%' : activation.days !== null && TYPE_META[partner.type].activationDays ? `${Math.max(0, Math.min(100, (1 - activation.days / TYPE_META[partner.type].activationDays!) * 100))}%` : '0%' }} /></div>{activation.kind === 'overdue' && <button className="button button-danger-soft" onClick={confirmPause}><PauseCircle size={15} />确认暂停该伙伴</button>}</>}</section>}
        <section className="panel next-action-card"><span className="next-action-icon"><CalendarClock size={19} /></span><div><span>下一次跟进</span><strong>{next ? relativeDay(next) : '还没有安排'}</strong><p>{next ? formatDate(next, true) : '记录跟进时设置下一步计划'}</p></div><button onClick={() => openFollowup(partner)}><ArrowRight size={16} /></button></section>
      </aside>
    </div>}

    {tab === 'assessment' && <Assessment partner={partner} />}
    {tab === 'contacts' && <section className="panel partner-contacts-panel"><header className="panel-header"><div><h2>伙伴联系人</h2><p>维护多位对接人、合作角色与连续任职履历</p></div><button className="button button-primary" onClick={() => openContactForm({ partnerId: partner.id })}><UserRound size={16} />新增联系人</button></header><div className="partner-contact-summary"><span>当前 <b>{currentContacts.length}</b> 位联系人</span><span>首要联系人：<b>{currentContacts.find((item) => item.isPrimary)?.name || '未设置'}</b></span><span>决策人：<b>{currentContacts.filter((item) => item.role === '决策人').length}</b> 位</span><span>历史任职：<b>{relatedContacts.length - currentContacts.length}</b> 位</span></div><ContactList contacts={relatedContacts} showPartner={false} contextPartnerId={partner.id} onAdd={() => openContactForm({ partnerId: partner.id })} /></section>}
    {tab === 'opportunities' && <PartnerOpportunities partner={partner} />}
    {tab === 'followups' && <section className="panel full-timeline-panel"><header className="panel-header"><div><h2>跟进时间线</h2><p>共 {partner.followUps.length} 条记录，最新进展排在前面</p></div><button className="button button-primary" onClick={() => openFollowup(partner)}><MessageSquarePlus size={16} />记录跟进</button></header><Timeline partner={partner} /></section>}

    {statusModal && <Modal title="确认伙伴已签约" subtitle="签约后，系统将自动启动激活倒计时" onClose={() => setStatusModal(false)} width="small" footer={<><button className="button button-ghost" onClick={() => setStatusModal(false)}>取消</button><button className="button button-primary" onClick={confirmSign} disabled={advancing}>确认签约并启动倒计时</button></>}><div className="sign-modal-content"><div className="sign-partner"><PartnerAvatar name={partner.name} /><div><strong>{partner.name}</strong><span>{TYPE_META[partner.type].name} · 激活线 {TYPE_META[partner.type].activationDays ?? '不限'} 天</span></div></div><label className="field"><span>签约日期 <em>*</em></span><input type="date" value={signDate} max={dateAtOffset(0)} onChange={(e) => setSignDate(e.target.value)} /></label><div className="activation-notice"><CalendarClock size={18} /><div><strong>激活截止日期：{signDate ? formatDate(dateAtOffset(TYPE_META[partner.type].activationDays || 0, new Date(`${signDate}T00:00:00`)), true) : '—'}</strong><p>到期前 14 天将进入预警；录入激活动作后自动解除。</p></div></div></div></Modal>}
  </div>;
}

function InfoItem({ icon, label, value, link }: { icon: React.ReactNode; label: string; value?: string; link?: string }) {
  return <div className="info-item"><span>{icon}{label}</span><strong>{value || '待补充'}{link && <a href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink size={13} /></a>}</strong></div>;
}

function Timeline({ partner, limit }: { partner: Partner; limit?: number }) {
  const { contacts } = useApp();
  const records = limit ? partner.followUps.slice(0, limit) : partner.followUps;
  if (!records.length) return <div className="timeline-empty"><Clock3 size={26} /><strong>还没有跟进记录</strong><p>完成首次接触后，记得留下沟通进展。</p></div>;
  return <div className="timeline">{records.map((record) => { const Icon = channelIcons[record.channel]; return <article className="timeline-item" key={record.id}><div className="timeline-date"><strong>{formatDate(record.date)}</strong><span>{record.date.slice(0, 4)}</span></div><div className="timeline-marker"><i /><span /></div><div className="timeline-content"><div className="timeline-meta"><span><Icon size={13} />{record.channel}</span>{record.contactId && <span className="timeline-contact"><UserRound size={13} />{contacts.find((contact) => contact.id === record.contactId)?.name || '历史联系人'}</span>}{record.tags.map((tag) => <em key={tag} className={tag !== '普通' ? 'activation-tag' : ''}>{tag}</em>)}</div><p>{record.summary}</p>{record.nextFollowupDate && <small><CalendarClock size={13} />下次跟进：{formatDate(record.nextFollowupDate, true)}</small>}</div></article>; })}</div>;
}

function Assessment({ partner }: { partner: Partner }) {
  const { saveScores, toast } = useApp();
  const [scores, setScores] = useState<ScoreSet>({ ...partner.scores });
  const [saving, setSaving] = useState(false);
  const result = calculateScore(scores);
  async function save() {
    setSaving(true);
    try { await saveScores(partner.id, scores); toast('评估结果已保存', result.total !== null ? `加权总分 ${result.total.toFixed(2)} · ${result.grade} 类` : `已完成 ${result.completed}/6 个维度`); }
    catch (error) { toast('保存失败', error instanceof Error ? error.message : undefined, 'error'); }
    finally { setSaving(false); }
  }
  return <div className="assessment-layout"><section className="panel assessment-form-panel"><header className="panel-header"><div><h2>六维伙伴评估</h2><p>结合实际沟通与行为证据打分，1 分最弱，5 分最强</p></div><span className="assessment-progress">已完成 {result.completed}/6</span></header><div className="assessment-dimensions">{DIMENSIONS.map((dimension, index) => {
    const selected = scores[dimension.key];
    const anchor = selected ? selected <= 2 ? dimension.anchors[1] : selected >= 4 ? dimension.anchors[5] : dimension.anchors[3] : '请选择最符合实际情况的分数';
    return <article className={`assessment-dimension ${selected ? 'has-score' : ''}`} key={dimension.key}><div className="dimension-heading"><span>{index + 1}</span><div><h3>{dimension.name}</h3><p>权重 {Math.round(dimension.weight * 100)}%</p></div>{selected && <b>{selected}<small> 分</small></b>}</div><div className="score-selector">{[1, 2, 3, 4, 5].map((value) => <button key={value} className={selected === value ? 'selected' : ''} onClick={() => setScores((current) => ({ ...current, [dimension.key]: value }))}>{value}<span>{['很弱', '偏弱', '一般', '较强', '很强'][value - 1]}</span></button>)}</div><p className="score-anchor"><Sparkles size={13} />{anchor}</p>{dimension.key === 'overlap' && selected !== undefined && selected < 3 && <div className="veto-notice"><CircleAlert size={15} />触发一票否决：即使总分达到 4.2，最高也只能评为 B 类</div>}</article>;
  })}</div></section><aside className="assessment-side"><section className="panel assessment-result"><span className="result-eyebrow">实时评估结果</span><ScoreRing value={result.total} grade={result.grade} size={136} /><GradeBadge grade={result.grade} showLabel />{result.total === null ? <p>完成全部六个维度后，将自动生成加权总分与分级。</p> : <div className="result-formula"><span>加权总分</span><strong>{result.total.toFixed(2)}<small>/ 5.00</small></strong></div>}{result.capped && <div className="cap-note"><CircleAlert size={14} />已应用客户重叠度一票否决</div>}<div className="grade-rules"><div><i className="grade-dot-a" /><span>A 类 · 重点推进</span><b>≥ 4.20</b></div><div><i className="grade-dot-b" /><span>B 类 · 持续跟进</span><b>≥ 3.50</b></div><div><i className="grade-dot-c" /><span>C 类 · 观察</span><b>&lt; 3.50</b></div></div><button className="button button-primary button-full" onClick={save} disabled={saving}>{saving && <LoaderCircle size={16} className="spin" />}保存评估结果</button><small className="result-save-note">评分结果会同步到列表与数据看板</small></section></aside></div>;
}
