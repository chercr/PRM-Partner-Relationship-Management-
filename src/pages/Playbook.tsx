import { useState } from 'react';
import { ArrowRight, BadgeDollarSign, CircleAlert, Clock3, Handshake, Lightbulb, MessageSquareQuote, ShieldCheck, Target, UserRound, UsersRound } from 'lucide-react';
import { TYPE_META } from '../business';
import type { PartnerType } from '../types';

const playbooks: Record<PartnerType, { title: string; subtitle: string; profit: string; decision: string; action: string; concerns: string[]; leverage: string; incentive: string; cycle: string; ownership: string; risk: string; quote: string }> = {
  AGENT: { title: '让老客户资源，多产生一笔收入', subtitle: '顺单型伙伴的核心是动作轻、结算快、不占售前', profit: 'License / 云订阅差价 + 厂商返点，吃月度业绩', decision: '老板 / 销售总监，通常见两次可拍板', action: '递话 + 约人，见面由我们讲产品', concerns: ['分润结算快不快', '占不占用售前时间', '背不背交付责任'], leverage: '现成客户库和采购入口，动作极简、边际成本趋零。', incentive: '首单即时奖 + 续费分成，当月结清，零服务分销。', cycle: '60 天', ownership: '代理商引荐、我们运营，续费分给伙伴。', risk: '优先级被厂商返点挤占，卖完不管。', quote: '“推我们不用你懂产品、不用你交付，钱当月结，老客户多赚一笔。”' },
  SI: { title: '把项目管理能力，写进他的整体方案', subtitle: '方案型伙伴关注赢标、客单价与交付成本', profit: '实施项目费（人天）+ License 返点，吃项目利润', decision: '合伙人 / 交付总监', action: '把我们写进方案，联合投标、共同交付', concerns: ['能不能帮他赢标', '能不能提高客单价', '交付成本高不高'], leverage: '长期泡在客户现场，有痛点情报，方案互补。', incentive: '联合方案打包报价权，项目分润 + 交付认证费。', cycle: '90 天', ownership: '共同客户、联合交付。', risk: '嫌客单价低，方案里把我们当可选项。', quote: '“项目管理模块补上，你的方案多一块、标书多一分、客单价高一截。”' },
  IPD: { title: '让方法论真正落到客户的日常流程里', subtitle: '咨询型伙伴需要工具承载方法论，而不是抢咨询饭碗', profit: '咨询项目费（驻厂 / 陪跑），按项目收费', decision: '创始合伙人，个人色彩强', action: '流程诊断后推荐工具承载方法论', concerns: ['工具会不会抢咨询饭碗', '能不能落地他的方法论', '客户归属是否清晰'], leverage: '流程落地必须工具化——我们是最后一公里，他的信任背书最强。', incentive: '方法论共建（联合白皮书 / 课程）换独家推荐位；订阅分润。', cycle: '120 天', ownership: '咨询归他、订阅归我们，分润绑定。', risk: '只推荐不推动，或要求工具白送客户。', quote: '“工具落地你的流程，客户看见效果等于你的口碑；方法论共建，客户还是你的。”' },
  EXPERT: { title: '轻量转介绍，不辜负每一次专业背书', subtitle: '专家型伙伴重在轻、无考核、不伤个人品牌', profit: '个人项目费 + 培训课酬', decision: '专家本人', action: '口头推荐 + 专业背书', concerns: ['轻，不压货无任务', '不伤个人品牌', '客户服务是否有保障'], leverage: '零成本转介绍试点，专家背书带来高信任线索。', incentive: '纯推荐分成，无考核、无压力。', cycle: '不限期', ownership: '谁成交谁运营。', risk: '线索量小且不稳定。', quote: '“客户成了我们服务好，你的名声我们替你守着，分成照给。”' },
};

export default function Playbook() {
  const [active, setActive] = useState<PartnerType>('AGENT');
  const playbook = playbooks[active];
  return <div className="playbook-page page-enter">
    <div className="page-heading"><div><div className="eyebrow"><span />CHANNEL PLAYBOOK</div><h1>渠道打法</h1><p>他的钱从哪来，决定了他关心什么，也决定了我们该给什么。</p></div></div>
    <div className="playbook-type-tabs">{(Object.keys(TYPE_META) as PartnerType[]).map((type, index) => <button key={type} className={active === type ? 'active' : ''} onClick={() => setActive(type)}><span style={{ color: TYPE_META[type].color, background: TYPE_META[type].bg }}>{index + 1}</span><div><strong>{TYPE_META[type].name}</strong><small>{['顺单型', '方案型', '方法论型', '转介绍型'][index]}</small></div><ArrowRight size={16} /></button>)}</div>
    <section className="playbook-hero" style={{ '--type-color': TYPE_META[active].color, '--type-bg': TYPE_META[active].bg } as React.CSSProperties}><div><span className="playbook-label"><Handshake size={16} />{TYPE_META[active].name}合作策略</span><h2>{playbook.title}</h2><p>{playbook.subtitle}</p></div><div className="playbook-cycle"><Clock3 size={20} /><span>标准激活周期</span><strong>{playbook.cycle}</strong></div></section>
    <div className="playbook-grid"><section className="panel playbook-profit"><header><BadgeDollarSign size={19} /><h2>先看懂他的生意</h2></header><div className="playbook-info-list"><div><span>盈利模式</span><strong>{playbook.profit}</strong></div><div><span>关键决策人</span><strong>{playbook.decision}</strong></div><div><span>他的销售动作</span><strong>{playbook.action}</strong></div></div></section><section className="panel playbook-concerns"><header><Target size={19} /><h2>他最关注的三件事</h2></header><ol>{playbook.concerns.map((item, index) => <li key={item}><span>0{index + 1}</span>{item}</li>)}</ol></section></div>
    <div className="playbook-grid playbook-grid-three"><section className="panel playbook-small-card"><Lightbulb size={20} /><h3>可以利用的支点</h3><p>{playbook.leverage}</p></section><section className="panel playbook-small-card"><BadgeDollarSign size={20} /><h3>利益设计</h3><p>{playbook.incentive}</p></section><section className="panel playbook-small-card"><ShieldCheck size={20} /><h3>客户归属建议</h3><p>{playbook.ownership}</p></section></div>
    <section className="playbook-quote"><MessageSquareQuote size={30} /><div><span>开场核心话术</span><blockquote>{playbook.quote}</blockquote></div></section>
    <div className="playbook-risk"><CircleAlert size={18} /><div><strong>提前防范最大风险</strong><p>{playbook.risk}</p></div><span>同一套底线：报备保护 + 续费分成</span></div>
  </div>;
}
