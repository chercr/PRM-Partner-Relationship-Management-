import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BadgeDollarSign, Bell, BookOpenText, CalendarCheck2, ChartNoAxesCombined, ChevronDown, CircleHelp, ContactRound, Download, LayoutDashboard, LogOut, Menu, Plus, Search, Settings2, Sparkles, Target, UsersRound, X } from 'lucide-react';
import { useApp } from '../store';
import { dateAtOffset, daysBetween, getActivation, getNextFollowup } from '../business';
import { exportPartnersCsv } from '../excel';

const navItems = [
  { path: '/', label: '工作台', icon: LayoutDashboard, end: true },
  { path: '/partners', label: '伙伴管理', icon: UsersRound },
  { path: '/contacts', label: '联系人管理', icon: ContactRound },
  { path: '/followups', label: '跟进日程', icon: CalendarCheck2 },
  { path: '/opportunities', label: '线索与商机', icon: BadgeDollarSign },
  { path: '/analytics', label: '数据看板', icon: ChartNoAxesCombined },
  { path: '/playbook', label: '渠道打法', icon: BookOpenText },
];

export default function Layout() {
  const { partners, user, openPartnerForm, openImport, toast, logout } = useApp();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); searchInput.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  const today = dateAtOffset(0);
  const reminderCount = useMemo(() => partners.filter((partner) => {
    const next = getNextFollowup(partner);
    const activation = getActivation(partner);
    return (next && daysBetween(today, next) <= 7) || ['warning', 'overdue'].includes(activation.kind);
  }).length, [partners, today]);
  const signed = partners.filter((partner) => partner.status === '已签约' || partner.status === '已激活').length;

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    navigate(`/partners?search=${encodeURIComponent(search)}`);
  }

  return <div className="app-shell">
    {mobileOpen && <button className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-label="关闭菜单" />}
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><svg viewBox="0 0 32 32"><path d="M8 9h12a4 4 0 0 1 0 8h-7a4 4 0 0 0 0 8h11" /><circle cx="8" cy="9" r="2" /><circle cx="24" cy="25" r="2" /></svg></span><div><strong>渠成</strong><span>CHANNEL OS</span></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <button className="workspace-switch" onClick={() => toast('当前为单租户工作区', '通用渠道工作区 · 管理员账号密码认证', 'info')}><span className="workspace-icon">C</span><span><b>渠道工作区</b><small>伙伴与商机管理</small></span><ChevronDown size={14} /></button>
      <nav className="main-nav">
        <span className="nav-caption">工作空间</span>
        {navItems.map((item) => <NavLink key={item.path} to={item.path} end={item.end} onClick={() => setMobileOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.path === '/followups' && reminderCount > 0 && <em>{reminderCount}</em>}</NavLink>)}
        <span className="nav-caption nav-caption-second">管理</span>
        <NavLink to="/settings" onClick={() => setMobileOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Settings2 size={18} strokeWidth={1.8} /><span>系统设置</span></NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="goal-card"><div className="goal-card-top"><span><Target size={15} />本月签约目标</span><b>{signed}/8</b></div><div className="goal-progress"><i style={{ width: `${Math.min(100, signed / 8 * 100)}%` }} /></div><p>保持节奏，向目标再进一步</p></div>
        <button className="help-link" onClick={() => toast('快速上手', '先导入候选名单，再完成六维评估；每次沟通后记得写跟进并设置下次日期。', 'info')}><CircleHelp size={17} /><span>使用帮助与反馈</span><span className="help-key">?</span></button>
        <div className="user-card"><span className="user-avatar">{user?.displayName.slice(0, 1) || '管'}<i /></span><div><b>{user?.displayName || '管理员'}</b><span>{user?.username || 'admin'} · 管理员</span></div><button className="user-logout" title="退出登录" onClick={() => { void logout(); }}><LogOut size={16} /></button></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
        <form className="global-search" onSubmit={submitSearch}><Search size={17} /><input ref={searchInput} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索伙伴、联系人…" aria-label="全局搜索" /><kbd>⌘ K</kbd></form>
        <div className="topbar-actions">
          <button className="icon-button notification-button" onClick={() => navigate('/followups')} aria-label="提醒"><Bell size={19} />{reminderCount > 0 && <i />}</button>
          <span className="topbar-divider" />
          <div className="quick-create">
            <button className="button button-primary top-add" onClick={() => setQuickOpen(!quickOpen)}><Plus size={17} />新建<ChevronDown size={14} /></button>
            {quickOpen && <><button className="popover-dismiss" onClick={() => setQuickOpen(false)} /><div className="quick-menu"><button onClick={() => { openPartnerForm(); setQuickOpen(false); }}><UsersRound size={17} /><span><b>新增伙伴</b><small>创建候选渠道档案</small></span></button><button onClick={() => { openImport(); setQuickOpen(false); }}><Download size={17} /><span><b>导入名单</b><small>从 Excel 批量导入</small></span></button><button onClick={() => { exportPartnersCsv(partners); setQuickOpen(false); }}><ChartNoAxesCombined size={17} /><span><b>导出报表</b><small>下载当前全部伙伴 CSV</small></span></button></div></>}
          </div>
        </div>
      </header>
      <main className="page-container" key={location.pathname}><Outlet /></main>
      <footer className="app-footer"><span><Sparkles size={13} />让每一次合作，都有迹可循</span><span>数据保存在本地工作区 · 每日自动备份</span></footer>
    </div>
  </div>;
}
