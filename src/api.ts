import type { AuthUser, Contact, ContactDraft, ContactMoveDraft, FollowUp, Opportunity, OpportunityDraft, Partner, PartnerDraft, ScoreSet } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !url.includes('/auth/login')) window.dispatchEvent(new CustomEvent('channel-auth-required'));
  if (!response.ok) throw new Error(data.error || '请求失败，请稍后重试');
  return data;
}

export const api = {
  me: () => request<{ user: AuthUser }>('/api/auth/me'),
  login: (username: string, password: string) => request<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) => request<{ ok: boolean }>('/api/auth/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  resetData: (password: string, confirmation: string) => request<{ ok: boolean }>('/api/admin/reset-data', { method: 'POST', body: JSON.stringify({ password, confirmation }) }),
  partners: () => request<Partner[]>('/api/partners'),
  createPartner: (draft: PartnerDraft) => request<Partner>('/api/partners', { method: 'POST', body: JSON.stringify(draft) }),
  updatePartner: (id: string, draft: Partial<PartnerDraft>) => request<Partner>(`/api/partners/${id}`, { method: 'PUT', body: JSON.stringify(draft) }),
  deletePartner: (id: string) => request<{ ok: boolean }>(`/api/partners/${id}`, { method: 'DELETE' }),
  saveScores: (id: string, scores: ScoreSet) => request<Partner>(`/api/partners/${id}/scores`, { method: 'PUT', body: JSON.stringify({ scores }) }),
  addFollowup: (partnerId: string, draft: Omit<FollowUp, 'id' | 'partnerId' | 'createdAt'>) => request<Partner>(`/api/partners/${partnerId}/followups`, { method: 'POST', body: JSON.stringify(draft) }),
  importPartners: (partners: PartnerDraft[]) => request<{ inserted: number; skipped: number }>('/api/import', { method: 'POST', body: JSON.stringify({ partners }) }),
  backup: () => request<{ file: string }>('/api/backup', { method: 'POST' }),
  opportunities: () => request<Opportunity[]>('/api/opportunities'),
  createOpportunity: (draft: OpportunityDraft) => request<Opportunity>('/api/opportunities', { method: 'POST', body: JSON.stringify(draft) }),
  updateOpportunity: (id: string, draft: Partial<OpportunityDraft>) => request<Opportunity>(`/api/opportunities/${id}`, { method: 'PUT', body: JSON.stringify(draft) }),
  deleteOpportunity: (id: string) => request<{ ok: boolean }>(`/api/opportunities/${id}`, { method: 'DELETE' }),
  contacts: () => request<Contact[]>('/api/contacts'),
  createContact: (draft: ContactDraft) => request<Contact>('/api/contacts', { method: 'POST', body: JSON.stringify(draft) }),
  updateContact: (id: string, draft: Partial<ContactDraft>) => request<Contact>(`/api/contacts/${id}`, { method: 'PUT', body: JSON.stringify(draft) }),
  moveContact: (id: string, draft: ContactMoveDraft) => request<Contact>(`/api/contacts/${id}/move`, { method: 'POST', body: JSON.stringify(draft) }),
  deleteContact: (id: string) => request<{ ok: boolean }>(`/api/contacts/${id}`, { method: 'DELETE' }),
};
