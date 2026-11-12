import { useMemo, useState } from 'react';
import { BriefcaseBusiness, Search, Star, UserPlus, UsersRound, UserX } from 'lucide-react';
import { useApp } from '../store';
import ContactList from '../components/ContactList';
import type { ContactRole, EmploymentStatus } from '../types';

export default function Contacts() {
  const { contacts, partners, loading, openContactForm } = useApp();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [partnerId, setPartnerId] = useState('all');
  const partnerMap = useMemo(() => new Map(partners.map((partner) => [partner.id, partner.name])), [partners]);
  const filtered = contacts.filter((contact) => {
    const query = search.trim().toLowerCase();
    return (!query || [contact.name, contact.title, contact.department, contact.phone, contact.wechat, partnerMap.get(contact.partnerId) || ''].some((value) => value.toLowerCase().includes(query)))
      && (status === 'all' || contact.employmentStatus === status)
      && (role === 'all' || contact.role === role)
      && (partnerId === 'all' || contact.partnerId === partnerId);
  });
  if (loading) return <div className="page-loading"><span className="loader" /><p>正在整理联系人档案…</p></div>;
  return <div className="contacts-page page-enter">
    <div className="page-heading"><div><div className="eyebrow"><span />RELATIONSHIP DIRECTORY</div><h1>联系人管理</h1><p>渠道合作不仅属于公司，也来自每一个真实、持续连接的人。</p></div><div className="heading-actions"><button className="button button-primary" onClick={() => openContactForm()}><UserPlus size={17} />新增联系人</button></div></div>
    <section className="contact-metrics"><article><span className="metric-icon metric-violet"><UsersRound size={20} /></span><div><p>联系人总数</p><strong>{contacts.length}<small>人</small></strong><span>覆盖 {new Set(contacts.map((item) => item.partnerId)).size} 家伙伴</span></div></article><article><span className="metric-icon metric-green"><BriefcaseBusiness size={20} /></span><div><p>当前在职</p><strong>{contacts.filter((item) => item.employmentStatus === '在职').length}<small>人</small></strong><span>保持正常业务连接</span></div></article><article><span className="metric-icon metric-orange"><Star size={20} /></span><div><p>首要联系人</p><strong>{contacts.filter((item) => item.isPrimary).length}<small>人</small></strong><span>每家伙伴一位主对接</span></div></article><article><span className="metric-icon metric-red"><UserX size={20} /></span><div><p>已离职联系人</p><strong>{contacts.filter((item) => item.employmentStatus === '已离职').length}<small>人</small></strong><span>保留履历并追踪新去向</span></div></article></section>
    <section className="panel contacts-directory"><div className="contacts-toolbar"><div className="table-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索姓名、职务、联系方式或伙伴" /></div><select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}><option value="all">全部伙伴</option>{partners.filter((partner) => contacts.some((contact) => contact.partnerId === partner.id)).map((partner) => <option value={partner.id} key={partner.id}>{partner.name}</option>)}</select><select value={role} onChange={(e) => setRole(e.target.value)}><option value="all">全部合作角色</option>{(['决策人', '商务对接', '售前', '交付', '普通联系人'] as ContactRole[]).map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">全部在职状态</option>{(['在职', '待确认', '已离职'] as EmploymentStatus[]).map((item) => <option key={item}>{item}</option>)}</select></div><div className="contact-list-meta"><span>共 <b>{filtered.length}</b> 位联系人</span><span>点击末尾箭头查看任职履历</span></div><ContactList contacts={filtered} onAdd={() => openContactForm()} /></section>
  </div>;
}
