import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

export default function LoginPage({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) { setError('请输入账号和密码'); return; }
    setLoading(true); setError('');
    try { await onLogin(username.trim(), password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '登录失败，请稍后重试'); }
    finally { setLoading(false); }
  }

  return <div className="login-page">
    <section className="login-showcase"><div className="login-brand"><span className="brand-mark"><svg viewBox="0 0 32 32"><path d="M8 9h12a4 4 0 0 1 0 8h-7a4 4 0 0 0 0 8h11" /><circle cx="8" cy="9" r="2" /><circle cx="24" cy="25" r="2" /></svg></span><div><strong>渠成</strong><span>CHANNEL OS</span></div></div><div className="login-showcase-content"><span className="login-kicker"><Sparkles size={15} />渠道经营，从真实连接开始</span><h1>让优质伙伴<br />成为持续增长的动力。</h1><p>从伙伴评估到客户商机，沉淀每一段关系、每一次推进和每一份真实贡献。</p><div className="login-feature-row"><span>伙伴档案</span><i /><span>联系人脉</span><i /><span>线索商机</span></div></div><div className="login-showcase-footer"><ShieldCheck size={15} />内部工作区 · 安全访问</div><div className="login-orb orb-one" /><div className="login-orb orb-two" /></section>
    <section className="login-form-side"><div className="login-form-wrap"><div className="login-mobile-brand">渠成 · CHANNEL OS</div><span className="login-form-icon"><LockKeyhole size={21} /></span><h2>欢迎回来</h2><p className="login-subtitle">登录你的渠道经营工作区</p><form className="login-form" onSubmit={submit}>{error && <div className="form-error">{error}</div>}<label className="field"><span>管理员账号</span><div className="login-input"><UserRound size={17} /><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="请输入账号" /></div></label><label className="field"><span>登录密码</span><div className="login-input"><LockKeyhole size={17} /><input type={visible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="请输入密码" /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? '隐藏密码' : '显示密码'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><button className="button button-primary login-submit" disabled={loading}>{loading ? <span className="button-loader" /> : <ArrowRight size={18} />}{loading ? '正在登录…' : '登录工作区'}</button></form><div className="login-security"><ShieldCheck size={14} /><span>使用加密密码哈希与安全会话保护数据</span></div><p className="login-help">如需修改账号或密码，请在部署环境变量中配置，<br />或登录后前往系统设置修改密码。</p></div><footer className="login-copyright">渠成 Channel OS · 通用渠道伙伴管理</footer></section>
  </div>;
}
