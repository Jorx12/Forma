import { useEffect, useState } from 'react';
import { db, setMeta } from '../db/db';
import { useMeta, useProfile } from '../db/hooks';
import type { Profile } from '../db/types';
import { Button, Card, Disclosure, Field, inputCls, Page, Segmented } from '../components/ui';

export function ProfilePage() {
  const stored = useProfile();
  const theme = useMeta<'dark' | 'light'>('theme');
  const [p, setP] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (stored && !p) setP(stored); }, [stored, p]);
  if (!p) return null;
  const dirty = !!stored && JSON.stringify(stored) !== JSON.stringify(p);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });
  const num = (v: string) => parseFloat(v.replace(',', '.'));
  const numInput = (value: number, onChange: (n: number) => void, step = '1') => (
    <input className={inputCls} inputMode="decimal" type="number" step={step} defaultValue={value}
      onChange={(e) => { const n = num(e.target.value); if (Number.isFinite(n)) onChange(n); }} />
  );

  async function save() {
    await db.profile.put(p!);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Page title="Perfil" back="/mes">
      <Card title="Dades personals">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sexe">
            <Segmented value={p.sex} onChange={(v) => set('sex', v)} options={[{ value: 'home', label: 'Home' }, { value: 'dona', label: 'Dona' }]} />
          </Field>
          <Field label="Edat">{numInput(p.age, (n) => set('age', n))}</Field>
          <Field label="Alçada (cm)">{numInput(p.heightCm, (n) => set('heightCm', n))}</Field>
          <Field label="Pes inicial (kg)">{numInput(p.startWeightKg, (n) => set('startWeightKg', n), '0.1')}</Field>
          <Field label="Data d'inici">
            <input type="date" className={inputCls} value={p.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field label="Entrenaments/setmana">{numInput(p.sessionsPerWeek, (n) => set('sessionsPerWeek', n))}</Field>
        </div>
        <label className="mt-3 flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={p.conditions.plantarFasciitis}
            onChange={(e) => set('conditions', { ...p.conditions, plantarFasciitis: e.target.checked })} />
          Tinc fascitis plantar (prioritzar exercicis de baix impacte al peu)
        </label>
        <Field label="Notes">
          <textarea className={`${inputCls} mt-1 h-20 py-2`} value={p.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </Card>

      <Card title="Ajustos">
       <div className="space-y-5">
       <Disclosure label="Fites de pes">
        <div className="space-y-4">
          {p.goals.map((g, i) => (
            <div key={g.id} className="grid grid-cols-3 gap-2">
              <Field label={`${g.label} (kg)`}>{numInput(g.targetKg, (n) => set('goals', p.goals.map((x, j) => j === i ? { ...x, targetKg: n } : x)), '0.5')}</Field>
              <Field label="Des de"><input type="date" className={inputCls} value={g.dateFrom} onChange={(e) => set('goals', p.goals.map((x, j) => j === i ? { ...x, dateFrom: e.target.value } : x))} /></Field>
              <Field label="Fins a"><input type="date" className={inputCls} value={g.dateTo} onChange={(e) => set('goals', p.goals.map((x, j) => j === i ? { ...x, dateTo: e.target.value } : x))} /></Field>
            </div>
          ))}
          <p className="text-xs text-muted">Les fites mensuals del pla marquen la línia objectiu del gràfic.</p>
        </div>
      </Disclosure>

      <Disclosure label="Referència calòrica">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Factor activitat">{numInput(p.activityFactor, (n) => set('activityFactor', n), '0.05')}</Field>
          <Field label="Dèficit (kcal)">{numInput(p.deficitKcal, (n) => set('deficitKcal', n), '10')}</Field>
          <Field label="Proteïna g/kg">{numInput(p.proteinPerKg, (n) => set('proteinPerKg', n), '0.1')}</Field>
        </div>
      </Disclosure>

      <Disclosure label="Entrenament">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Increment tren superior (kg)">{numInput(p.defaultIncrementKg.upper, (n) => set('defaultIncrementKg', { ...p.defaultIncrementKg, upper: n }), '0.5')}</Field>
          <Field label="Increment tren inferior (kg)">{numInput(p.defaultIncrementKg.lower, (n) => set('defaultIncrementKg', { ...p.defaultIncrementKg, lower: n }), '0.5')}</Field>
          <Field label="Descans compostos (s)">{numInput(p.restSec.compound, (n) => set('restSec', { ...p.restSec, compound: n }), '15')}</Field>
          <Field label="Descans aïllaments (s)">{numInput(p.restSec.isolation, (n) => set('restSec', { ...p.restSec, isolation: n }), '15')}</Field>
          <Field label="Setmanes d'adaptació">{numInput(p.adaptationWeeks, (n) => set('adaptationWeeks', n))}</Field>
          <Field label="Descàrrega cada (setm.)" hint="0 = desactivat">{numInput(p.deloadEveryWeeks ?? 0, (n) => set('deloadEveryWeeks', n > 0 ? n : null))}</Field>
        </div>
      </Disclosure>
       </div>
      </Card>

      <Card title="Aparença">
        <Segmented value={theme ?? 'dark'} onChange={(v) => setMeta('theme', v)} options={[{ value: 'dark', label: 'Fosc' }, { value: 'light', label: 'Clar' }]} />
      </Card>

      {(dirty || saved) && (
        <div className="fixed inset-x-0 bottom-[92px] z-30 mx-auto max-w-xl px-5">
          <Button variant="primary" size="lg" className="w-full" onClick={save}>{saved ? 'Desat ✓' : 'Desar canvis'}</Button>
        </div>
      )}
    </Page>
  );
}
