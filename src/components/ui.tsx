import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';

export function Page({ title, subtitle, back, action, children }: {
  title: string; subtitle?: ReactNode; back?: boolean | string; action?: ReactNode; children: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-5 pt-safe pb-32">
      <header className="flex min-h-16 items-end gap-3 pt-4 pb-4">
        {back && (
          <button aria-label="Enrere" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            className="glass -ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-95">
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[28px] leading-tight font-semibold tracking-tight">{title}</h1>
          {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
        </div>
        {action}
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function Card({ title, children, className, right }: { title?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={clsx('glass rounded-[26px] p-5', className)}>
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-[13px] font-medium tracking-wide text-muted">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ variant = 'secondary', size = 'md', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.97] disabled:opacity-40',
        size === 'sm' && 'h-9 rounded-xl px-3 text-sm',
        size === 'md' && 'h-12 rounded-2xl px-4',
        size === 'lg' && 'h-14 rounded-2xl px-6 text-[17px]',
        variant === 'primary' && 'bg-accent text-accent-ink shadow-[0_10px_28px_-12px_var(--accent)]',
        variant === 'secondary' && 'border border-line bg-surface-2 text-text',
        variant === 'ghost' && 'text-muted active:bg-surface-2',
        variant === 'danger' && 'bg-danger/12 text-danger',
        className,
      )}
    />
  );
}

/** Control numèric amb botons +/− grans */
export function Stepper({ value, onChange, step, min = 0, max = 9999, digits = 0, unit, label, compact }: {
  value: number; onChange: (v: number) => void; step: number; min?: number; max?: number;
  digits?: number; unit?: string; label?: string; compact?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const fmt = (v: number) => (digits ? v.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : String(v)).replace('.', ',');
  const set = (v: number) => { setText(null); onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100))); };
  const btn = clsx('flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 active:scale-95', compact ? 'h-11 w-11' : 'h-14 w-14');
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs text-muted">{label}</span>}
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Menys" className={btn} onClick={() => set(value - step)}><Minus size={20} /></button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center">
          <input
            inputMode="decimal"
            className="tabular w-full min-w-0 bg-transparent text-center text-[28px] font-semibold tracking-tight outline-none"
            value={text ?? fmt(value)}
            onChange={(e) => {
              setText(e.target.value);
              const v = parseFloat(e.target.value.replace(',', '.'));
              if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
            onFocus={(e) => { setText(fmt(value)); requestAnimationFrame(() => e.target.select()); }}
            onBlur={() => setText(null)}
          />
          {unit && <span className="ml-1 text-sm text-muted">{unit}</span>}
        </div>
        <button type="button" aria-label="Més" className={btn} onClick={() => set(value + step)}><Plus size={20} /></button>
      </div>
    </div>
  );
}

export function ProgressBar({ pct, color = 'bg-accent' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

const DOT = { info: 'bg-info', warn: 'bg-warn', danger: 'bg-danger', ok: 'bg-accent' } as const;

/** Avís discret: vidre amb un punt de color */
export function Notice({ tone = 'info', children, onClick }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={clsx('glass flex gap-3 rounded-2xl px-4 py-3 text-sm leading-snug', onClick && 'cursor-pointer active:opacity-80')}>
      <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT[tone])} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'accent' | 'warn' | 'danger' | 'info' }) {
  return (
    <span className={clsx(
      'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium',
      tone === 'muted' && 'bg-surface-2 text-muted',
      tone === 'accent' && 'bg-accent/14 text-accent',
      tone === 'warn' && 'bg-warn/14 text-warn',
      tone === 'danger' && 'bg-danger/14 text-danger',
      tone === 'info' && 'bg-info/14 text-info',
    )}>{children}</span>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: {
  value: T | undefined; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'md';
}) {
  return (
    <div className="flex gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={clsx('flex-1 rounded-xl px-2 font-medium transition', size === 'md' ? 'h-10 text-sm' : 'h-8 text-xs',
            value === o.value ? 'bg-text/12 text-text shadow-sm' : 'text-muted')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = 'h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-text outline-none placeholder:text-muted/70 focus:border-accent/60';

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'accent' | 'warn' | 'danger' }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3.5 py-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={clsx('tabular mt-0.5 text-xl font-semibold tracking-tight', tone === 'accent' && 'text-accent', tone === 'warn' && 'text-warn', tone === 'danger' && 'text-danger')}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

/** Fila de llista navegable (menús i pendents) */
export function Row({ to, onClick, icon, label, sub, right }: {
  to?: string; onClick?: () => void; icon?: ReactNode; label: ReactNode; sub?: ReactNode; right?: ReactNode;
}) {
  const inner = (
    <>
      {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{label}</span>
        {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
      </span>
      {right ?? ((to || onClick) && <ChevronRight size={18} className="shrink-0 text-muted" />)}
    </>
  );
  const cls = 'flex w-full items-center gap-3 py-3 text-left active:opacity-70';
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

/** Full inferior modal */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="glass-strong pb-safe max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-[30px] px-5 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-text/20" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Tancar" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted"><X size={18} /></button>
        </div>
        <div className="pb-6">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

/** Secció plegable per a informació secundària */
export function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="flex items-center gap-1 text-xs font-medium text-muted" onClick={() => setOpen(!open)}>
        {label} <ChevronRight size={14} className={clsx('transition', open && 'rotate-90')} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
