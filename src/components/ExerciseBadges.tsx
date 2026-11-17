import { AlertTriangle } from 'lucide-react';
import { FOOT_LABEL, PATTERN_SHORT, POSITION_LABEL } from '../data/catalog';
import type { Exercise } from '../db/types';
import { Badge } from './ui';

export function FootBadge({ e }: { e: Exercise }) {
  if (e.footImpact === 'alt') return <Badge tone="danger"><AlertTriangle size={12} /> Peu: alt</Badge>;
  if (e.footImpact === 'mitja') return <Badge tone="warn">Peu: mitjà</Badge>;
  return <Badge tone="accent">Peu: {FOOT_LABEL[e.footImpact].toLowerCase()}</Badge>;
}

export function ExerciseBadges({ e, pattern = true }: { e: Exercise; pattern?: boolean }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {pattern && <Badge>{PATTERN_SHORT[e.pattern]}</Badge>}
      <Badge>{POSITION_LABEL[e.position]}</Badge>
      <FootBadge e={e} />
      {e.preference === 'like' && <Badge tone="accent">♥</Badge>}
    </div>
  );
}
