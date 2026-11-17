import clsx from 'clsx';
import { ChevronLeft, Minus, Plus, X } from 'lucide-react';
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

export function Page({ title, back, action, children }: { title: string; back?: boolean | string; action?: ReactNode; children: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-4 pb-28 pt-safe">
      <header className="sticky top-0 z-20 -mx-4 mb-3 flex min-h-14 items-center gap-2 bg-bg/95 px-4 pt-2 pb-2 backdrop-blur">
        {back && (
          <button
            aria-label="Enrere"
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-surface-2"
          >
            <ChevronLeft size={26} />
          </button>
        )}
        <h1 className="flex-1 truncate text-2xl font-bold">{title}</h1>
        {action}
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function Card({ title, children, className, right }: { title?: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={clsx('rounded-2xl border border-line bg-surface p-4', className)}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>}
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
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.97] disabled:opacity-40',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-12 px-4',
        size === 'lg' && 'h-16 px-6 text-lg',
        variant === 'primary' && 'bg-accent text-accent-ink',
        variant === 'secondary' && 'bg-surface-2 text-text',
        variant === 'ghost' && 'text-muted active:bg-surface-2',
        variant === 'danger' && 'bg-danger/15 text-danger',
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
  const btn = clsx('flex shrink-0 items-center justify-center rounded-xl bg-surface-2 active:bg-line', compact ? 'h-12 w-12' : 'h-14 w-14');
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs text-muted">{label}</span>}
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Menys" className={btn} onClick={() => set(value - step)}><Minus size={22} /></button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center">
          <input
            inputMode="decimal"
            className="tabular w-full min-w-0 bg-transparent text-center text-2xl font-bold outline-none"
            value={text ?? fmt(value)}
            onChange={(e) => {
              setText(e.target.value);
              const v = parseFloat(e.target.value.replace(',', '.'));
              if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
            onFocus={(e) => { setText(fmt(value)); requestAnimationFrame(() => e.target.select()); }}
            onBlur={() => setText(null)}
          />
          {unit && <span className="ml-0.5 text-sm text-muted">{unit}</span>}
        </div>
        <button type="button" aria-label="Més" className={btn} onClick={() => set(value + step)}><Plus size={22} /></button>
      </div>
    </div>
  );
}

export function ProgressBar({ pct, color = 'bg-accent' }: { pct: number; color?: string }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-surface-2">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Notice({ tone = 'info', children, onClick }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-xl border px-3 py-2.5 text-sm',
        onClick && 'cursor-pointer active:opacity-80',
        tone === 'info' && 'border-info/30 bg-info/10 text-info',
        tone === 'warn' && 'border-warn/30 bg-warn/10 text-warn',
        tone === 'danger' && 'border-danger/30 bg-danger/10 text-danger',
        tone === 'ok' && 'border-accent/30 bg-accent/10 text-accent',
      )}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'accent' | 'warn' | 'danger' | 'info' }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
      tone === 'muted' && 'bg-surface-2 text-muted',
      tone === 'accent' && 'bg-accent/15 text-accent',
      tone === 'warn' && 'bg-warn/15 text-warn',
      tone === 'danger' && 'bg-danger/15 text-danger',
      tone === 'info' && 'bg-info/15 text-info',
    )}>{children}</span>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: {
  value: T | undefined; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'md';
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex-1 rounded-lg px-2 font-medium transition',
            size === 'md' ? 'h-10 text-sm' : 'h-8 text-xs',
            value === o.value ? 'bg-surface text-text shadow' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = 'h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-text outline-none focus:border-accent';

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'accent' | 'warn' | 'danger' }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={clsx('tabular mt-0.5 text-xl font-bold', tone === 'accent' && 'text-accent', tone === 'warn' && 'text-warn', tone === 'danger' && 'text-danger')}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="pb-safe max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border-t border-line bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button aria-label="Tancar" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-2"><X /></button>
        </div>
        <div className="pb-4">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}
