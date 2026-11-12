import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ContactRound, FileText, Globe2, LoaderCircle } from 'lucide-react';
import { Modal } from './UI';
import { useApp } from '../store';
import { TYPE_META } from '../business';
import type { Partner, PartnerDraft } from '../types';

const emptyDraft: PartnerDraft = { name: '', type: 'AGENT', region: '', scale: '', businessDesc: '', decisionMaker: '', sourceName: '', sourceUrl: '', contact: '', verifyStatus: '待核实', verifyNote: '', batch: '蓄水池', priorityOrder: 999, status: '未接触', note: '' };

export default function PartnerForm({ partner, onClose }: { partner: Partner | null; onClose: () => void }) {
  const { createPartner, updatePartner, toast } = useApp();
  const [draft, setDraft] = useState<PartnerDraft>(partner ? { ...partner } : emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const set = <K extends keyof PartnerDraft>(key: K, value: PartnerDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) { setError('请填写公司全称'); return; }
    setSaving(true); setError('');
    try {
      const saved = partner ? await updatePartner(partner.id, draft) : await createPartner(draft);
      toast(partner ? '伙伴档案已更新' : '新伙伴已加入名单', saved.name);
      onClose();
      if (!partner) navigate(`/partners/${saved.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  }

  return <Modal title={partner ? '编辑伙伴档案' : '新增渠道伙伴'} subtitle={partner ? `更新 ${partner.name} 的基础档案` : '先记录关键线索，后续再完成核验与评估'} onClose={onClose} width="large" footer={<><button className="button button-ghost" onClick={onClose}>取消</button><button className="button button-primary" form="partner-form" disabled={saving}>{saving && <LoaderCircle size={16} className="spin" />}{partner ? '保存修改' : '创建伙伴档案'}</button></>}>
    <form id="partner-form" className="partner-form" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <section className="form-section"><h3><Building2 size={17} />基本信息</h3><div className="form-grid">
        <label className="field field-span-2"><span>公司全称 <em>*</em></span><input autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="例如：上海某某信息技术有限公司" /></label>
        <label className="field"><span>伙伴类型 <em>*</em></span><select value={draft.type} onChange={(e) => set('type', e.target.value as PartnerDraft['type'])}>{Object.entries(TYPE_META).map(([key, meta]) => <option value={key} key={key}>{meta.name}</option>)}</select></label>
        <label className="field"><span>所在区域</span><input value={draft.region} onChange={(e) => set('region', e.target.value)} placeholder="例如：华东（上海）" /></label>
        <label className="field"><span>团队规模</span><input value={draft.scale} onChange={(e) => set('scale', e.target.value)} placeholder="例如：50–100 人" /></label>
        <label className="field"><span>决策人 / 职务</span><input value={draft.decisionMaker} onChange={(e) => set('decisionMaker', e.target.value)} placeholder="姓名与职务（可稍后补充）" /></label>
        <label className="field field-span-2"><span>主营业务 / 客户画像</span><textarea rows={3} value={draft.businessDesc} onChange={(e) => set('businessDesc', e.target.value)} placeholder="主要服务行业、客户规模、现有产品与交付能力…" /></label>
      </div></section>
      <section className="form-section"><h3><ContactRound size={17} />来源与联系</h3><div className="form-grid">
        <label className="field"><span>来源名称</span><input value={draft.sourceName} onChange={(e) => set('sourceName', e.target.value)} placeholder="例如：行业名录 / 伙伴转介绍" /></label>
        <label className="field"><span>来源链接</span><input value={draft.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} placeholder="https://" /></label>
        <label className="field field-span-2"><span>联系方式</span><input value={draft.contact} onChange={(e) => set('contact', e.target.value)} placeholder="电话、微信或其他联系线索" /></label>
      </div></section>
      <section className="form-section"><h3><Globe2 size={17} />跟进属性</h3><div className="form-grid form-grid-3">
        <label className="field"><span>来源批次</span><select value={draft.batch} onChange={(e) => set('batch', e.target.value as PartnerDraft['batch'])}><option>首批联系</option><option>蓄水池</option><option>专项批次</option></select></label>
        <label className="field"><span>联系优先级</span><input type="number" min={1} max={999} value={draft.priorityOrder} onChange={(e) => set('priorityOrder', Number(e.target.value))} /><small>数字越小，列表越靠前</small></label>
        <label className="field"><span>核验状态</span><select value={draft.verifyStatus} onChange={(e) => set('verifyStatus', e.target.value as PartnerDraft['verifyStatus'])}><option>待核实</option><option>已核实</option><option>已核实有误</option></select></label>
        {draft.verifyStatus === '已核实有误' && <label className="field field-span-3"><span>更正说明</span><textarea rows={2} value={draft.verifyNote} onChange={(e) => set('verifyNote', e.target.value)} placeholder="记录原信息中有误的内容与正确信息" /></label>}
      </div></section>
      <section className="form-section"><h3><FileText size={17} />备注</h3><label className="field"><textarea rows={3} value={draft.note} onChange={(e) => set('note', e.target.value)} placeholder="合作切入点、风险或其他需要记住的信息…" /></label></section>
    </form>
  </Modal>;
}
