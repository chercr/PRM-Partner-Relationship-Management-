import { useState } from 'react';
import { BriefcaseBusiness, ContactRound, LoaderCircle, Mail, Phone, UserRound } from 'lucide-react';
import { Modal, Toggle } from './UI';
import { useApp, type ContactFormOptions } from '../store';
import { dateAtOffset } from '../business';
import type { ContactDraft, ContactRole, EmploymentStatus } from '../types';

const roles: ContactRole[] = ['决策人', '商务对接', '售前', '交付', '普通联系人'];

export default function ContactForm({ options, onClose }: { options: ContactFormOptions; onClose: () => void }) {
  const { partners, createContact, updateContact, toast } = useApp();
  const existing = options.contact;
  const [draft, setDraft] = useState<ContactDraft>(existing ? {
    partnerId: existing.partnerId, name: existing.name, title: existing.title, department: existing.department,
    phone: existing.phone, wechat: existing.wechat, email: existing.email, role: existing.role,
    isPrimary: existing.isPrimary, employmentStatus: existing.employmentStatus, notes: existing.notes,
  } : {
    partnerId: options.partnerId || partners[0]?.id || '', name: '', title: '', department: '', phone: '', wechat: '', email: '',
    role: '商务对接', isPrimary: false, employmentStatus: '在职', notes: '', startDate: dateAtOffset(0),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.partnerId || !draft.name.trim()) { setError('请选择所属伙伴并填写联系人姓名'); return; }
    setSaving(true); setError('');
    try {
      if (existing) await updateContact(existing.id, draft);
      else await createContact(draft);
      toast(existing ? '联系人档案已更新' : '联系人已添加', `${draft.name} · ${draft.title || draft.role}`);
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  }

  return <Modal title={existing ? '编辑联系人' : '新增联系人'} subtitle={existing ? '更新合作角色与联系方式，任职公司变更请使用「任职变动」' : '记录合作中的具体对接人，一个伙伴可添加多位联系人'} onClose={onClose} width="large" footer={<><button className="button button-ghost" onClick={onClose}>取消</button><button className="button button-primary" form="contact-form" disabled={saving}>{saving && <LoaderCircle size={16} className="spin" />}保存联系人</button></>}>
    <form id="contact-form" className="contact-form" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <section className="form-section"><h3><UserRound size={17} />身份与合作角色</h3><div className="form-grid form-grid-3">
        <label className="field"><span>姓名 <em>*</em></span><input autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="联系人姓名" /></label>
        <label className="field"><span>当前职务</span><input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="例如：渠道总监" /></label>
        <label className="field"><span>部门</span><input value={draft.department} onChange={(e) => set('department', e.target.value)} placeholder="例如：生态合作部" /></label>
        <label className="field"><span>所属伙伴 <em>*</em></span><select value={draft.partnerId} disabled={Boolean(existing)} onChange={(e) => set('partnerId', e.target.value)}>{partners.map((partner) => <option value={partner.id} key={partner.id}>{partner.name}</option>)}</select></label>
        <label className="field"><span>合作角色</span><select value={draft.role} onChange={(e) => set('role', e.target.value as ContactRole)}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
        <label className="field"><span>在职状态</span><select value={draft.employmentStatus} onChange={(e) => { const status = e.target.value as EmploymentStatus; set('employmentStatus', status); if (status === '已离职') set('isPrimary', false); }}><option>在职</option><option>待确认</option><option>已离职</option></select></label>
        {!existing && <label className="field"><span>本段任职开始日期</span><input type="date" value={draft.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>}
      </div></section>
      <section className="form-section"><h3><ContactRound size={17} />联系方式</h3><div className="form-grid form-grid-3">
        <label className="field"><span><Phone size={14} />手机</span><input value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="选填" /></label>
        <label className="field"><span>微信</span><input value={draft.wechat} onChange={(e) => set('wechat', e.target.value)} placeholder="选填" /></label>
        <label className="field"><span><Mail size={14} />邮箱</span><input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} placeholder="选填" /></label>
      </div></section>
      <section className="form-section"><h3><BriefcaseBusiness size={17} />合作备注</h3><label className="field"><textarea rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} placeholder="他的关注点、沟通偏好、决策影响力，以及需要记住的合作信息…" /></label><div className="primary-contact-setting"><Toggle checked={draft.isPrimary} onChange={(value) => set('isPrimary', value)} label="设为该伙伴的首要联系人" /><small>每个伙伴只保留一位首要联系人；离职联系人不能设为首要联系人。</small></div></section>
    </form>
  </Modal>;
}
