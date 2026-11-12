import { useState } from 'react';
import { ArrowRight, BadgeDollarSign, Building2, CircleAlert, LoaderCircle, Sparkles } from 'lucide-react';
import { Modal } from './UI';
import { useApp, type OpportunityFormOptions } from '../store';
import type { OpportunityDraft, OpportunityStage } from '../types';

export default function OpportunityForm({ options, onClose }: { options: OpportunityFormOptions; onClose: () => void }) {
  const { partners, contacts, createOpportunity, updateOpportunity, toast } = useApp();
  const existing = options.opportunity;
  const initialStage = options.stage || existing?.stage || 'LEAD';
  const [partnerId, setPartnerId] = useState(existing?.partnerId || options.partnerId || [...partners].sort((a, b) => a.priorityOrder - b.priorityOrder)[0]?.id || '');
  const [sourceContactId, setSourceContactId] = useState(existing?.sourceContactId || contacts.find((contact) => contact.partnerId === partnerId && contact.isPrimary)?.id || '');
  const [customerName, setCustomerName] = useState(existing?.customerName || '');
  const [name, setName] = useState(existing?.name || '');
  const [demand, setDemand] = useState(existing?.demand || '');
  const [amount, setAmount] = useState(existing?.expectedAmount?.toString() || '');
  const [stage, setStage] = useState<OpportunityStage>(initialStage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const converting = existing?.stage === 'LEAD' && stage === 'OPPORTUNITY';
  const title = converting ? '一键转为商机' : existing ? '编辑线索 / 商机' : stage === 'OPPORTUNITY' ? '登记商机' : '登记客户线索';
  const availableContacts = contacts.filter((contact) => contact.partnerId === partnerId || contact.careers.some((career) => career.partnerId === partnerId));

  function changePartner(value: string) {
    setPartnerId(value);
    setSourceContactId(contacts.find((contact) => contact.partnerId === value && contact.isPrimary)?.id || '');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!partnerId || !customerName.trim() || !name.trim()) { setError('请完整填写来源伙伴、客户名称和名称'); return; }
    if (stage === 'OPPORTUNITY' && !demand.trim()) { setError('转为商机前，请填写客户的真实需求'); return; }
    setSaving(true); setError('');
    const draft: OpportunityDraft = { partnerId, customerName, name, demand, expectedAmount: amount.trim() ? Number(amount) : null, stage, sourceContactId: sourceContactId || undefined };
    try {
      if (existing) await updateOpportunity(existing.id, draft);
      else await createOpportunity(draft);
      toast(converting ? '已成功转为商机' : existing ? '记录已更新' : stage === 'OPPORTUNITY' ? '商机已登记' : '客户线索已登记', `${customerName} · ${name}`);
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败'); }
    finally { setSaving(false); }
  }

  return <Modal title={title} subtitle="只记录当前阶段真正需要的信息，不进入后续销售流程" onClose={onClose} width="medium" footer={<><button className="button button-ghost" onClick={onClose}>取消</button><button className="button button-primary" form="opportunity-form" disabled={saving}>{saving ? <LoaderCircle size={16} className="spin" /> : converting && <ArrowRight size={16} />}{converting ? '确认转为商机' : '保存记录'}</button></>}>
    <form id="opportunity-form" className="opportunity-form" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <div className="record-type-switch"><button type="button" className={stage === 'LEAD' ? 'active' : ''} onClick={() => setStage('LEAD')} disabled={existing?.stage === 'OPPORTUNITY'}><Sparkles size={16} /><span><b>客户线索</b><small>先记录潜在需求</small></span></button><button type="button" className={stage === 'OPPORTUNITY' ? 'active' : ''} onClick={() => setStage('OPPORTUNITY')}><BadgeDollarSign size={16} /><span><b>商机</b><small>需求已经真实确认</small></span></button></div>
      {converting && <div className="conversion-notice"><ArrowRight size={18} /><div><strong>转换后计入伙伴实际贡献</strong><p>该记录将计入商机数量、预计贡献金额与线索转化率，原线索记录会保留。</p></div></div>}
      <label className="field"><span>来源伙伴 <em>*</em></span><select value={partnerId} onChange={(e) => changePartner(e.target.value)}>{partners.map((partner) => <option value={partner.id} key={partner.id}>{partner.name}</option>)}</select></label><label className="field"><span>引荐人 / 来源联系人</span><select value={sourceContactId} onChange={(e) => setSourceContactId(e.target.value)}><option value="">暂不指定</option>{availableContacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.name} · {contact.title || contact.role}{contact.partnerId !== partnerId ? '（历史任职）' : contact.employmentStatus === '已离职' ? '（已离职）' : ''}</option>)}</select><small>人员后续发生任职变动时，历史贡献仍会保留</small></label>
      <div className="form-grid">
        <label className="field"><span>客户名称 <em>*</em></span><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="某制造企业 / 客户全称" /></label>
        <label className="field"><span>{stage === 'OPPORTUNITY' ? '商机名称' : '线索名称'} <em>*</em></span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：研发协同平台项目" /></label>
      </div>
      <label className="field"><span>真实需求 {stage === 'OPPORTUNITY' && <em>*</em>}</span><textarea rows={5} value={demand} onChange={(e) => setDemand(e.target.value)} placeholder={stage === 'OPPORTUNITY' ? '客户要解决什么问题？涉及哪些团队？是否已有明确场景、预算或时间？' : '目前了解到哪些潜在需求？哪些信息还待核实？'} /><small>只记录已确认事实与待核实事项，不需要填写后续销售阶段。</small></label>
      <label className="field amount-field"><span>预计商机金额</span><div><input type="number" min="0" step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="暂未明确可留空" /><b>万元</b></div><small>金额仅用于当前渠道贡献预估，不涉及合同或成交管理。</small></label>
      {stage === 'LEAD' && <div className="lead-tip"><CircleAlert size={15} />确认需求真实后，可在列表中点击「一键转商机」。</div>}
    </form>
  </Modal>;
}
