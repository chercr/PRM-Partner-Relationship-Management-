import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bot, Check, CheckCircle2, CircleAlert, KeyRound, LoaderCircle, Send, Settings2, ShieldCheck, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../store';
import type { AiConfigView, AiMessage, AiProposal } from '../types';

const fieldLabels: Record<string, string> = { name: '名称', type: '伙伴类型', region: '区域', batch: '批次', businessDesc: '业务画像', decisionMaker: '决策人', contact: '联系方式', note: '备注', partnerName: '来源伙伴', summary: '跟进内容', date: '跟进日期', channel: '沟通方式', tags: '标签', nextFollowupDate: '下次跟进', customerName: '客户名称', demand: '真实需求', expectedAmount: '预计金额', stage: '记录类型', title: '职务', department: '部门', phone: '手机', wechat: '微信', email: '邮箱', role: '合作角色', isPrimary: '首要联系人', notes: '备注' };
const examples = ['新增伙伴：星河科技，代理商，华东', '为星河科技添加一条微信跟进：已完成首次沟通', '为星河科技登记客户线索：某制造企业研发协同需求'];

export default function AiAssistant() {
  const { user, refresh, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<AiConfigView>({ configured: false, baseUrl: '', model: '', apiKeyMask: '' });
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void Promise.all([api.aiConfig(), api.aiMessages()]).then(([configResult, messageResult]) => { setConfig(configResult); setMessages(messageResult); }).catch((reason) => toast('AI 助手加载失败', reason instanceof Error ? reason.message : undefined, 'error'));
  }, [open, toast]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true); setError('');
    try { const result = await api.chatAi(text); setMessages(result.messages); setInput(''); }
    catch (reason) { toast('消息发送失败', reason instanceof Error ? reason.message : undefined, 'error'); }
    finally { setSending(false); }
  }
  async function execute(proposal: AiProposal) {
    setBusyId(proposal.id);
    try { const result = await api.executeAiProposal(proposal.id); setMessages(result.messages); await refresh(); toast('数据已自动写入', proposal.summary); }
    catch (reason) { toast('写入失败', reason instanceof Error ? reason.message : undefined, 'error'); }
    finally { setBusyId(''); }
  }
  async function cancel(proposal: AiProposal) {
    setBusyId(proposal.id);
    try { const result = await api.cancelAiProposal(proposal.id); setMessages(result.messages); }
    catch (reason) { toast('取消失败', reason instanceof Error ? reason.message : undefined, 'error'); }
    finally { setBusyId(''); }
  }
  async function saveAndTest(event: React.FormEvent) {
    event.preventDefault();
    setTesting(true); setError('');
    try {
      const saved = await api.saveAiConfig(config.baseUrl, config.model, apiKey);
      setConfig(saved); setApiKey('');
      try { await api.testAiConfig(); toast('AI 服务已配置并连接成功'); setConfigOpen(false); }
      catch (reason) { setError(`配置已保存，但连接测试失败：${reason instanceof Error ? reason.message : '未知错误'}`); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : '配置保存失败'); }
    finally { setTesting(false); }
  }
  async function clearHistory() {
    if (!window.confirm('确定清空当前账号的 AI 对话记录吗？已写入的业务数据不会受影响。')) return;
    await api.clearAiMessages(); setMessages([]); toast('AI 对话记录已清空', undefined, 'info');
  }

  return <>
    {open && <section className="ai-panel" role="dialog" aria-label="AI 渠道助手"><header className="ai-header"><div className="ai-title"><span><Sparkles size={18} /></span><div><strong>渠道 AI 助手</strong><small><i className={config.configured ? 'online' : ''} />{config.configured ? `${config.model} · 已配置` : '等待配置 AI 服务'}</small></div></div><div><button title="配置 AI 服务" onClick={() => { setConfigOpen(true); setError(''); }}><Settings2 size={17} /></button><button title="清空对话" onClick={clearHistory}><Trash2 size={16} /></button><button title="关闭" onClick={() => { setOpen(false); setConfigOpen(false); }}><X size={18} /></button></div></header>
      {configOpen ? <div className="ai-config-view"><button className="ai-back" onClick={() => setConfigOpen(false)}><ArrowLeft size={15} />返回对话</button><div className="ai-config-title"><KeyRound size={19} /><div><h3>AI 服务配置</h3><p>支持 OpenAI 兼容的 chat/completions 接口</p></div></div>{user?.role !== 'admin' ? <div className="ai-member-notice"><ShieldCheck size={19} /><p>只有管理员可以修改 AI 服务配置。你仍可使用管理员配置好的 AI 助手。</p></div> : <form onSubmit={saveAndTest} className="ai-config-form">{error && <div className="form-error">{error}</div>}<label className="field"><span>API Base URL</span><input value={config.baseUrl} onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })} placeholder="https://api.deepseek.com/v1" required /></label><label className="field"><span>模型名称</span><input value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} placeholder="deepseek-chat" required /></label><label className="field"><span>API Token</span><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={config.apiKeyMask || '首次配置请输入 Token'} autoComplete="off" /><small>{config.configured ? '留空则保留当前密钥；新密钥将覆盖原配置' : 'Token 仅保存在服务端，并使用 AES-256-GCM 加密'}</small></label><div className="ai-privacy-note"><CircleAlert size={15} /><p>对话及必要业务字段会发送给所配置的服务商。请勿输入密码、密钥或不必要的敏感信息。</p></div><button className="button button-primary button-full" disabled={testing}>{testing ? <LoaderCircle size={16} className="spin" /> : <CheckCircle2 size={16} />}保存并测试连接</button></form>}</div> : <>
        <div className="ai-messages" ref={scrollRef}>{!messages.length && <div className="ai-welcome"><span><Bot size={23} /></span><h3>你好，{user?.displayName}</h3><p>你可以用自然语言让我整理伙伴、跟进、联系人和线索商机。</p><div className="ai-examples">{examples.map((example) => <button key={example} onClick={() => setInput(example)}>{example}</button>)}</div><small>AI 生成内容会先展示写入预览，确认后才会入库。</small></div>}{messages.map((message) => <div className={`ai-message ${message.role}`} key={message.id}><span className="ai-message-avatar">{message.role === 'assistant' ? <Bot size={15} /> : <UserRound size={15} />}</span><div className="ai-message-content"><p>{message.content}</p>{message.proposal && <ProposalCard proposal={message.proposal} busy={busyId === message.proposal.id} onExecute={() => execute(message.proposal!)} onCancel={() => cancel(message.proposal!)} />}</div></div>)}{sending && <div className="ai-message assistant"><span className="ai-message-avatar"><Bot size={15} /></span><div className="ai-typing"><i /><i /><i /></div></div>}</div>
        <div className="ai-input-area"><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="例如：新增伙伴星河科技，类型代理商…" rows={2} maxLength={4000} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} /><div><span>Enter 发送 · Shift + Enter 换行</span><button className="ai-send" disabled={!input.trim() || sending} onClick={send} aria-label="发送消息">{sending ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}</button></div></div>
      </>}
    </section>}
    <button className={`ai-launcher ${open ? 'is-open' : ''}`} onClick={() => setOpen(!open)} aria-label={open ? '收起 AI 助手' : '打开 AI 助手'} title="AI 渠道助手">{open ? <X size={23} /> : <Sparkles size={23} />}<i /></button>
  </>;
}

