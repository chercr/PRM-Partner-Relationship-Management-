import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ChevronRight, MessageSquarePlus, UsersRound } from 'lucide-react';
import { calculateScore, formatDate, getActivation, getNextFollowup, relativeDay, TYPE_META } from '../business';
import type { Partner } from '../types';
import { EmptyState, GradeBadge, PartnerAvatar, StatusBadge } from './UI';
import { useApp } from '../store';
import { getPartnerContribution } from '../opportunity-utils';

export default function PartnerTable({ partners, compact = false, selected, onSelect, onSelectAll }: { partners: Partner[]; compact?: boolean; selected?: Set<string>; onSelect?: (id: string) => void; onSelectAll?: () => void }) {
  const navigate = useNavigate();
  const { openFollowup, opportunities } = useApp();
  if (!partners.length) return <EmptyState icon={<UsersRound size={32} />} title="没有找到匹配的伙伴" description="试试调整筛选条件，或新增一家渠道伙伴。" />;
  return <div className="table-scroll"><table className={`data-table partner-table ${compact ? 'table-compact' : ''}`}><thead><tr>
    {selected && <th className="checkbox-cell"><input type="checkbox" aria-label="全选" checked={partners.length > 0 && partners.every((p) => selected.has(p.id))} onChange={onSelectAll} /></th>}
    <th>伙伴名称</th><th>类型 / 区域</th>{!compact && <th>批次</th>}<th>接触状态</th><th className="sortable">评估结果<ArrowUpDown size={12} /></th><th>线索 / 商机</th>{!compact && <th>核验状态</th>}<th>下次跟进</th><th>激活进度</th><th className="action-cell" />
  </tr></thead><tbody>{partners.map((partner) => {
    const score = calculateScore(partner.scores);
    const next = getNextFollowup(partner);
    const activation = getActivation(partner);
    const contribution = getPartnerContribution(partner.id, opportunities);
    return <tr key={partner.id} onClick={() => navigate(`/partners/${partner.id}`)} className={selected?.has(partner.id) ? 'row-selected' : ''}>
      {selected && <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`选择${partner.name}`} checked={selected.has(partner.id)} onChange={() => onSelect?.(partner.id)} /></td>}
      <td><div className="partner-name-cell"><PartnerAvatar name={partner.name} size={compact ? 'small' : 'medium'} /><div><strong>{partner.name}{partner.priorityOrder <= 10 && <span className="priority-pin">{partner.priorityOrder}</span>}</strong><span>{partner.scale || partner.businessDesc.slice(0, 25) || '规模待补充'}</span></div></div></td>
      <td><div className="type-region"><span style={{ color: TYPE_META[partner.type].color }}>{TYPE_META[partner.type].short}</span><small>{partner.region || '区域待核验'}</small></div></td>
      {!compact && <td><span className={`batch-badge batch-${partner.batch === '首批联系' ? 'first' : partner.batch === '专项批次' ? 'embodied' : 'pool'}`}>{partner.batch}</span></td>}
      <td><StatusBadge status={partner.status} /></td>
      <td><div className="score-cell"><GradeBadge grade={score.grade} />{score.total !== null && <b>{score.total.toFixed(2)}</b>}</div></td>
      <td><div className="partner-output-cell">{contribution.totalLeads > 0 ? <><b>{contribution.opportunityCount}</b><span>{contribution.totalLeads} 条线索</span></> : <span>暂无产出</span>}</div></td>
      {!compact && <td><span className={`verify-text verify-${partner.verifyStatus === '已核实' ? 'ok' : partner.verifyStatus === '已核实有误' ? 'fixed' : 'pending'}`}>{partner.verifyStatus}</span></td>}
      <td><div className={`next-date ${next && relativeDay(next).includes('逾期') ? 'is-overdue' : ''}`}><span>{next ? relativeDay(next) : '未安排'}</span>{next && <small>{formatDate(next)}</small>}</div></td>
      <td><span className={`activation-label activation-${activation.kind}`}>{activation.label}</span></td>
      <td className="action-cell" onClick={(e) => e.stopPropagation()}><button className="table-action" title="记录跟进" onClick={() => openFollowup(partner)}><MessageSquarePlus size={16} /></button><button className="table-action" title="查看详情" onClick={() => navigate(`/partners/${partner.id}`)}><ChevronRight size={16} /></button></td>
    </tr>;
  })}</tbody></table></div>;
}
