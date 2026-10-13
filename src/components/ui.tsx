import React, { useEffect } from 'react';
import { Icon } from './Icon';

export function Modal({
  open, title, subtitle, onClose, children, footer,
}: {
  open: boolean; title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{title}</h3>
            {subtitle && <p className="small muted mt-8">{subtitle}</p>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
        {footer && <div className="divider" />}
        {footer}
      </div>
    </div>
  );
}

export function Empty({ icon = '📅', title, text, action }: { icon?: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3 className="card-title">{title}</h3>
      {text && <p className="small muted mt-8" style={{ maxWidth: 420, margin: '8px auto 0' }}>{text}</p>}
      {action && <div className="mt-16">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = '' }: { children: React.ReactNode; tone?: '' | 'neon' | 'ok' | 'warn' | 'danger' }) {
  return <span className={`badge ${tone ? 'badge-' + tone : ''}`}>{children}</span>;
}

export function StatCard({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="kpi-card">
      <div className="flex-between">
        <span>{label}</span>
        <span className="muted">{icon}</span>
      </div>
      <b>{value}</b>
      {hint && <p className="small muted mt-8">{hint}</p>}
    </div>
  );
}

export function Field({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="small muted">{hint}</span>}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.max(3, Math.min(100, value))}%`,
          height: '100%',
          borderRadius: 99,
          background: 'linear-gradient(90deg, var(--neon-1), var(--neon-3))',
          transition: 'width .4s ease',
        }}
      />
    </div>
  );
}

/** Foto com fallback neon quando a imagem falha (ex.: URL quebrada) */
export function SmartImage({
  src, alt, className, emoji, style,
}: { src?: string; alt: string; className?: string; emoji?: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) {
    return (
      <div
        className={className}
        style={{
          display: 'grid', placeItems: 'center', fontSize: 34,
          background: 'radial-gradient(120% 100% at 20% 0%, rgba(11,99,255,.42), rgba(4,5,10,.9) 70%)',
          border: '1px solid var(--line)', ...style,
        }}
        aria-label={alt}
        role="img"
      >
        {emoji || '💈'}
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} style={style} />;
}

export function ConfirmButton({
  onConfirm, children, className = 'btn btn-danger btn-sm', confirmLabel = 'Confirmar?',
}: { onConfirm: () => void; children: React.ReactNode; className?: string; confirmLabel?: string }) {
  const [armed, setArmed] = React.useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={className}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