function ProposalCard({ proposal, busy, onExecute, onCancel }: { proposal: AiProposal; busy: boolean; onExecute: () => void; onCancel: () => void }) {
  const entries = Object.entries(proposal.data).filter(([, value]) => value !== '' && value !== null && value !== undefined && (!Array.isArray(value) || value.length));
  return <div className={`ai-proposal ${proposal.status}`}><div className="ai-proposal-title"><CheckCircle2 size={15} /><strong>{proposal.summary}</strong></div><div className="ai-proposal-fields">{entries.map(([key, value]) => <div key={key}><span>{fieldLabels[key] || key}</span><b>{key === 'expectedAmount' ? `${String(value)} 万元` : key === 'stage' ? value === 'OPPORTUNITY' ? '商机' : '线索' : Array.isArray(value) ? value.join('、') : String(value)}</b></div>)}</div>{proposal.status === 'pending' ? <div className="ai-proposal-actions"><button className="button button-primary button-small" disabled={busy} onClick={onExecute}>{busy ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />}确认写入</button><button className="button button-ghost button-small" disabled={busy} onClick={onCancel}>取消</button></div> : <span className={`ai-proposal-status ${proposal.status}`}>{proposal.status === 'executed' ? '已自动入库' : '已取消'}</span>}</div>;
}
