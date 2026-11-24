import clsx from 'clsx';
import type { Feeling } from '../db/types';
import { FEELING_ICON } from './Icons';

export const FEELINGS: { value: Feeling; label: string }[] = [
  { value: 1, label: 'Malament' },
  { value: 2, label: 'Regular' },
  { value: 3, label: 'Bé' },
  { value: 4, label: 'Molt bé' },
];

export function FeelingPicker({ value, onChange }: { value?: Feeling; onChange: (f: Feeling | undefined) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {FEELINGS.map((f) => {
        const I = FEELING_ICON[f.value];
        const on = value === f.value;
        return (
          <button key={f.value} type="button" onClick={() => onChange(on ? undefined : f.value)} aria-label={f.label}
            className={clsx('flex h-12 items-center justify-center rounded-2xl border transition', on ? 'border-accent/50 bg-accent/15 text-accent' : 'border-line bg-surface-2 text-muted')}>
            <I size={22} strokeWidth={1.7} />
          </button>
        );
      })}
    </div>
  );
}
