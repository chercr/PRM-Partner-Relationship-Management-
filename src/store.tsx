import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { AuthUser, Contact, ContactDraft, ContactMoveDraft, FollowUp, Opportunity, OpportunityDraft, OpportunityStage, Partner, PartnerDraft, ScoreSet, ToastMessage } from './types';
import { ToastStack } from './components/UI';
import LoginPage from './pages/LoginPage';

export type FontSize = 'standard' | 'large';
export type OpportunityFormOptions = { partnerId?: string; opportunity?: Opportunity; stage?: OpportunityStage };
export type ContactFormOptions = { partnerId?: string; contact?: Contact };

type AppContextValue = {
  partners: Partner[];
  opportunities: Opportunity[];
  contacts: Contact[];
  user: AuthUser | null;
  loading: boolean;
  toasts: ToastMessage[];
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  createPartner: (draft: PartnerDraft) => Promise<Partner>;
  updatePartner: (id: string, draft: Partial<PartnerDraft>) => Promise<Partner>;
  deletePartner: (id: string) => Promise<void>;
  saveScores: (id: string, scores: ScoreSet) => Promise<Partner>;
  addFollowup: (id: string, draft: Omit<FollowUp, 'id' | 'partnerId' | 'createdAt'>) => Promise<Partner>;
  importPartners: (drafts: PartnerDraft[]) => Promise<void>;
  createOpportunity: (draft: OpportunityDraft) => Promise<Opportunity>;
  updateOpportunity: (id: string, draft: Partial<OpportunityDraft>) => Promise<Opportunity>;
  deleteOpportunity: (id: string) => Promise<void>;
  createContact: (draft: ContactDraft) => Promise<Contact>;
  updateContact: (id: string, draft: Partial<ContactDraft>) => Promise<Contact>;
  moveContact: (id: string, draft: ContactMoveDraft) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  toast: (title: string, description?: string, kind?: ToastMessage['kind']) => void;
  openPartnerForm: (partner?: Partner) => void;
  openImport: () => void;
  openFollowup: (partner: Partner) => void;
  openOpportunityForm: (options?: OpportunityFormOptions) => void;
  openContactForm: (options?: ContactFormOptions) => void;
  openContactMove: (contact: Contact) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [partnerForm, setPartnerForm] = useState<Partner | null | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [followupPartner, setFollowupPartner] = useState<Partner | null>(null);
  const [opportunityForm, setOpportunityForm] = useState<OpportunityFormOptions | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormOptions | null>(null);
  const [contactMove, setContactMove] = useState<Contact | null>(null);
  const [fontSize, setFontSizeState] = useState<FontSize>(() => localStorage.getItem('channel-font-size') === 'large' ? 'large' : 'standard');

  const toast = useCallback((title: string, description?: string, kind: ToastMessage['kind'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, title, description, kind }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3800);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [partnerData, opportunityData, contactData] = await Promise.all([api.partners(), api.opportunities(), api.contacts()]);
      setPartners(partnerData);
      setOpportunities(opportunityData);
      setContacts(contactData);
    } catch (error) {
      toast('暂时无法连接数据服务', error instanceof Error ? error.message : undefined, 'error');
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    let active = true;
    api.me().then(async (result) => {
      if (!active) return;
      setUser(result.user);
      await refresh();
    }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setAuthChecked(true); });
    return () => { active = false; };
  }, [refresh]);
  useEffect(() => {
    const expired = () => { setUser(null); setPartners([]); setOpportunities([]); setContacts([]); };
    window.addEventListener('channel-auth-required', expired);
    return () => window.removeEventListener('channel-auth-required', expired);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
    localStorage.setItem('channel-font-size', fontSize);
  }, [fontSize]);

  const handleLogin = useCallback(async (username: string, password: string) => {
    const result = await api.login(username, password);
    setUser(result.user);
    setLoading(true);
    await refresh();
  }, [refresh]);
  const setFontSize = useCallback((size: FontSize) => setFontSizeState(size), []);
  const value = useMemo<AppContextValue>(() => ({
    partners, opportunities, contacts, user, loading, toasts, refresh, toast, fontSize, setFontSize,
    logout: async () => {
      try { await api.logout(); }
      finally { setUser(null); setPartners([]); setOpportunities([]); setContacts([]); }
    },
    createPartner: async (draft) => { const partner = await api.createPartner(draft); await refresh(); return partner; },
    updatePartner: async (id, draft) => { const partner = await api.updatePartner(id, draft); setPartners((items) => items.map((item) => item.id === id ? partner : item)); return partner; },
    deletePartner: async (id) => { await api.deletePartner(id); setPartners((items) => items.filter((item) => item.id !== id)); setOpportunities((items) => items.filter((item) => item.partnerId !== id)); setContacts((items) => items.filter((item) => item.partnerId !== id)); },
    saveScores: async (id, scores) => { const partner = await api.saveScores(id, scores); setPartners((items) => items.map((item) => item.id === id ? partner : item)); return partner; },
    addFollowup: async (id, draft) => { const partner = await api.addFollowup(id, draft); setPartners((items) => items.map((item) => item.id === id ? partner : item)); return partner; },
    importPartners: async (drafts) => { const result = await api.importPartners(drafts); await refresh(); toast(`成功导入 ${result.inserted} 家伙伴`, result.skipped ? `已跳过 ${result.skipped} 家重复公司` : '档案已更新到伙伴列表'); },
    createOpportunity: async (draft) => { const opportunity = await api.createOpportunity(draft); setOpportunities((items) => [opportunity, ...items]); return opportunity; },
    updateOpportunity: async (id, draft) => { const opportunity = await api.updateOpportunity(id, draft); setOpportunities((items) => items.map((item) => item.id === id ? opportunity : item)); return opportunity; },
    deleteOpportunity: async (id) => { await api.deleteOpportunity(id); setOpportunities((items) => items.filter((item) => item.id !== id)); },
    createContact: async (draft) => { const contact = await api.createContact(draft); setContacts((items) => [contact, ...items]); return contact; },
    updateContact: async (id, draft) => { const contact = await api.updateContact(id, draft); setContacts((items) => items.map((item) => item.id === id ? contact : item)); return contact; },
    moveContact: async (id, draft) => { const contact = await api.moveContact(id, draft); setContacts((items) => items.map((item) => item.id === id ? contact : item)); return contact; },
    deleteContact: async (id) => {
      await api.deleteContact(id);
      setContacts((items) => items.filter((item) => item.id !== id));
      setOpportunities((items) => items.map((item) => item.sourceContactId === id ? { ...item, sourceContactId: undefined } : item));
      setPartners((items) => items.map((partner) => ({ ...partner, followUps: partner.followUps.map((followup) => followup.contactId === id ? { ...followup, contactId: undefined } : followup) })));
    },
    openPartnerForm: (partner) => setPartnerForm(partner ?? null),
    openImport: () => setImportOpen(true),
    openFollowup: (partner) => setFollowupPartner(partner),
    openOpportunityForm: (options) => setOpportunityForm(options || {}),
    openContactForm: (options) => setContactForm(options || {}),
    openContactMove: (contact) => setContactMove(contact),
  }), [partners, opportunities, contacts, user, loading, toasts, refresh, toast, fontSize, setFontSize]);

  if (!authChecked) return <div className="auth-loading"><span className="loader" /><p>正在打开渠道工作区…</p></div>;
  if (!user) return <LoginPage onLogin={handleLogin} />;

  return <AppContext.Provider value={value}>
    {children}
    {partnerForm !== undefined && <PartnerFormPortal partner={partnerForm} onClose={() => setPartnerForm(undefined)} />}
    {importOpen && <ImportPortal onClose={() => setImportOpen(false)} />}
    {followupPartner && <FollowupPortal partner={followupPartner} onClose={() => setFollowupPartner(null)} />}
    {opportunityForm && <OpportunityPortal options={opportunityForm} onClose={() => setOpportunityForm(null)} />}
    {contactForm && <ContactFormPortal options={contactForm} onClose={() => setContactForm(null)} />}
    {contactMove && <ContactMovePortal contact={contactMove} onClose={() => setContactMove(null)} />}
    <ToastStack toasts={toasts} dismiss={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />
  </AppContext.Provider>;
}

