import { useEffect, useState } from 'react';
import { LoaderCircle, Trash2, UserCheck, UserX } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../store';
import type { AuthUser } from '../types';

export default function MemberManagement() {
  const { user: currentUser, toast } = useApp();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function load() {
    try { setUsers(await api.users()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '成员加载失败'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function update(id: string, action: 'role' | 'status', value: 'admin' | 'member' | 'active' | 'disabled') {
    setBusy(id);
    try {
      const result = action === 'role' ? await api.updateUserRole(id, value as 'admin' | 'member') : await api.updateUserStatus(id, value as 'active' | 'disabled');
      setUsers((items) => items.map((item) => item.id === id ? result.user : item));
      toast('成员设置已更新');
    } catch (reason) { toast('操作失败', reason instanceof Error ? reason.message : undefined, 'error'); }
    finally { setBusy(''); }
  }
  async function remove(member: AuthUser) {
    if (!window.confirm(`确定删除账号「${member.username}」吗？该账号的历史业务记录不会被删除。`)) return;
    setBusy(member.id);
    try { await api.deleteUser(member.id); setUsers((items) => items.filter((item) => item.id !== member.id)); toast('成员账号已删除', member.displayName, 'info'); }
    catch (reason) { toast('删除失败', reason instanceof Error ? reason.message : undefined, 'error'); }
    finally { setBusy(''); }
  }

  return <section className="panel settings-section member-management"><header><span className="settings-icon"><UserCheck size={20} /></span><div><h2>成员与权限</h2><p>成员通过登录页注册，默认是普通成员；管理员可调整角色、停用或删除账号</p></div></header><div className="member-notice">所有在职成员共享当前租户内的伙伴、联系人、跟进和商机数据。仅管理员可以管理成员或清空业务数据。</div>{loading ? <div className="page-loading"><LoaderCircle className="spin" /></div> : error ? <div className="form-error">{error}</div> : <div className="table-scroll"><table className="data-table member-table"><thead><tr><th>成员</th><th>角色</th><th>账号状态</th><th>注册时间</th><th>最近登录</th><th>操作</th></tr></thead><tbody>{users.map((member) => <tr key={member.id}><td><div className="member-name"><span style={{ background: member.avatarColor }}>{member.displayName.slice(0, 1)}</span><div><strong>{member.displayName}{member.id === currentUser?.id && <em>当前账号</em>}</strong><small>{member.username}{member.email ? ` · ${member.email}` : ''}</small></div></div></td><td><select value={member.role} disabled={member.id === currentUser?.id || busy === member.id} onChange={(e) => update(member.id, 'role', e.target.value as 'admin' | 'member')}><option value="member">普通成员</option><option value="admin">管理员</option></select></td><td><span className={`member-status ${member.status}`}><i />{member.status === 'active' ? '正常' : '已停用'}</span></td><td>{member.createdAt.slice(0, 10)}</td><td>{member.lastLoginAt?.slice(0, 10) || '—'}</td><td><div className="member-actions">{member.id !== currentUser?.id && <><button className="table-action" title={member.status === 'active' ? '停用账号' : '启用账号'} disabled={busy === member.id} onClick={() => update(member.id, 'status', member.status === 'active' ? 'disabled' : 'active')}>{member.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}</button><button className="table-action delete" title="删除账号" disabled={busy === member.id} onClick={() => remove(member)}><Trash2 size={15} /></button></>}</div></td></tr>)}</tbody></table></div>}</section>;
}
