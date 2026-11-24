import clsx from 'clsx';
import { BarChart3, CalendarDays, ClipboardCheck, ClipboardList, Database, Dumbbell, Flame, Luggage, Salad, Smartphone, TreePine, User, Zap } from 'lucide-react';
import { Card, Page, Row } from '../components/ui';
import { useProfile, useSessions, useWeighIns } from '../db/hooks';
import { setChristmas, setTravel } from '../lib/schedule';
import { analyzeWeight } from '../lib/weight';

const GROUPS = [
  { title: 'Seguiment', items: [
    { to: '/revisio', icon: ClipboardCheck, label: 'Revisió' },
    { to: '/resum', icon: BarChart3, label: 'Resum mensual' },
  ] },
  { title: 'Pla', items: [
    { to: '/mes/setmana', icon: CalendarDays, label: 'Setmana tipus' },
    { to: '/mes/rutina', icon: ClipboardList, label: 'Rutines' },
    { to: '/mes/maquines', icon: Dumbbell, label: 'Màquines' },
    { to: '/mes/alimentacio', icon: Salad, label: 'Alimentació' },
  ] },
  { title: 'Configuració', items: [
    { to: '/mes/perfil', icon: User, label: 'Perfil' },
    { to: '/mes/calories', icon: Flame, label: 'Calories' },
    { to: '/mes/dreceres', icon: Zap, label: 'Dreceres' },
    { to: '/mes/dades', icon: Database, label: 'Dades' },
    { to: '/mes/installar', icon: Smartphone, label: 'Instal·lar' },
  ] },
];

export function MorePage() {
  return (
    <Page title="Més">
      <ModesCard />
      {GROUPS.map((g) => (
        <Card key={g.title} title={g.title} className="py-3">
          <div className="-mt-2 divide-y divide-line">
            {g.items.map(({ to, icon: Icon, label }) => <Row key={to} to={to} icon={<Icon size={18} />} label={label} />)}
          </div>
        </Card>
      ))}
    </Page>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={clsx('relative h-7 w-12 shrink-0 rounded-full border border-line transition', on ? 'bg-accent' : 'bg-surface-2')}>
      <span className={clsx('absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

function ModesCard() {
  const profile = useProfile();
  const sessions = useSessions();
  const weighIns = useWeighIns();
  if (!profile || !sessions || !weighIns) return null;
  const m = profile.modes;
  const current = analyzeWeight(profile, weighIns).current;
  return (
    <Card title="Modes" className="py-3">
      <div className="-mt-2 divide-y divide-line">
        <Row icon={<Luggage size={18} />} label="Viatge"
          right={<Toggle on={!!m?.travel.active} onChange={(v) => setTravel(v, profile, sessions)} />} />
        <Row icon={<TreePine size={18} />} label="Nadal"
          right={<Toggle on={!!m?.christmas.active} onChange={(v) => setChristmas(v, profile, current)} />} />
      </div>
    </Card>
  );
}
