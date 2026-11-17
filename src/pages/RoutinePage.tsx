import { ArrowDown, ArrowUp, Pencil, Plus, RefreshCw, Replace, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MUSCLE_LABEL, PATTERN_LABEL, PATTERN_SHORT, WARMUP } from '../data/catalog';
import { db, uid } from '../db/db';
import { useActiveRoutine, useExercises, useProfile } from '../db/hooks';
import type { DayKey, Exercise, Profile, Routine, RoutineItem } from '../db/types';
import { ExerciseBadges } from '../components/ExerciseBadges';
import { Badge, Button, Card, Empty, Field, Notice, Page, Segmented, Sheet, Stepper } from '../components/ui';
import { CARDIO_MACHINES, HIIT_PROTOCOLS } from '../data/cardio';
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
    if (routine && !confirm('Generar una rutina nova? Substituirà l\'actual (l\'historial es manté).')) return;
    setWarnings(await createRoutine(exercises!, profile!, routine ? 1 : 0));
  }

  const update = (fn: (r: Routine) => void) => {
    const r = structuredClone(routine!);
    fn(r);
    return db.routines.put(r);
  };
  const dayItems = (r: Routine, k: DayKey) => r.days.find((d) => d.key === k)!.items;

  return (
    <Page title="Rutina" back="/mes" action={<Button size="sm" onClick={regenerate}><RefreshCw size={16} /> {routine ? 'Regenerar' : 'Generar'}</Button>}>
      {warnings.map((w) => <Notice key={w} tone="warn">{w}</Notice>)}
      {!routine ? (
        <Card>
          <Empty>Encara no tens cap rutina.</Empty>
          <p className="mb-3 text-sm text-muted">Revisa primer el catàleg de màquines (quines tens i quines t'agraden) i després genera la rutina.</p>
          <Button variant="primary" size="lg" className="w-full" onClick={regenerate}>Generar rutina full body A/B/C</Button>
        </Card>
      ) : (
        <>
          <Card title="Durada habitual">
            <Stepper value={mins} step={5} min={MIN_MINUTES} max={MAX_MINUTES} unit="min"
              onChange={(v) => db.profile.update('me', { sessionMinutes: v })} />
            <StructureSummary profile={profile} plan={planSession(routine.days[0]?.items ?? [], mins, byId, profile)} />
            <p className="mt-2 text-xs text-muted">
              Cada dia té els exercicis en ordre de prioritat. Segons el temps, s'hi afegeixen o se'n treuen els últims (mínim 4–5),
              i s'ajusten les sèries i els descansos. En començar l'entrenament pots triar el temps que tens aquell dia.
            </p>
          </Card>
          <CardioSettings profile={profile} />
          <p className="text-sm text-muted">Base: 3 sèries de 8–12 repeticions als compostos i de 10–15 als aïllaments. Descans de 90–120 s als compostos i de 60–90 s als aïllaments.</p>
          {routine.days.map((d) => { const plan = planSession(d.items, mins, byId, profile); const fit = plan.strength; return (
            <Card key={d.key} title={`Dia ${d.key} · força ≈${durationLabel(fit.minutes)}`}
              right={<Button size="sm" variant="ghost" onClick={() => setSheet({ kind: 'add', day: d.key })}><Plus size={16} /> Afegir</Button>}>
              <ol className="divide-y divide-line">
                {d.items.map((it, i) => {
                  const e = byId.get(it.exerciseId);
                  const fi = fit.included.indexOf(i);
                  const fitted = fi === -1 ? null : fit.items[fi];
                  return (
                    <li key={`${it.exerciseId}-${i}`} className={`py-2.5 ${fitted ? '' : 'opacity-50'}`}>
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 w-5 text-sm text-muted">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{e?.name ?? 'Exercici esborrat'}</div>
                          <div className="text-sm text-muted">
                            {fitted ? `${fitted.sets} × ${it.repMin}–${it.repMax} · descans ${fitted.restSec} s` : `Només en dies més llargs · ${it.sets} × ${it.repMin}–${it.repMax}`}
                          </div>
                          {e && <ExerciseBadges e={e} pattern={false} />}
                          <div className="mt-1"><Badge tone="info">{PATTERN_LABEL[it.slot]}</Badge></div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end gap-1">
                        <IconBtn label="Pujar" disabled={i === 0} onClick={() => update((r) => { const a = dayItems(r, d.key); [a[i - 1], a[i]] = [a[i], a[i - 1]]; })}><ArrowUp size={18} /></IconBtn>
                        <IconBtn label="Baixar" disabled={i === d.items.length - 1} onClick={() => update((r) => { const a = dayItems(r, d.key); [a[i + 1], a[i]] = [a[i], a[i + 1]]; })}><ArrowDown size={18} /></IconBtn>
                        <IconBtn label="Editar" onClick={() => setSheet({ kind: 'edit', day: d.key, idx: i })}><Pencil size={18} /></IconBtn>
                        <IconBtn label="Substituir" onClick={() => setSheet({ kind: 'swap', day: d.key, idx: i })}><Replace size={18} /></IconBtn>
                        <IconBtn label="Treure" onClick={() => { if (confirm('Treure aquest exercici del dia?')) update((r) => { dayItems(r, d.key).splice(i, 1); }); }}><Trash2 size={18} /></IconBtn>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Coverage items={fit.items} />
            </Card>
          ); })}
          <WeeklyBalance days={routine.days.map((d) => planSession(d.items, mins, byId, profile).strength.items)} minutes={mins} />
        </>
      )}

      <Card title="Escalfament (checklist)">
        <ul className="list-disc space-y-1 pl-5 text-sm">{WARMUP.map((w) => <li key={w.id}>{w.label}</li>)}</ul>
      </Card>

      <Sheet open={!!sheet} onClose={() => setSheet(null)}
        title={sheet?.kind === 'swap' ? 'Substituir exercici' : sheet?.kind === 'edit' ? 'Editar exercici' : 'Afegir exercici'}>
        {sheet && routine && (sheet.kind === 'edit' ? (
          <ItemEditor item={dayItems(routine, sheet.day)[sheet.idx]} onSave={async (it) => { await update((r) => { dayItems(r, sheet.day)[sheet.idx] = it; }); setSheet(null); }} />
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

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted active:bg-line disabled:opacity-30">{children}</button>
  );
}

function Coverage({ items }: { items: RoutineItem[] }) {
  const has = new Set(items.map((i) => i.slot));
  const basics = ['push_h', 'push_v', 'pull_h', 'pull_v', 'knee', 'hip'] as const;
  return (
    <div className="mt-3 flex flex-wrap gap-1">
      {basics.map((p) => <Badge key={p} tone={has.has(p) ? 'accent' : 'muted'}>{has.has(p) ? '✓' : '·'} {PATTERN_SHORT[p]}</Badge>)}
    </div>
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
      <div className="rounded-xl bg-surface-2 py-2"><div className="tabular font-bold">{on && plan.cardio ? `${plan.cardio.plannedMin}'` : '—'}</div><div className="text-[11px] text-muted">HIIT</div></div>
    </div>
  );
}

function CardioSettings({ profile }: { profile: Profile }) {
  const c = profile.cardio ?? { enabled: true, machine: 'bici' as const, protocolId: '30-60' };
  const set = (patch: Partial<typeof c>) => db.profile.update('me', { cardio: { ...c, ...patch } });
  return (
    <Card title="Cardio HIIT al final">
      <Segmented value={c.enabled ? 'si' : 'no'} onChange={(v) => set({ enabled: v === 'si' })} options={[{ value: 'si', label: 'Sí, per defecte' }, { value: 'no', label: 'No' }]} />
      {c.enabled && (
        <div className="mt-3 space-y-3">
          <Field label="Màquina preferida">
            <div className="grid grid-cols-2 gap-1.5">
              {CARDIO_MACHINES.map((m) => (
                <button key={m.id} onClick={() => set({ machine: m.id })}
                  className={`min-h-11 rounded-xl px-2 text-sm font-medium ${c.machine === m.id ? 'bg-accent text-accent-ink' : 'bg-surface-2'}`}>
                  {m.label}{m.foot !== 'baix' && ' ⚠️'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Intervals">
            <div className="space-y-1.5">
              {HIIT_PROTOCOLS.map((p) => (
                <button key={p.id} onClick={() => set({ protocolId: p.id })}
                  className={`flex h-11 w-full items-center justify-between rounded-xl px-3 text-sm ${c.protocolId === p.id ? 'bg-accent text-accent-ink' : 'bg-surface-2'}`}>
                  <span className="font-medium">{p.label}</span><span className="text-xs opacity-80">{p.level}</span>
                </button>
              ))}
            </div>
          </Field>
          <p className="text-xs text-muted">Només màquines sense impacte (res de córrer ni salts) per la fascitis. ⚠️ = dempeus, vigila la planta del peu. El bloc dura 10–20 min segons la durada del dia: 2' suaus, intervals i 1' de tornada a la calma.</p>
        </div>
      )}
    </Card>
  );
}
