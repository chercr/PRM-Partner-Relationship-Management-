import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CircleAlert, LoaderCircle, LogOut, UserRound } from 'lucide-react';
import { Modal, PartnerAvatar } from './UI';
import { useApp } from '../store';
import { dateAtOffset } from '../business';
import type { Contact } from '../types';

export default function ContactMoveForm({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const { partners, updateContact, moveContact, toast } = useApp();
  const [mode, setMode] = useState<'leave' | 'move'>(contact.employmentStatus === '已离职' ? 'move' : 'leave');
  const currentPartner = partners.find((partner) => partner.id === contact.partnerId);
  const [newPartnerId, setNewPartnerId] = useState(partners.find((partner) => partner.id !== contact.partnerId)?.id || '');
  const [title, setTitle] = useState(contact.title);
  const [date, setDate] = useState(dateAtOffset(0));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      if (mode === 'leave') {
        await updateContact(contact.id, { employmentStatus: '已离职', isPrimary: false, startDate: date, notes: note ? `${contact.notes}${contact.notes ? '\n' : ''}${date} 离职：${note}` : contact.notes });
        toast('已记录离职', `${contact.name} 的历史履历与合作记录已保留`, 'info');
      } else {
        await moveContact(contact.id, { newPartnerId, title, startDate: date, note });
        const nextPartner = partners.find((partner) => partner.id === newPartnerId);
        toast('任职变动已保存', `${contact.name}：${currentPartner?.name || '原伙伴'} → ${nextPartner?.name || '新伙伴'}`);
      }
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  }

  return <Modal title="联系人任职变动" subtitle="保留同一个人的历史履历、沟通记录与贡献关系" onClose={onClose} width="medium" footer={<><button className="button button-ghost" onClick={onClose}>取消</button><button className="button button-primary" form="contact-move-form" disabled={saving}>{saving && <LoaderCircle size={16} className="spin" />}确认{mode === 'leave' ? '离职' : '任职变动'}</button></>}>
    <form id="contact-move-form" className="contact-move-form" onSubmit={submit}>
      <div className="contact-move-person"><PartnerAvatar name={contact.name} /><div><strong>{contact.name}</strong><span>{currentPartner?.name} · {contact.title || contact.role}</span></div><span className={`employment-status employment-${contact.employmentStatus === '在职' ? 'active' : 'left'}`}>{contact.employmentStatus}</span></div>
      {error && <div className="form-error">{error}</div>}
      <div className="record-type-switch"><button type="button" className={mode === 'leave' ? 'active' : ''} onClick={() => setMode('leave')}><LogOut size={17} /><span><b>从当前伙伴离职</b><small>结束本段任职履历</small></span></button><button type="button" className={mode === 'move' ? 'active' : ''} onClick={() => setMode('move')}><BriefcaseBusiness size={17} /><span><b>加入其他伙伴</b><small>保留历史并新增任职</small></span></button></div>
      {mode === 'move' && <div className="move-fields"><label className="field"><span>新任职伙伴 <em>*</em></span><select value={newPartnerId} onChange={(e) => setNewPartnerId(e.target.value)}>{partners.filter((partner) => partner.id !== contact.partnerId).map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</select><small>如果新伙伴尚未建档，请先在伙伴管理中新增。</small></label><label className="field"><span>新职务</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：生态合作负责人" /></label></div>}
      <label className="field"><span>{mode === 'leave' ? '离职日期' : '新任职开始日期'} <em>*</em></span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="field"><span>变动说明</span><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === 'leave' ? '后续由谁承接、原合作关系是否受到影响…' : '新岗位职责、是否继续负责渠道合作…'} /></label>
      <div className="career-preservation-note"><CircleAlert size={17} /><div><strong>历史不会被覆盖</strong><p>原伙伴下的跟进、线索与商机仍保留此人关联；新伙伴可继续沿用同一份联系人档案。</p></div></div>
    </form>
  </Modal>;
}
