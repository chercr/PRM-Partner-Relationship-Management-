import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, UserPlus, UserRound } from 'lucide-react';
import type { RegisterDraft } from '../types';

type Props = {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (draft: RegisterDraft) => Promise<void>;
};

export default function LoginPage({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('admin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const registering = mode === 'register';

  function switchMode(next: 'login' | 'register') {
    setMode(next); setError(''); setPassword(''); setConfirm(''); setUsername(next === 'login' ? 'admin' : '');
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password || (registering && !displayName.trim())) { setError('请填写完整的必填信息'); return; }
    if (registering && password !== confirm) { setError('两次输入的密码不一致'); return; }
    setLoading(true); setError('');
    try {
      if (registering) await onRegister({ username: username.trim(), displayName: displayName.trim(), email: email.trim(), password });
      else await onLogin(username.trim(), password);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '操作失败，请稍后重试'); }
    finally { setLoading(false); }
  }

  return <div className="login-page">
    <section className="login-showcase"><div className="login-brand"><span className="brand-mark"><svg viewBox="0 0 32 32"><path d="M8 9h12a4 4 0 0 1 0 8h-7a4 4 0 0 0 0 8h11" /><circle cx="8" cy="9" r="2" /><circle cx="24" cy="25" r="2" /></svg></span><div><strong>渠成</strong><span>CHANNEL OS</span></div></div><div className="login-showcase-content"><span className="login-kicker"><Sparkles size={15} />渠道经营，从真实连接开始</span><h1>让优质伙伴<br />成为持续增长的动力。</h1><p>从伙伴评估到客户商机，沉淀每一段关系、每一次推进和每一份真实贡献。</p><div className="login-feature-row"><span>伙伴档案</span><i /><span>联系人脉</span><i /><span>线索商机</span></div></div><div className="login-showcase-footer"><ShieldCheck size={15} />内部工作区 · 安全访问</div><div className="login-orb orb-one" /><div className="login-orb orb-two" /></section>
    <section className="login-form-side"><div className="login-form-wrap"><div className="login-mobile-brand">渠成 · CHANNEL OS</div><span className="login-form-icon">{registering ? <UserPlus size={21} /> : <LockKeyhole size={21} />}</span><h2>{registering ? '创建成员账号' : '欢迎回来'}</h2><p className="login-subtitle">{registering ? '注册后进入同一个渠道工作区，并可编辑个人资料' : '登录你的渠道经营工作区'}</p><form className="login-form" onSubmit={submit}>{error && <div className="form-error">{error}</div>}{registering && <label className="field"><span>姓名 <em>*</em></span><div className="login-input"><UserRound size={17} /><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" placeholder="你的姓名或称呼" /></div></label>}<label className="field"><span>{registering ? '登录账号' : '账号'}</span><div className="login-input"><UserRound size={17} /><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder={registering ? '3–24 位字母、数字或 _ . -' : '请输入账号'} /></div></label>{registering && <label className="field"><span>邮箱（选填）</span><div className="login-input"><UserRound size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="name@example.com" /></div></label>}<label className="field"><span>{registering ? '设置密码' : '登录密码'}</span><div className="login-input"><LockKeyhole size={17} /><input type={visible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={registering ? 'new-password' : 'current-password'} placeholder="至少 8 位，包含字母和数字" /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? '隐藏密码' : '显示密码'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{registering && <label className="field"><span>确认密码</span><div className="login-input"><LockKeyhole size={17} /><input type={visible ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="再次输入密码" /></div></label>}<button className="button button-primary login-submit" disabled={loading}>{loading ? <span className="button-loader" /> : registering ? <UserPlus size={18} /> : <ArrowRight size={18} />}{loading ? '请稍候…' : registering ? '注册并进入工作区' : '登录工作区'}</button></form><button className="auth-switch" onClick={() => switchMode(registering ? 'login' : 'register')}>{registering ? '已有账号？返回登录' : '没有账号？注册成员账号'}<ArrowRight size={14} /></button><div className="login-security"><ShieldCheck size={14} /><span>使用加密密码哈希与安全会话保护数据</span></div><p className="login-help">{registering ? '注册成员默认为普通角色，管理员可在成员管理中调整角色与状态。' : '登录后可在个人中心编辑资料，并在系统设置中修改密码。'}</p></div><footer className="login-copyright">渠成 Channel OS · 通用渠道伙伴管理</footer></section>
  </div>;
}
