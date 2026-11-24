import { Card, inputCls, Page } from '../components/ui';
import { ACTIVITY_INFO, DEFAULT_WEEK_PLAN, WEEK_ORDER, WEEKDAY_LABEL } from '../data/plan';
import { db } from '../db/db';
import { useProfile } from '../db/hooks';
import type { PlanActivity } from '../db/types';
import { Button } from '../components/ui';

const OPTIONS: PlanActivity[] = ['natacio', 'forca_A', 'forca_B', 'hotel', 'extra', 'descans'];

export function WeekPlanPage() {
  const profile = useProfile();
  if (!profile) return null;
  const plan = profile.weekPlan ?? DEFAULT_WEEK_PLAN;
  const set = (wd: number, a: PlanActivity) => db.profile.update('me', { weekPlan: { ...plan, [wd]: a } });
  return (
    <Page title="Setmana tipus" back="/mes">
      <p className="-mt-2 text-sm text-muted">El que toca cada dia. Per canviar un dia concret (p. ex. passar la Força B a dijous), fes-ho des de la pantalla Avui amb «Moure a un altre dia».</p>
      <Card>
        <ul className="space-y-2">
          {WEEK_ORDER.map((wd) => (
            <li key={wd} className="grid grid-cols-[6rem_1fr] items-center gap-2">
              <span className="font-medium">{WEEKDAY_LABEL[wd]}</span>
              <select className={inputCls} value={plan[wd] ?? 'descans'} onChange={(e) => set(wd, e.target.value as PlanActivity)}>
                {OPTIONS.map((o) => <option key={o} value={o}>{ACTIVITY_INFO[o].emoji} {ACTIVITY_INFO[o].label} · {ACTIVITY_INFO[o].sub}</option>)}
              </select>
            </li>
          ))}
        </ul>
      </Card>
      <Button variant="ghost" className="w-full" onClick={() => { if (confirm('Tornar a la setmana tipus del pla?')) void db.profile.update('me', { weekPlan: { ...DEFAULT_WEEK_PLAN } }); }}>Restaurar la setmana del pla</Button>
    </Page>
  );
}