function PartnerFormPortal({ partner, onClose }: { partner: Partner | null; onClose: () => void }) {
  const [Component, setComponent] = useState<React.ComponentType<{ partner: Partner | null; onClose: () => void }> | null>(null);
  useEffect(() => { import('./components/PartnerForm').then((module) => setComponent(() => module.default)); }, []);
  return Component ? <Component partner={partner} onClose={onClose} /> : null;
}
function ImportPortal({ onClose }: { onClose: () => void }) {
  const [Component, setComponent] = useState<React.ComponentType<{ onClose: () => void }> | null>(null);
  useEffect(() => { import('./components/ImportModal').then((module) => setComponent(() => module.default)); }, []);
  return Component ? <Component onClose={onClose} /> : null;
}
function FollowupPortal({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const [Component, setComponent] = useState<React.ComponentType<{ partner: Partner; onClose: () => void }> | null>(null);
  useEffect(() => { import('./components/FollowupForm').then((module) => setComponent(() => module.default)); }, []);
  return Component ? <Component partner={partner} onClose={onClose} /> : null;
}
function OpportunityPortal({ options, onClose }: { options: OpportunityFormOptions; onClose: () => void }) {
  const [Component, setComponent] = useState<React.ComponentType<{ options: OpportunityFormOptions; onClose: () => void }> | null>(null);
  useEffect(() => { import('./components/OpportunityForm').then((module) => setComponent(() => module.default)); }, []);
  return Component ? <Component options={options} onClose={onClose} /> : null;
}
function ContactFormPortal({ options, onClose }: { options: ContactFormOptions; onClose: () => void }) {
  const [Component, setComponent] = useState<React.ComponentType<{ options: ContactFormOptions; onClose: () => void }> | null>(null);
  useEffect(() => { import('./components/ContactForm').then((module) => setComponent(() => module.default)); }, []);
  return Component ? <Component options={options} onClose={onClose} /> : null;
}
function ContactMovePortal({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [Component, setComponent] = useState<React.ComponentType<{ contact: Contact; onClose: () => void }> | null>(null);
  useEffect(() => { import('./components/ContactMoveForm').then((module) => setComponent(() => module.default)); }, []);
  return Component ? <Component contact={contact} onClose={onClose} /> : null;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
