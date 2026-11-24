import clsx from 'clsx';
import type { Feeling } from '../db/types';

export const FEELINGS: { value: Feeling; emoji: string; label: string }[] = [
  { value: 1, emoji: '😣', label: 'Malament' },
  { value: 2, emoji: '😐', label: 'Regular' },
  { value: 3, emoji: '🙂', label: 'Bé' },
  { value: 4, emoji: '😄', label: 'Molt bé' },
];

export const feelingEmoji = (f?: Feeling) => FEELINGS.find((x) => x.value === f)?.emoji ?? '';

export function FeelingPicker({ value, onChange }: { value?: Feeling; onChange: (f: Feeling | undefined) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {FEELINGS.map((f) => (
        <button key={f.value} type="button" onClick={() => onChange(value === f.value ? undefined : f.value)}
          className={clsx('flex h-14 flex-col items-center justify-center rounded-xl text-xs', value === f.value ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted')}>
          <span className="text-xl leading-none">{f.emoji}</span>{f.label}
        </button>
      ))}
    </div>
  );
}
