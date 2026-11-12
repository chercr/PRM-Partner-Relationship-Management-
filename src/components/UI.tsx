import { useEffect, type ReactNode } from 'react';
import { AlertCircle, Check, CheckCircle2, Info, X } from 'lucide-react';
import { getInitials } from '../business';
import type { Grade, PartnerStatus } from '../types';

export function Modal({ title, subtitle, children, onClose, width = 'medium', footer }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; width?: 'small' | 'medium' | 'large'; footer?: ReactNode }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`modal modal-${width}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={19} /></button></header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </section>
  </div>;
}

export function PartnerAvatar({ name, size = 'medium' }: { name: string; size?: 'small' | 'medium' | 'large' }) {
  const hues = ['violet', 'green', 'blue', 'orange', 'rose'];
  const hue = hues[name.charCodeAt(0) % hues.length];
  return <span className={`partner-avatar avatar-${size} avatar-${hue}`}>{getInitials(name)}</span>;
}

export function GradeBadge({ grade, total, showLabel = false }: { grade: Grade; total?: number | null; showLabel?: boolean }) {
  if (!grade) return <span className="badge badge-neutral">待评估</span>;
  const labels = { A: '重点推进', B: '持续跟进', C: '观察' };
  return <span className={`grade-badge grade-${grade.toLowerCase()}`}><b>{grade}</b>{showLabel && <span>{labels[grade]}</span>}{total !== undefined && total !== null && !showLabel && <span>{total.toFixed(2)}</span>}</span>;
}

export function StatusBadge({ status }: { status: PartnerStatus }) {
  const kind = status === '已激活' ? 'success' : status === '已签约' ? 'purple' : status === '已暂停' ? 'danger' : status === '未接触' ? 'neutral' : 'blue';
  return <span className={`status-badge status-${kind}`}><i />{status}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state">{icon}<h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="toggle-label"><button type="button" className={`toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}><span /></button>{label}</label>;
}

export function ToastStack({ toasts, dismiss }: { toasts: import('../types').ToastMessage[]; dismiss: (id: number) => void }) {
  return <div className="toast-stack">{toasts.map((toast) => <div className={`toast toast-${toast.kind}`} key={toast.id}>
    {toast.kind === 'success' ? <CheckCircle2 size={19} /> : toast.kind === 'error' ? <AlertCircle size={19} /> : <Info size={19} />}
    <div><strong>{toast.title}</strong>{toast.description && <p>{toast.description}</p>}</div>
    <button onClick={() => dismiss(toast.id)}><X size={15} /></button>
  </div>)}</div>;
}

export function ScoreRing({ value, grade, size = 112 }: { value: number | null; grade: Grade; size?: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const percentage = value ? value / 5 : 0;
  return <div className={`score-ring ${grade ? `ring-${grade.toLowerCase()}` : ''}`} style={{ width: size, height: size }}>
    <svg viewBox="0 0 104 104"><circle className="ring-track" cx="52" cy="52" r={radius} /><circle className="ring-value" cx="52" cy="52" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percentage)} /></svg>
    <div><strong>{value?.toFixed(2) ?? '—'}</strong><span>{grade ? `${grade} 类伙伴` : '待评估'}</span></div>
  </div>;
}

export function CheckMark({ checked }: { checked: boolean }) {
  return <span className={`check-mark ${checked ? 'checked' : ''}`}>{checked && <Check size={13} />}</span>;
}
