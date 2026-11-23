import { useState } from 'react';
import { BadgeCheck, Check, KeyRound, LoaderCircle, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../store';
import { api } from '../api';
import type { ProfileDraft } from '../types';

const colors = ['#6c63d9', '#278e74', '#367ab5', '#bd771d', '#a4516b', '#4c6a86'];

export default function Profile() {
  const { user, saveProfile, toast } = useApp();
  const [draft, setDraft] = useState<ProfileDraft>({ displayName: user?.displayName || '', email: user?.email || '', title: user?.title || '', phone: user?.phone || '', bio: user?.bio || '', avatarColor: user?.avatarColor || colors[0] });
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState('');
  if (!user) return null;
  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.displayName.trim()) { setError('姓名不能为空'); return; }
    setSaving(true); setError('');
    try { await saveProfile(draft); toast('个人资料已更新', '你的姓名和头像偏好已同步到当前账号'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  }
  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirm) { setError('两次输入的新密码不一致'); return; }
    setPasswordSaving(true); setError('');
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
      toast('登录密码已修改', '其他设备的登录会话已退出');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '修改失败'); }
    finally { setPasswordSaving(false); }
  }

  return <div className="profile-page page-enter">
    <div className="page-heading"><div><div className="eyebrow"><span />PERSONAL PROFILE</div><h1>个人中心</h1><p>管理你的个人资料、头像风格和登录密码。</p></div></div>
    <div className="profile-layout">
      <aside className="profile-side"><section className="panel profile-card"><div className="profile-avatar" style={{ background: draft.avatarColor }}>{draft.displayName.slice(0, 1) || '用'}</div><h2>{draft.displayName || '未设置姓名'}</h2><p>{draft.title || (user.role === 'admin' ? '管理员' : '成员')}</p><span className={`role-pill ${user.role}`}>{user.role === 'admin' ? <ShieldCheck size={14} /> : <UserRound size={14} />}{user.role === 'admin' ? '管理员' : '普通成员'}</span><div className="profile-account-meta"><div><span>登录账号</span><strong>{user.username}</strong></div><div><span>注册时间</span><strong>{user.createdAt.slice(0, 10)}</strong></div><div><span>最近登录</span><strong>{user.lastLoginAt?.slice(0, 10) || '—'}</strong></div></div><div className="profile-data-note"><BadgeCheck size={15} />单租户工作区成员</div></section></aside>
      <div className="profile-main">
        <section className="panel profile-section"><header><UserRound size={19} /><div><h2>个人信息</h2><p>这些信息用于当前工作区内的成员识别</p></div></header>{error && <div className="form-error">{error}</div>}<form onSubmit={submit} className="profile-form"><div className="form-grid"><label className="field"><span>姓名 / 显示名称 <em>*</em></span><input value={draft.displayName} onChange={(e) => set('displayName', e.target.value)} /></label><label className="field"><span>职务 / 角色说明</span><input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="例如：渠道负责人" /></label><label className="field"><span><Mail size={14} />邮箱</span><input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.com" /></label><label className="field"><span><Phone size={14} />联系电话</span><input value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="选填" /></label></div><label className="field"><span>个人说明</span><textarea rows={4} value={draft.bio} onChange={(e) => set('bio', e.target.value)} placeholder="负责的业务方向、擅长的合作领域或其他介绍…" /></label><div className="field"><span>头像颜色</span><div className="avatar-color-options">{colors.map((color) => <button type="button" key={color} className={draft.avatarColor === color ? 'selected' : ''} style={{ background: color }} aria-label={`选择头像颜色 ${color}`} onClick={() => set('avatarColor', color)}>{draft.avatarColor === color && <Check size={16} />}</button>)}</div></div><button className="button button-primary" disabled={saving}>{saving && <LoaderCircle size={16} className="spin" />}保存个人资料</button></form></section>
        <section className="panel profile-section"><header><KeyRound size={19} /><div><h2>修改登录密码</h2><p>新密码至少 8 位，并同时包含字母和数字</p></div></header><form onSubmit={submitPassword} className="profile-form"><div className="form-grid form-grid-3"><label className="field"><span>当前密码</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label><label className="field"><span>新密码</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label><label className="field"><span>确认新密码</span><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label></div><button className="button button-secondary" disabled={passwordSaving}>{passwordSaving && <LoaderCircle size={16} className="spin" />}修改密码</button></form></section>
      </div>
    </div>
  </div>;
}
