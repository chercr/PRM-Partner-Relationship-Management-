import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, BriefcaseBusiness, Building2, ChevronDown, CircleAlert, Edit3, History, Mail, MessageCircle, Phone, Star, Trash2, UserRound, UsersRound } from 'lucide-react';
import { useApp } from '../store';
import type { Contact } from '../types';
import { EmptyState, PartnerAvatar } from './UI';

export default function ContactList({ contacts, showPartner = true, contextPartnerId, onAdd }: { contacts: Contact[]; showPartner?: boolean; contextPartnerId?: string; onAdd?: () => void }) {
  const { partners, opportunities, openContactForm, openContactMove, deleteContact, toast } = useApp();
  const [expandedId, setExpandedId] = useState('');
  const navigate = useNavigate();
  const partnerMap = new Map(partners.map((partner) => [partner.id, partner]));
  if (!contacts.length) return <EmptyState icon={<UsersRound size={32} />} title="还没有联系人" description="为伙伴添加决策人、商务、售前或交付对接人。" action={onAdd && <button className="button button-primary" onClick={onAdd}>新增联系人</button>} />;

  async function remove(contact: Contact) {
    if (!window.confirm(`确定删除联系人「${contact.name}」吗？历史跟进与商机将保留，但会解除与此人的关联。`)) return;
    await deleteContact(contact.id);
    toast('联系人已删除', contact.name, 'info');
  }

  return <div className="contact-list">{contacts.map((contact) => {
    const partner = partnerMap.get(contact.partnerId);
    const followupCount = partners.reduce((sum, item) => sum + item.followUps.filter((followup) => followup.contactId === contact.id).length, 0);
    const outputCount = opportunities.filter((item) => item.sourceContactId === contact.id).length;
    const expanded = expandedId === contact.id;
    const isRisk = contact.employmentStatus === '已离职' && (contact.role === '决策人' || contact.careers.some((career) => !career.endDate));
    return <article className={`contact-record ${expanded ? 'expanded' : ''}`} key={contact.id}>
      <div className="contact-record-main">
        <div className="contact-identity"><PartnerAvatar name={contact.name} /><div><div><strong>{contact.name}</strong>{contact.isPrimary && <span className="primary-contact"><Star size={11} fill="currentColor" />首要</span>}<span className="contact-role">{contact.role}</span>{contextPartnerId && contact.partnerId !== contextPartnerId && <span className="historical-contact"><History size={10} />历史任职</span>}</div><p>{contact.title || '职务待补充'}{contact.department ? ` · ${contact.department}` : ''}</p></div></div>
        {showPartner && <button className="contact-company" onClick={() => navigate(`/partners/${contact.partnerId}`)}><Building2 size={14} /><span>{partner?.name || '原伙伴已删除'}</span><ChevronDown size={12} /></button>}
        <div className="contact-methods">{contact.phone && <span title={contact.phone}><Phone size={13} />{contact.phone}</span>}{contact.wechat && <span title={`微信：${contact.wechat}`}><MessageCircle size={13} />{contact.wechat}</span>}{!contact.phone && !contact.wechat && <span className="contact-method-empty">联系方式待补充</span>}</div>
        <div className="contact-output"><span><History size={13} />{followupCount} 次跟进</span><span><BriefcaseBusiness size={13} />{outputCount} 条贡献</span></div>
        <span className={`employment-status employment-${contact.employmentStatus === '在职' ? 'active' : contact.employmentStatus === '已离职' ? 'left' : 'unknown'}`}><i />{contact.employmentStatus}</span>
        <div className="contact-actions"><button className="table-action" title="编辑联系人" onClick={() => openContactForm({ contact })}><Edit3 size={16} /></button><button className="table-action" title="离职或任职变动" onClick={() => openContactMove(contact)}><ArrowRightLeft size={16} /></button><button className="table-action" title="删除联系人" onClick={() => remove(contact)}><Trash2 size={15} /></button><button className="table-action" title="查看任职履历" onClick={() => setExpandedId(expanded ? '' : contact.id)}><ChevronDown size={17} className={expanded ? 'rotate-180' : ''} /></button></div>
      </div>
      {expanded && <div className="contact-career-panel">
        {contact.employmentStatus === '已离职' && <div className="contact-risk-note"><CircleAlert size={16} /><span>此人已离开当前记录中的伙伴。历史沟通仍保留，可通过「任职变动」记录新去向。</span></div>}
        {contact.notes && <div className="contact-notes"><strong>合作备注</strong><p>{contact.notes}</p></div>}
        {(contact.email || contact.phone || contact.wechat) && <div className="contact-full-methods">{contact.phone && <span><Phone size={14} />{contact.phone}</span>}{contact.wechat && <span><MessageCircle size={14} />微信：{contact.wechat}</span>}{contact.email && <span><Mail size={14} />{contact.email}</span>}</div>}
        <div className="career-history"><h4><History size={15} />任职履历</h4>{contact.careers.map((career) => <div className="career-item" key={career.id}><span className={`career-dot ${!career.endDate ? 'current' : ''}`} /><div><strong>{partnerMap.get(career.partnerId)?.name || '历史伙伴'} · {career.title || '职务未记录'}</strong><p>{career.startDate || '时间未知'} — {career.endDate || '至今'}</p>{career.note && <small>{career.note}</small>}</div>{!career.endDate && <span className="current-career">当前任职</span>}</div>)}</div>
      </div>}
    </article>;
  })}</div>;
}
