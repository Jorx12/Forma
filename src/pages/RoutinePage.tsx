import { ArrowDown, ArrowUp, Plus, RefreshCw, Replace, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MUSCLE_LABEL, PATTERN_LABEL, PATTERN_SHORT, WARMUP } from '../data/catalog';
import { db, uid } from '../db/db';
import { useActiveRoutine, useExercises, useProfile } from '../db/hooks';
import type { DayKey, Exercise, Profile, Routine, RoutineItem } from '../db/types';
import { ExerciseBadges } from '../components/ExerciseBadges';
import { Button, Card, Disclosure, Empty, Field, Notice, Page, Segmented, Sheet, Stepper } from '../components/ui';
import { CARDIO_ALLOWED, CARDIO_MACHINES, HIIT_PROTOCOLS } from '../data/cardio';
import { dayLabel, personalRoutine } from '../data/plan';
import { durationLabel, type SessionPlan, MAX_MINUTES, MIN_MINUTES, planSession, sessionMinutes } from '../lib/duration';
import { defaultItem, generateRoutine, newRoutine, scoreExercise, usable } from '../lib/generator';

export async function createRoutine(exercises: Exercise[], profile: Profile, jitter = 0) {
  const { days, warnings } = generateRoutine(exercises, profile, jitter);
  const r = newRoutine(days, uid());
  await db.transaction('rw', db.routines, async () => {
    await db.routines.toCollection().modify({ active: false });
    await db.routines.put(r);
  });
  return warnings;
}

type SheetState =
  | { kind: 'swap'; day: DayKey; idx: number }
  | { kind: 'edit'; day: DayKey; idx: number }
  | { kind: 'add'; day: DayKey }
  | null;

