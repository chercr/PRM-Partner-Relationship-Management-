import type { AiConfigView, AiMessage, AuthUser, Contact, ContactDraft, ContactMoveDraft, FollowUp, Opportunity, OpportunityDraft, Partner, PartnerDraft, ProfileDraft, RegisterDraft, ScoreSet, UserRole, UserStatus } from './types';

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
  register: (draft: RegisterDraft) => request<{ user: AuthUser }>('/api/auth/register', { method: 'POST', body: JSON.stringify(draft) }),
  updateProfile: (draft: ProfileDraft) => request<{ user: AuthUser }>('/api/profile', { method: 'PUT', body: JSON.stringify(draft) }),
  users: () => request<AuthUser[]>('/api/users'),
  updateUserRole: (id: string, role: UserRole) => request<{ user: AuthUser }>(`/api/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  updateUserStatus: (id: string, status: UserStatus) => request<{ user: AuthUser }>(`/api/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteUser: (id: string) => request<{ ok: boolean }>(`/api/users/${id}`, { method: 'DELETE' }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) => request<{ ok: boolean }>('/api/auth/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  resetData: (password: string, confirmation: string) => request<{ ok: boolean }>('/api/admin/reset-data', { method: 'POST', body: JSON.stringify({ password, confirmation }) }),
  aiConfig: () => request<AiConfigView>('/api/ai/config'),
  saveAiConfig: (baseUrl: string, model: string, apiKey: string) => request<AiConfigView>('/api/ai/config', { method: 'PUT', body: JSON.stringify({ baseUrl, model, apiKey }) }),
  testAiConfig: () => request<{ ok: boolean }>('/api/ai/config/test', { method: 'POST' }),
  deleteAiConfig: () => request<{ ok: boolean }>('/api/ai/config', { method: 'DELETE' }),
  aiMessages: () => request<AiMessage[]>('/api/ai/messages'),
  chatAi: (message: string) => request<{ messages: AiMessage[] }>('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  executeAiProposal: (id: string) => request<{ messages: AiMessage[] }>(`/api/ai/proposals/${id}/execute`, { method: 'POST' }),
  cancelAiProposal: (id: string) => request<{ messages: AiMessage[] }>(`/api/ai/proposals/${id}/cancel`, { method: 'POST' }),
  clearAiMessages: () => request<{ ok: boolean }>('/api/ai/messages', { method: 'DELETE' }),
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
