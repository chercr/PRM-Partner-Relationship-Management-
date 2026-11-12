import { useState } from 'react';
import { CalendarClock, CheckCircle2, LoaderCircle, MessageSquareText } from 'lucide-react';
import { Modal, PartnerAvatar } from './UI';
import { CHANNELS, dateAtOffset } from '../business';
import { useApp } from '../store';
import type { FollowUp, Partner } from '../types';

const tags = ['普通', '报备线索', '联合拜访', '方案写入'];

export default function FollowupForm({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const { addFollowup, contacts, toast } = useApp();
  const availableContacts = contacts.filter((contact) => contact.partnerId === partner.id && contact.employmentStatus === '在职');
  const [contactId, setContactId] = useState(availableContacts.find((contact) => contact.isPrimary)?.id || availableContacts[0]?.id || '');
  const [date, setDate] = useState(dateAtOffset(0));
  const [channel, setChannel] = useState<FollowUp['channel']>('微信');
  const [summary, setSummary] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['普通']);
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const activates = selectedTags.some((tag) => ['报备线索', '联合拜访', '方案写入'].includes(tag)) && ['已签约', '已暂停'].includes(partner.status);

  function toggleTag(tag: string) {
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      return tag === '普通' ? ['普通'] : [...current.filter((item) => item !== '普通'), tag];
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!summary.trim()) { setError('记录一点本次沟通的进展吧'); return; }
    setSaving(true); setError('');
    try {
      await addFollowup(partner.id, { date, channel, summary, tags: selectedTags.length ? selectedTags : ['普通'], nextFollowupDate: nextDate || undefined, contactId: contactId || undefined });
      toast(activates ? '跟进已保存，伙伴成功激活' : '跟进记录已保存', nextDate ? `下次跟进：${nextDate}` : partner.name);
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  }

  return <Modal title="记录一次跟进" subtitle="留下关键进展，让下一步清晰可见" onClose={onClose} width="medium" footer={<><button className="button button-ghost" onClick={onClose}>取消</button><button className="button button-primary" form="followup-form" disabled={saving}>{saving && <LoaderCircle size={16} className="spin" />}保存跟进记录</button></>}>
    <form id="followup-form" className="followup-form" onSubmit={submit}>
      <div className="followup-partner"><PartnerAvatar name={partner.name} /><div><strong>{partner.name}</strong><span>{partner.region || '区域待补充'} · {partner.status}</span></div></div>
      {error && <div className="form-error">{error}</div>}
      <div className="form-grid">
        <label className="field"><span>跟进时间 <em>*</em></span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label className="field"><span>沟通方式</span><select value={channel} onChange={(e) => setChannel(e.target.value as FollowUp['channel'])}>{CHANNELS.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label className="field"><span>本次对接人</span><select value={contactId} onChange={(e) => setContactId(e.target.value)}><option value="">暂不指定</option>{availableContacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.name} · {contact.title || contact.role}{contact.isPrimary ? '（首要）' : ''}</option>)}</select><small>{availableContacts.length ? '默认选择首要联系人，可按实际沟通对象调整' : '该伙伴尚未添加联系人，可在伙伴详情的联系人页签新增'}</small></label>
      <label className="field"><span>本次沟通内容 <em>*</em></span><textarea autoFocus rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="记录了什么关键信息？对方的反馈、顾虑与明确承诺…" /></label>
      <div className="field"><span>跟进标签</span><div className="tag-options">{tags.map((tag) => <button type="button" key={tag} className={selectedTags.includes(tag) ? 'selected' : ''} onClick={() => toggleTag(tag)}>{tag}</button>)}</div></div>
      {activates && <div className="activation-notice"><CheckCircle2 size={18} /><div><strong>这是一条激活动作</strong><p>保存后，该伙伴将自动转为「已激活」，签约倒计时与预警同步解除。</p></div></div>}
      <label className="field"><span><CalendarClock size={15} />下次跟进日期</span><input type="date" value={nextDate} min={dateAtOffset(0)} onChange={(e) => setNextDate(e.target.value)} /><small><MessageSquareText size={13} />设置后会在工作台与跟进日程中提醒你</small></label>
    </form>
  </Modal>;
}
