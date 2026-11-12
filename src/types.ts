export type PartnerType = 'AGENT' | 'SI' | 'IPD' | 'EXPERT';
export type PartnerStatus = '未接触' | '已接触' | '已深聊' | '已谈合作框架' | '已签约' | '已激活' | '已暂停';
export type Batch = '首批联系' | '蓄水池' | '专项批次';
export type VerifyStatus = '待核实' | '已核实' | '已核实有误';
export type DimensionKey = 'overlap' | 'willingness' | 'decision' | 'sales' | 'benefit' | 'delivery';
export type Grade = 'A' | 'B' | 'C' | null;

export interface ScoreSet {
  overlap?: number;
  willingness?: number;
  decision?: number;
  sales?: number;
  benefit?: number;
  delivery?: number;
}

export interface FollowUp {
  id: string;
  partnerId: string;
  contactId?: string;
  date: string;
  channel: '上门' | '电话' | '微信' | '会场';
  summary: string;
  tags: string[];
  nextFollowupDate?: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  region: string;
  scale: string;
  businessDesc: string;
  decisionMaker: string;
  sourceName: string;
  sourceUrl: string;
  contact: string;
  verifyStatus: VerifyStatus;
  verifyNote: string;
  batch: Batch;
  priorityOrder: number;
  status: PartnerStatus;
  signDate?: string;
  note: string;
  scores: ScoreSet;
  followUps: FollowUp[];
  createdAt: string;
  updatedAt: string;
}

export interface PartnerDraft {
  name: string;
  type: PartnerType;
  region: string;
  scale: string;
  businessDesc: string;
  decisionMaker: string;
  sourceName: string;
  sourceUrl: string;
  contact: string;
  verifyStatus: VerifyStatus;
  verifyNote: string;
  batch: Batch;
  priorityOrder: number;
  status: PartnerStatus;
  signDate?: string;
  note: string;
  scores?: ScoreSet;
}

export type ContactRole = '决策人' | '商务对接' | '售前' | '交付' | '普通联系人';
export type EmploymentStatus = '在职' | '已离职' | '待确认';

export interface ContactCareer {
  id: string;
  contactId: string;
  partnerId: string;
  title: string;
  startDate?: string;
  endDate?: string;
  note: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  partnerId: string;
  name: string;
  title: string;
  department: string;
  phone: string;
  wechat: string;
  email: string;
  role: ContactRole;
  isPrimary: boolean;
  employmentStatus: EmploymentStatus;
  notes: string;
  careers: ContactCareer[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactDraft {
  partnerId: string;
  name: string;
  title: string;
  department: string;
  phone: string;
  wechat: string;
  email: string;
  role: ContactRole;
  isPrimary: boolean;
  employmentStatus: EmploymentStatus;
  notes: string;
  startDate?: string;
}

export interface ContactMoveDraft {
  newPartnerId: string;
  title: string;
  startDate: string;
  note: string;
}

export type OpportunityStage = 'LEAD' | 'OPPORTUNITY';

export interface Opportunity {
  id: string;
  partnerId: string;
  customerName: string;
  name: string;
  demand: string;
  expectedAmount: number | null;
  stage: OpportunityStage;
  sourceFollowupId?: string;
  sourceContactId?: string;
  createdAt: string;
  convertedAt?: string;
  updatedAt: string;
}

export interface OpportunityDraft {
  partnerId: string;
  customerName: string;
  name: string;
  demand: string;
  expectedAmount: number | null;
  stage: OpportunityStage;
  sourceFollowupId?: string;
  sourceContactId?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  kind: 'success' | 'error' | 'info';
}
