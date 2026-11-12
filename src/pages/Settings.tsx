import { useState } from 'react';
import { Archive, BadgeCheck, Check, Database, Download, HardDrive, KeyRound, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck, Trash2, TriangleAlert, Type } from 'lucide-react';
import { useApp } from '../store';
import { api } from '../api';
import { DIMENSIONS, TYPE_META } from '../business';
import { exportPartnersCsv } from '../excel';
import { Modal } from '../components/UI';

export default function Settings() {
  const { partners, opportunities, contacts, user, fontSize, setFontSize, refresh, toast } = useApp();
  const [backingUp, setBackingUp] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  async function backup() {
    setBackingUp(true);
    try { const result = await api.backup(); toast('数据备份已完成', result.file); }
    catch (error) { toast('备份失败', error instanceof Error ? error.message : undefined, 'error'); }
    finally { setBackingUp(false); }
  }
  return <div className="settings-page page-enter">
    <div className="page-heading"><div><div className="eyebrow"><span />WORKSPACE SETTINGS</div><h1>系统设置</h1><p>管理界面偏好、账号安全、业务规则与本地数据。</p></div></div>
    <div className="settings-layout"><nav className="settings-nav"><button className="active" onClick={() => document.getElementById('interface-settings')?.scrollIntoView({ behavior: 'smooth' })}><Type size={17} />界面偏好</button><button onClick={() => document.getElementById('data-settings')?.scrollIntoView({ behavior: 'smooth' })}><Database size={17} />数据与备份</button><button onClick={() => document.getElementById('rule-settings')?.scrollIntoView({ behavior: 'smooth' })}><BadgeCheck size={17} />评估与激活规则</button><button onClick={() => document.getElementById('access-settings')?.scrollIntoView({ behavior: 'smooth' })}><LockKeyhole size={17} />访问与安全</button></nav><div className="settings-content">
      <section className="panel settings-section" id="interface-settings"><header><span className="settings-icon"><Type size={20} /></span><div><h2>界面字号</h2><p>根据阅读习惯调整文字大小，设置立即生效</p></div></header><div className="font-size-options"><button className={fontSize === 'standard' ? 'selected' : ''} onClick={() => setFontSize('standard')}><span className="font-preview standard">Aa</span><div><strong>标准字号</strong><small>清晰易读，适合日常办公</small></div>{fontSize === 'standard' && <Check size={17} />}</button><button className={fontSize === 'large' ? 'selected' : ''} onClick={() => setFontSize('large')}><span className="font-preview large">Aa</span><div><strong>大号字体</strong><small>进一步放大正文与表格文字</small></div>{fontSize === 'large' && <Check size={17} />}</button></div><p className="settings-footnote"><Check size={13} />偏好会自动保存在当前浏览器，下次打开继续使用</p></section>
      <section className="panel settings-section" id="data-settings"><header><span className="settings-icon"><HardDrive size={20} /></span><div><h2>本地数据</h2><p>所有业务数据保存在当前工作区的 SQLite 数据库中</p></div></header><div className="storage-stats"><div><span>伙伴档案</span><strong>{partners.length}</strong><small>条</small></div><div><span>跟进记录</span><strong>{partners.reduce((sum, p) => sum + p.followUps.length, 0)}</strong><small>条</small></div><div><span>线索与商机</span><strong>{opportunities.length}</strong><small>条</small></div><div><span>联系人</span><strong>{contacts.length}</strong><small>人</small></div><div><span>数据库引擎</span><strong className="engine-name">SQLite</strong></div></div><div className="settings-actions"><button className="button button-secondary" onClick={() => { exportPartnersCsv(partners); toast('完整数据已导出'); }}><Download size={16} />导出全部 CSV</button><button className="button button-primary" onClick={backup} disabled={backingUp}>{backingUp ? <LoaderCircle size={16} className="spin" /> : <Archive size={16} />}立即备份</button></div><p className="settings-footnote"><RefreshCw size={13} />系统运行期间每 24 小时自动备份至 data/backups 目录</p></section>
      <section className="panel settings-section" id="rule-settings"><header><span className="settings-icon"><BadgeCheck size={20} /></span><div><h2>评估规则</h2><p>遵循 V1.0 固定权重，总分与分级实时计算</p></div></header><div className="settings-weight-list">{DIMENSIONS.map((dimension) => <div key={dimension.key}><span>{dimension.name}</span><div><i style={{ width: `${dimension.weight * 100 * 3}%` }} /></div><b>{dimension.weight * 100}%</b></div>)}</div><div className="rule-notice"><ShieldCheck size={17} /><span>A 类 ≥ 4.20 · B 类 ≥ 3.50 · C 类 &lt; 3.50；客户重叠度 &lt; 3 分时最高为 B 类。</span></div></section>
      <section className="panel settings-section"><header><span className="settings-icon"><BadgeCheck size={20} /></span><div><h2>激活周期</h2><p>从签约日期开始计算，到期前 14 天自动预警</p></div></header><div className="activation-rule-grid">{Object.entries(TYPE_META).map(([key, meta]) => <div key={key}><span style={{ color: meta.color, background: meta.bg }}>{meta.short}</span><strong>{meta.activationDays ? `${meta.activationDays} 天` : '不限期'}</strong></div>)}</div></section>
      <section className="panel settings-section" id="access-settings"><header><span className="settings-icon"><LockKeyhole size={20} /></span><div><h2>访问与安全</h2><p>当前为单租户、单管理员账号的内部工作区</p></div></header><div className="access-mode"><div><strong>管理员账号：{user?.username}</strong><span>密码哈希存储 · HttpOnly 会话 · 登录失败频率限制</span></div><span className="badge badge-success"><Check size={13} />认证已启用</span></div><div className="settings-actions access-actions"><button className="button button-secondary" onClick={() => setPasswordOpen(true)}><KeyRound size={16} />修改登录密码</button></div><p className="settings-footnote">若部署时显式配置了 ADMIN_PASSWORD，重启后会以环境变量为准。</p></section>
      <section className="panel settings-section danger-zone"><header><span className="settings-icon"><TriangleAlert size={20} /></span><div><h2>清空业务数据</h2><p>用于重新初始化工作区，账号和系统配置会保留</p></div></header><div className="danger-zone-content"><div><strong>删除全部伙伴、联系人、评分、跟进、线索商机及旧备份</strong><p>操作不可撤销，清空后不会再自动载入演示数据。</p></div><button className="button button-danger-solid" onClick={() => setResetOpen(true)}><Trash2 size={16} />清空数据</button></div></section>
    </div></div>
    {passwordOpen && <PasswordModal onClose={() => setPasswordOpen(false)} />}
    {resetOpen && <ResetModal onClose={() => setResetOpen(false)} onComplete={async () => { await refresh(); setResetOpen(false); toast('工作区已清空', '可以开始录入正式业务数据'); }} />}
  </div>;
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const { toast } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirm) { setError('两次输入的新密码不一致'); return; }
    setSaving(true); setError('');
    try { await api.changePassword(currentPassword, newPassword); toast('登录密码已修改', '其他登录会话已退出，当前会话保持登录'); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '修改失败'); }
    finally { setSaving(false); }
  }
  return <Modal title="修改登录密码" subtitle="新密码至少 8 位，需同时包含字母和数字" onClose={onClose} width="small" footer={<><button className="button button-ghost" onClick={onClose}>取消</button><button className="button button-primary" form="password-form" disabled={saving}>{saving && <LoaderCircle size={16} className="spin" />}确认修改</button></>}><form id="password-form" className="password-form" onSubmit={submit}>{error && <div className="form-error">{error}</div>}<label className="field"><span>当前密码</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label><label className="field"><span>新密码</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label><label className="field"><span>确认新密码</span><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label></form></Modal>;
}

function ResetModal({ onClose, onComplete }: { onClose: () => void; onComplete: () => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError('');
    try { await api.resetData(password, confirmation); await onComplete(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '清空失败'); }
    finally { setSaving(false); }
  }
  return <Modal title="确认清空全部业务数据？" subtitle="这是高风险操作，删除后无法从系统恢复" onClose={onClose} width="small" footer={<><button className="button button-ghost" onClick={onClose}>取消</button><button className="button button-danger-solid" form="reset-form" disabled={saving || confirmation !== '清空'}>{saving && <LoaderCircle size={16} className="spin" />}永久清空</button></>}><form id="reset-form" className="reset-form" onSubmit={submit}><div className="reset-warning"><TriangleAlert size={18} /><p>将删除所有伙伴、联系人、评分、跟进、线索商机和历史备份。管理员账号会保留。</p></div>{error && <div className="form-error">{error}</div>}<label className="field"><span>管理员密码</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><label className="field"><span>请输入「清空」确认</span><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="清空" required /></label></form></Modal>;
}