export function RoutinePage() {
  const profile = useProfile();
  const exercises = useExercises();
  const routine = useActiveRoutine();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sheet, setSheet] = useState<SheetState>(null);
  if (!profile || !exercises || routine === undefined) return null;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const mins = sessionMinutes(profile);

  async function regenerate() {
    if (routine && !confirm(routine.template ? 'Generar una rutina automàtica A/B/C? Substituirà el teu pla personal (el podràs restaurar i l\'historial es manté).' : 'Generar una rutina nova? Substituirà l\'actual (l\'historial es manté).')) return;
    setWarnings(await createRoutine(exercises!, profile!, routine ? 1 : 0));
  }
  async function restorePlan() {
    if (!confirm('Restaurar les rutines del pla personal (Força A, Força B i hotel)? La rutina actual queda guardada a l\'historial.')) return;
    await db.transaction('rw', db.routines, db.exercises, async () => {
      await db.routines.toCollection().modify({ active: false });
      const r = personalRoutine(uid());
      await db.routines.put(r);
      const ids = r.days.flatMap((d) => d.items.flatMap((i) => [i.exerciseId, ...(i.altIds ?? [])]));
      await db.exercises.where('id').anyOf(ids).modify({ available: true });
    });
  }
  const planOpts = (d: Routine['days'][number]) => ({ fixed: routine?.fixed, day: d });

  const update = (fn: (r: Routine) => void) => {
    const r = structuredClone(routine!);
    fn(r);
    return db.routines.put(r);
  };
  const dayItems = (r: Routine, k: DayKey) => r.days.find((d) => d.key === k)!.items;

  return (
    <Page title="Rutines" back="/mes" action={<button aria-label="Generar rutina automàtica" onClick={regenerate} className="glass flex h-10 w-10 items-center justify-center rounded-full"><RefreshCw size={17} /></button>}>
      {warnings.map((w) => <Notice key={w} tone="warn">{w}</Notice>)}
      {routine && !routine.template && (
        <Notice tone="info">Rutina automàtica. <button className="font-semibold text-accent" onClick={restorePlan}>Tornar al pla</button></Notice>
      )}
      {!routine ? (
        <Card>
          <Empty>Encara no tens cap rutina.</Empty>
          <p className="mb-3 text-sm text-muted">Revisa primer el catàleg de màquines (quines tens i quines t'agraden) i després genera la rutina.</p>
          <Button variant="primary" size="lg" className="w-full" onClick={restorePlan}>Fer servir el pla personal (A, B i hotel)</Button>
          <Button size="lg" className="mt-2 w-full" onClick={regenerate}>Generar rutina full body A/B/C</Button>
        </Card>
      ) : (
        <>
          <Card>
            <Stepper value={mins} step={5} min={MIN_MINUTES} max={MAX_MINUTES} unit="min"
              onChange={(v) => db.profile.update('me', { sessionMinutes: v })} />
            <StructureSummary profile={profile} plan={planSession(routine.days[0]?.items ?? [], mins, byId, profile, planOpts(routine.days[0]))} />
          </Card>
          {routine.days.map((d) => { const plan = planSession(d.items, mins, byId, profile, planOpts(d)); const fit = plan.strength; return (
            <Card key={d.key} title={dayLabel(d.key, routine.days)}
              right={<span className="text-xs text-muted">{d.circuit ? `${Math.max(0, ...d.items.map((i) => i.sets))} voltes · ` : ''}≈{fit.minutes} min</span>}>
              <ol className="-mt-1 divide-y divide-line">
                {d.items.map((it, i) => {
                  const e = byId.get(it.exerciseId);
                  const fi = fit.included.indexOf(i);
                  const fitted = fi === -1 ? null : fit.items[fi];
                  const u = e?.measure === 'seconds' ? ' s' : '';
                  const r = it.repMin === it.repMax ? `${it.repMin}${u}` : `${it.repMin}–${it.repMax}${u}`;
                  return (
                    <li key={`${it.exerciseId}-${i}`} className={fitted ? '' : 'opacity-45'}>
                      <button className="flex w-full items-center gap-3 py-3 text-left active:opacity-70" onClick={() => setSheet({ kind: 'edit', day: d.key, idx: i })}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium">{e?.name ?? 'Exercici esborrat'}{e?.footImpact === 'alt' && ' ⚠️'}</span>
                          <span className="block text-xs text-muted">{fitted ? fitted.sets : it.sets} × {r}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <button className="mt-1 flex items-center gap-1.5 text-sm font-medium text-muted" onClick={() => setSheet({ kind: 'add', day: d.key })}><Plus size={16} /> Afegir</button>
            </Card>
          ); })}
          <CardioSettings profile={profile} />
          {!routine.fixed && <WeeklyBalance days={routine.days.map((d) => planSession(d.items, mins, byId, profile, planOpts(d)).strength.items)} minutes={mins} />}
        </>
      )}

      <Card>
        <Disclosure label="Escalfament">
          <ul className="space-y-1.5 text-sm text-muted">{WARMUP.map((w) => <li key={w.id}>· {w.label}</li>)}</ul>
        </Disclosure>
      </Card>

      <Sheet open={!!sheet} onClose={() => setSheet(null)}
        title={sheet?.kind === 'swap' ? 'Substituir' : sheet?.kind === 'edit' ? 'Exercici' : 'Afegir exercici'}>
        {sheet && routine && (sheet.kind === 'edit' ? (
          <>
            <p className="-mt-2 mb-4 font-medium">{byId.get(dayItems(routine, sheet.day)[sheet.idx].exerciseId)?.name}</p>
            <ItemEditor item={dayItems(routine, sheet.day)[sheet.idx]} onSave={async (it) => { await update((r) => { dayItems(r, sheet.day)[sheet.idx] = it; }); setSheet(null); }} />
            <div className="mt-3 grid grid-cols-4 gap-2">
              <Button size="sm" onClick={() => setSheet({ kind: 'swap', day: sheet.day, idx: sheet.idx })}><Replace size={16} /></Button>
              <Button size="sm" disabled={sheet.idx === 0} onClick={async () => { await update((r) => { const a = dayItems(r, sheet.day); [a[sheet.idx - 1], a[sheet.idx]] = [a[sheet.idx], a[sheet.idx - 1]]; }); setSheet({ ...sheet, idx: sheet.idx - 1 }); }}><ArrowUp size={16} /></Button>
              <Button size="sm" disabled={sheet.idx >= dayItems(routine, sheet.day).length - 1} onClick={async () => { await update((r) => { const a = dayItems(r, sheet.day); [a[sheet.idx + 1], a[sheet.idx]] = [a[sheet.idx], a[sheet.idx + 1]]; }); setSheet({ ...sheet, idx: sheet.idx + 1 }); }}><ArrowDown size={16} /></Button>
              <Button size="sm" variant="danger" onClick={async () => { if (!confirm('Treure aquest exercici?')) return; await update((r) => { dayItems(r, sheet.day).splice(sheet.idx, 1); }); setSheet(null); }}><Trash2 size={16} /></Button>
            </div>
          </>
        ) : (
          <ExercisePicker
            exercises={exercises} profile={profile}
            slot={sheet.kind === 'swap' ? dayItems(routine, sheet.day)[sheet.idx].slot : undefined}
            currentId={sheet.kind === 'swap' ? dayItems(routine, sheet.day)[sheet.idx].exerciseId : undefined}
            onPick={async (e) => {
              await update((r) => {
                const items = dayItems(r, sheet.day);
                if (sheet.kind === 'swap') {
                  const old = items[sheet.idx];
                  const fresh = defaultItem(e, old.slot, profile);
                  items[sheet.idx] = { ...fresh, sets: old.sets };
                } else items.push(defaultItem(e, e.pattern, profile));
              });
              setSheet(null);
            }}
          />
        ))}
      </Sheet>
    </Page>
  );
}

function WeeklyBalance({ days, minutes }: { days: RoutineItem[][]; minutes: number }) {
  const counts = new Map<string, number>();
  days.forEach((items) => items.forEach((i) => counts.set(i.slot, (counts.get(i.slot) ?? 0) + i.sets)));
  const keys = ['push_h', 'push_v', 'pull_h', 'pull_v', 'knee', 'hip', 'isolation', 'core'] as const;
  return (
    <Card title={`Sèries setmanals per patró (${durationLabel(minutes)}/dia)`}>
      <div className="grid grid-cols-4 gap-2 text-center">
        {keys.map((k) => (
          <div key={k} className="rounded-xl bg-surface-2 py-2">
            <div className="tabular text-lg font-bold">{counts.get(k) ?? 0}</div>
            <div className="text-[11px] text-muted">{PATTERN_SHORT[k]}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ItemEditor({ item, onSave }: { item: RoutineItem; onSave: (it: RoutineItem) => void }) {
  const [it, setIt] = useState(item);
  return (
    <div className="space-y-3">
      <Stepper label="Sèries" value={it.sets} step={1} min={1} max={8} onChange={(v) => setIt({ ...it, sets: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Stepper compact label="Reps mínimes" value={it.repMin} step={1} min={1} max={50} onChange={(v) => setIt({ ...it, repMin: v, repMax: Math.max(v, it.repMax) })} />
        <Stepper compact label="Reps màximes" value={it.repMax} step={1} min={1} max={50} onChange={(v) => setIt({ ...it, repMax: v, repMin: Math.min(v, it.repMin) })} />
      </div>
      <Stepper label="Descans (s)" value={it.restSec} step={15} min={15} max={600} unit="s" onChange={(v) => setIt({ ...it, restSec: v })} />
      <Button variant="primary" size="lg" className="w-full" onClick={() => onSave(it)}>Desar</Button>
    </div>
  );
}

export function ExercisePicker({ exercises, profile, slot, currentId, onPick }: {
  exercises: Exercise[]; profile: Profile; slot?: RoutineItem['slot']; currentId?: string; onPick: (e: Exercise) => void;
}) {
  const [scope, setScope] = useState<'patro' | 'tots'>(slot ? 'patro' : 'tots');
  const fasc = profile.conditions.plantarFasciitis;
  const list = exercises
    .filter((e) => e.id !== currentId && e.available)
    .filter((e) => scope === 'tots' || !slot || e.pattern === slot)
    .sort((a, b) => (Number(usable(b)) - Number(usable(a))) || scoreExercise(b, fasc) - scoreExercise(a, fasc));
  return (
    <div className="space-y-3">
      {slot && (
        <Field label={`Patró: ${PATTERN_LABEL[slot]}`}>
          <Segmented value={scope} onChange={setScope} options={[{ value: 'patro', label: 'Mateix patró' }, { value: 'tots', label: 'Totes' }]} />
        </Field>
      )}
      {list.length === 0 && <Empty>No hi ha alternatives disponibles. Marca més màquines al catàleg.</Empty>}
      <ul className="divide-y divide-line">
        {list.map((e) => (
          <li key={e.id}>
            <button className="w-full py-2.5 text-left active:opacity-70" onClick={() => onPick(e)}>
              <div className="font-medium">{e.name} <span className="text-xs text-muted">· {MUSCLE_LABEL[e.muscleGroup]}</span></div>
              <ExerciseBadges e={e} />
              {e.preference === 'dislike' && <div className="mt-1 text-xs text-danger">Marcada com a «no m'agrada»</div>}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Només surten les màquines marcades com «la tinc». Ordenades per preferència, posició i impacte al peu.</p>
    </div>
  );
}


function StructureSummary({ plan, profile }: { plan: SessionPlan; profile: Profile }) {
  const on = profile.cardio?.enabled ?? true;
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-surface-2 py-2"><div className="tabular font-bold">{plan.warmupMin}'</div><div className="text-[11px] text-muted">Escalfament</div></div>
      <div className="rounded-xl bg-surface-2 py-2"><div className="tabular font-bold">{plan.strength.minutes}'</div><div className="text-[11px] text-muted">Força</div></div>
      <div className="rounded-xl bg-surface-2 py-2"><div className="tabular font-bold">{on && plan.cardio ? `${plan.cardio.plannedMin}'` : '—'}</div><div className="text-[11px] text-muted">Cardio</div></div>
    </div>
  );
}

function CardioSettings({ profile }: { profile: Profile }) {
  const c = profile.cardio ?? { enabled: true, machine: 'bici' as const, protocolId: 'continu' };
  const set = (patch: Partial<typeof c>) => db.profile.update('me', { cardio: { ...c, ...patch } });
  return (
    <Card title="Cardio" right={
      <button role="switch" aria-checked={c.enabled} onClick={() => set({ enabled: !c.enabled })}
        className={`relative h-7 w-12 rounded-full border border-line transition ${c.enabled ? 'bg-accent' : 'bg-surface-2'}`}>
        <span className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow transition-all ${c.enabled ? 'left-[22px]' : 'left-0.5'}`} />
      </button>}>
      {c.enabled ? (
        <div className="space-y-3">
          <Segmented value={c.machine} onChange={(v) => set({ machine: v })}
            options={CARDIO_MACHINES.filter((m) => CARDIO_ALLOWED.includes(m.id)).map((m) => ({ value: m.id, label: m.label.split(' (')[0].replace('Bici estàtica', 'Bici') }))} />
          <select className="h-11 w-full rounded-2xl border border-line bg-surface-2 px-4 text-sm" value={c.protocolId} onChange={(e) => set({ protocolId: e.target.value })}>
            {HIIT_PROTOCOLS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <p className="text-xs text-muted">Sense cinta ni salts.</p>
        </div>
      ) : null}
    </Card>
  );
}
