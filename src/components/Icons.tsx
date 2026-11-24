import { Dumbbell, Flag, Frown, Laugh, Luggage, Meh, Moon, Smile, TreePine, TriangleAlert, Waves, type LucideIcon, type LucideProps } from 'lucide-react';
import type { Feeling, PlanActivity } from '../db/types';

/** Icones de línia (estil coherent a tota l'app, en lloc d'emojis) */
export const ACTIVITY_ICON: Record<PlanActivity, LucideIcon> = {
  natacio: Waves,
  forca_A: Dumbbell,
  forca_B: Dumbbell,
  hotel: Luggage,
  extra: Flag,
  descans: Moon,
};

export function ActivityIcon({ activity, ...p }: { activity: PlanActivity } & LucideProps) {
  const I = ACTIVITY_ICON[activity];
  return <I strokeWidth={1.6} {...p} />;
}

export const FEELING_ICON: Record<Feeling, LucideIcon> = { 1: Frown, 2: Meh, 3: Smile, 4: Laugh };

export function FeelingIcon({ value, size = 16, className }: { value?: Feeling; size?: number; className?: string }) {
  if (!value) return null;
  const I = FEELING_ICON[value];
  return <I size={size} strokeWidth={1.8} className={className ?? 'inline -mt-0.5 text-muted'} aria-label={['', 'Malament', 'Regular', 'Bé', 'Molt bé'][value]} />;
}

/** Avís de peu (fascitis), en línia amb el text */
export const FootWarn = ({ size = 13 }: { size?: number }) => <TriangleAlert size={size} strokeWidth={2} className="inline -mt-0.5 text-warn" aria-label="Impacte alt al peu" />;

export const ModeIcon = { travel: Luggage, christmas: TreePine };
