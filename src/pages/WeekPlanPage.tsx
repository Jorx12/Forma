import { Card, inputCls, Page } from '../components/ui';
import { ACTIVITY_INFO, DEFAULT_WEEK_PLAN, WEEK_ORDER, WEEKDAY_LABEL } from '../data/plan';
import { db } from '../db/db';
import { useProfile } from '../db/hooks';
import type { PlanActivity } from '../db/types';
import { Button } from '../components/ui';
import { ActivityIcon } from '../components/Icons';

const OPTIONS: PlanActivity[] = ['natacio', 'forca_A', 'forca_B', 'hotel', 'extra', 'descans'];

export function WeekPlanPage() {
  const profile = useProfile();
  if (!profile) return null;
  const plan = profile.weekPlan ?? DEFAULT_WEEK_PLAN;
  const set = (wd: number, a: PlanActivity) => db.profile.update('me', { weekPlan: { ...plan, [wd]: a } });
  return (
    <Page title="Setmana" back="/mes">
      <Card>
        <ul className="space-y-2">
          {WEEK_ORDER.map((wd) => (
            <li key={wd} className="grid grid-cols-[1.5rem_5.5rem_1fr] items-center gap-2">
              <ActivityIcon activity={plan[wd] ?? 'descans'} size={18} className="text-accent" />
              <span className="font-medium">{WEEKDAY_LABEL[wd]}</span>
              <select className={inputCls} value={plan[wd] ?? 'descans'} onChange={(e) => set(wd, e.target.value as PlanActivity)}>
                {OPTIONS.map((o) => <option key={o} value={o}>{ACTIVITY_INFO[o].label}</option>)}
              </select>
            </li>
          ))}
        </ul>
      </Card>
      <Button variant="ghost" className="w-full" onClick={() => { if (confirm('Tornar a la setmana tipus del pla?')) void db.profile.update('me', { weekPlan: { ...DEFAULT_WEEK_PLAN } }); }}>Restaurar</Button>
    </Page>
  );
}
