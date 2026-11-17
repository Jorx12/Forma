import clsx from 'clsx';
import { Check, ChevronDown, ChevronUp, Minus, MoreVertical, Plus, Replace, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { WARMUP } from '../data/catalog';
import { useExercises, useMeta, useProfile, useSessions } from '../db/hooks';
import type { Effort, Exercise, Profile, Session, SessionEntry } from '../db/types';
import { RestTimer, startRest } from '../components/RestTimer';
import { Badge, Button, Card, Notice, Sheet, Stepper } from '../components/ui';
import { keepAwake, unlockAudio } from '../lib/alerts';
import { fmtClock } from '../lib/dates';
import { defaultItem, incrementFor } from '../lib/generator';
import { buildEntry, historyFor } from '../lib/progression';
import { discardSession, finishSession, saveSession } from '../lib/session';
import { summarizeEntry } from '../lib/stats';
import { ExercisePicker } from './RoutinePage';

const SUGGESTION_TONE = { pujar: 'accent', mantenir: 'info', repetir: 'info', baixar: 'warn', descarrega: 'warn', primera: 'muted' } as const;
const SUGGESTION_LABEL = { pujar: '↑ Puja pes', mantenir: '→ Mateix pes', repetir: '↻ Repeteix', baixar: '↓ Baixa pes', descarrega: 'Descàrrega', primera: 'Primera vegada' } as const;
const EFFORTS: { value: Effort; label: string }[] = [{ value: 'facil', label: 'Fàcil' }, { value: 'correcte', label: 'Correcte' }, { value: 'dur', label: 'Dur' }];

export function SessionPage() {
  const activeId = useMeta<string>('activeSessionId');
  const sessions = useSessions();
  const exercises = useExercises();
  const profile = useProfile();
  const nav = useNavigate();

  useEffect(() => {
    void keepAwake(true);
    const onVis = () => { if (document.visibilityState === 'visible') void keepAwake(true); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); void keepAwake(false); };
  }, []);

  if (activeId === undefined || !sessions || !exercises || !profile) return null;
  const session = activeId ? sessions.find((s) => s.id === activeId && s.status === 'en_curs') : undefined;
  if (!session) return <Navigate to="/entrenar" replace />;
  return <SessionView key={session.id} session={session} sessions={sessions} exercises={exercises} profile={profile} onExit={(id) => nav(id ? `/entrenar/resum/${id}` : '/entrenar', { replace: true })} />;
}

function SessionView({ session, sessions, exercises, profile, onExit }: {
  session: Session; sessions: Session[]; exercises: Exercise[]; profile: Profile; onExit: (id?: string) => void;
}) {
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const firstOpen = session.entries.findIndex((e) => e.sets.some((s) => !s.done));
  const [open, setOpen] = useState<number>(firstOpen === -1 ? 0 : firstOpen);
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState<{ idx: number | null } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const save = (fn: (s: Session) => void) => {
    const s = structuredClone(session);
    fn(s);
    return saveSession(s);
  };

  const totalSets = session.entries.reduce((t, e) => t + e.sets.length, 0);
  const doneCount = session.entries.reduce((t, e) => t + e.sets.filter((s) => s.done).length, 0);
  const anyDone = doneCount > 0;

  function completeSet(ei: number, si: number) {
    unlockAudio();
    const entry = session.entries[ei];
    const set = entry.sets[si];
    void save((s) => {
      const en = s.entries[ei];
      en.sets[si] = { ...en.sets[si], done: true, doneAt: new Date().toISOString() };
      // Propaga el pes a les sèries pendents següents
      for (let k = si + 1; k < en.sets.length; k++) if (!en.sets[k].done) en.sets[k].weightKg = set.weightKg;
    });
    const isLastSetOfEntry = entry.sets.every((x, k) => k === si || x.done);
    const remainingAfter = session.entries.some((e, k) => k !== ei && e.sets.some((x) => !x.done));
    if (!isLastSetOfEntry || remainingAfter) startRest(entry.target.restSec, byId.get(entry.exerciseId)?.name);
    if (isLastSetOfEntry) {
      const next = session.entries.findIndex((e, k) => k > ei && e.sets.some((x) => !x.done));
      const any = next !== -1 ? next : session.entries.findIndex((e, k) => k !== ei && e.sets.some((x) => !x.done));
      if (any !== -1) setOpen(any);
    }
  }

  async function finish() {
    if (!anyDone) {
      if (confirm('No has fet cap sèrie. Vols descartar l\'entrenament?')) { await discardSession(session); onExit(); }
      return;
    }
    if (doneCount < totalSets && !confirm(`Queden ${totalSets - doneCount} sèries per fer. Acabar igualment?`)) return;
    await finishSession(session);
    onExit(session.id);
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-safe pb-40">
      <header className="sticky top-0 z-20 -mx-4 mb-3 flex items-center gap-2 bg-bg/95 px-4 py-2 backdrop-blur">
        <div className="flex-1">
          <div className="text-xl font-bold">Dia {session.dayKey}</div>
          <div className="tabular text-xs text-muted">{fmtClock((now - new Date(session.startedAt).getTime()) / 1000)} · {doneCount}/{totalSets} sèries</div>
        </div>
        <Button variant="primary" onClick={finish}>Acabar</Button>
        <button aria-label="Menú" onClick={() => setMenu(true)} className="flex h-12 w-10 items-center justify-center text-muted"><MoreVertical /></button>
      </header>

      <div className="space-y-3">
        {session.flags.adaptation && <Notice tone="info">Adaptació: deixa ~3 repeticions de marge (RIR 3) a cada sèrie.</Notice>}
        {session.flags.deload && <Notice tone="warn">Sessió de descàrrega: menys sèries i pes més baix. Sense apurar.</Notice>}

        <Checklist title="Escalfament" items={WARMUP} checked={session.checklist.warmup} defaultOpen={!anyDone}
          onToggle={(id) => save((s) => { s.checklist.warmup = toggle(s.checklist.warmup, id); })} />

        {session.entries.map((entry, ei) => (
          <EntryCard
            key={`${entry.exerciseId}-${ei}`}
            entry={entry}
            exercise={byId.get(entry.exerciseId)}
            last={historyFor(entry.exerciseId, sessions.filter((s) => s.id !== session.id))[0]?.entry}
            step={incrementFor(byId.get(entry.exerciseId), profile)}
            open={open === ei}
            onToggle={() => setOpen(open === ei ? -1 : ei)}
            onChange={(fn) => save((s) => fn(s.entries[ei]))}
            onComplete={(si) => completeSet(ei, si)}
            onSwap={() => setPicker({ idx: ei })}
            onRemove={() => { if (confirm('Treure aquest exercici de la sessió d\'avui?')) void save((s) => { s.entries.splice(ei, 1); }); }}
          />
        ))}

        <Button className="w-full" onClick={() => setPicker({ idx: null })}><Plus size={18} /> Afegir exercici</Button>

        <Button variant="primary" size="lg" className="w-full" onClick={finish}>Acabar entrenament</Button>
      </div>

      <RestTimer />

      <Sheet open={menu} onClose={() => setMenu(false)} title="Entrenament">
        <div className="space-y-2">
          <Button className="w-full" onClick={() => { setMenu(false); onExit(); }}>Sortir (es pot continuar després)</Button>
          <Button variant="danger" className="w-full" onClick={async () => {
            if (!confirm('Descartar aquest entrenament? No es guardarà res.')) return;
            await discardSession(session); onExit();
          }}><Trash2 size={18} /> Descartar entrenament</Button>
        </div>
      </Sheet>

      <Sheet open={!!picker} onClose={() => setPicker(null)} title={picker?.idx != null ? 'Canviar màquina' : 'Afegir exercici'}>
        {picker && (
          <ExercisePicker
            exercises={exercises} profile={profile}
            slot={picker.idx != null ? byId.get(session.entries[picker.idx].exerciseId)?.pattern : undefined}
            currentId={picker.idx != null ? session.entries[picker.idx].exerciseId : undefined}
            onPick={(e) => {
              const base = defaultItem(e, e.pattern, profile);
              const old = picker.idx != null ? session.entries[picker.idx] : undefined;
              const item = old ? { ...base, sets: old.target.sets, repMin: old.target.repMin, repMax: old.target.repMax, restSec: old.target.restSec } : base;
              const entry = buildEntry(item, e, profile, sessions.filter((s) => s.id !== session.id), session.flags.deload);
              void save((s) => {
                if (picker.idx != null) s.entries[picker.idx] = entry;
                else s.entries.push(entry);
              });
              setOpen(picker.idx ?? session.entries.length);
              setPicker(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

function Checklist({ title, items, checked, onToggle, defaultOpen }: {
  title: string; items: { id: string; label: string }[]; checked: string[]; onToggle: (id: string) => void; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button className="flex w-full items-center justify-between" onClick={() => setOpen(!open)}>
        <span className="font-semibold">{title} <span className="text-sm font-normal text-muted">· {checked.length}/{items.length} (opcional)</span></span>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {open && (
        <ul className="mt-3 space-y-1">
          {items.map((it) => (
            <li key={it.id}>
              <button onClick={() => onToggle(it.id)} className="flex w-full items-start gap-3 rounded-xl py-2 text-left active:bg-surface-2">
                <span className={clsx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2', checked.includes(it.id) ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>
                  {checked.includes(it.id) && <Check size={16} />}
                </span>
                <span className={clsx('text-sm', checked.includes(it.id) && 'text-muted line-through')}>{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function EntryCard({ entry, exercise, last, step, open, onToggle, onChange, onComplete, onSwap, onRemove }: {
  entry: SessionEntry; exercise?: Exercise; last?: SessionEntry; step: number; open: boolean;
  onToggle: () => void; onChange: (fn: (e: SessionEntry) => void) => void; onComplete: (si: number) => void;
  onSwap: () => void; onRemove: () => void;
}) {
  const done = entry.sets.filter((s) => s.done).length;
  const complete = done === entry.sets.length && done > 0;
  const firstPending = entry.sets.findIndex((s) => !s.done);
  const [editing, setEditing] = useState<number | null>(null);
  const active = editing ?? firstPending;

  return (
    <section className={clsx('rounded-2xl border bg-surface', open ? 'border-accent/50' : 'border-line', complete && !open && 'opacity-70')}>
      <button className="flex w-full items-center gap-3 p-4 text-left" onClick={onToggle}>
        <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', complete ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted')}>
          {complete ? <Check size={18} /> : `${done}/${entry.sets.length}`}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-tight">{exercise?.name ?? 'Exercici'}</div>
          <div className="text-xs text-muted">{entry.target.sets}×{entry.target.repMin}–{entry.target.repMax} · descans {entry.target.restSec} s</div>
        </div>
        {open ? <ChevronUp size={20} className="text-muted" /> : <ChevronDown size={20} className="text-muted" />}
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {exercise?.note && <div className="text-sm text-muted">📝 {exercise.note}</div>}
          {exercise?.footImpact === 'alt' && <Notice tone="warn">Impacte alt al peu: vigila la fascitis o canvia de màquina.</Notice>}
          <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <span className="text-muted">Última vegada: </span><strong>{last ? summarizeEntry(last) : '—'}</strong>
            {entry.suggestion && (
              <div className="mt-1.5 flex items-start gap-2">
                <Badge tone={SUGGESTION_TONE[entry.suggestion.kind]}>{SUGGESTION_LABEL[entry.suggestion.kind]}</Badge>
                <span className="text-xs text-muted">{entry.suggestion.reason}</span>
              </div>
            )}
          </div>

          <ul className="space-y-2">
            {entry.sets.map((s, si) => si === active ? (
              <li key={si} className="rounded-xl border border-line bg-bg p-3">
                <div className="mb-2 text-sm font-semibold">Sèrie {si + 1}{s.done && <span className="ml-2 text-xs text-accent">feta · editant</span>}</div>
                <div className="space-y-2">
                  <Stepper label="Pes" value={s.weightKg} step={step} digits={2} unit="kg" max={500}
                    onChange={(v) => onChange((e) => { e.sets[si].weightKg = v; })} />
                  <Stepper label="Repeticions" value={s.reps} step={1} max={100}
                    onChange={(v) => onChange((e) => { e.sets[si].reps = v; })} />
                </div>
                {s.done ? (
                  <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={() => setEditing(null)}>Fet</Button>
                ) : (
                  <Button variant="primary" size="lg" className="mt-3 h-16 w-full text-xl" onClick={() => { setEditing(null); onComplete(si); }}>
                    <Check size={26} /> Sèrie feta
                  </Button>
                )}
              </li>
            ) : (
              <li key={si} className={clsx('flex items-center gap-2 rounded-xl px-3 py-2', s.done ? 'bg-surface-2' : 'bg-surface-2/40')}>
                <button className="flex flex-1 items-center gap-3 text-left" onClick={() => setEditing(si)}>
                  <span className="w-6 text-sm text-muted">S{si + 1}</span>
                  <span className={clsx('tabular font-semibold', !s.done && 'text-muted')}>{s.weightKg.toLocaleString('ca-ES')} kg × {s.reps}</span>
                  {s.done && <Check size={16} className="text-accent" />}
                </button>
                {s.done && (
                  <div className="flex gap-1">
                    {EFFORTS.map((ef) => (
                      <button key={ef.value} onClick={() => onChange((e) => { e.sets[si].effort = e.sets[si].effort === ef.value ? undefined : ef.value; })}
                        className={clsx('h-8 rounded-lg px-2 text-xs font-medium', s.effort === ef.value
                          ? ef.value === 'dur' ? 'bg-danger/20 text-danger' : ef.value === 'facil' ? 'bg-info/20 text-info' : 'bg-accent/20 text-accent'
                          : 'text-muted')}>{ef.label}</button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {done > 0 && <p className="text-xs text-muted">Esforç opcional: fàcil ≈ 3+ reps de marge, correcte ≈ 1–2, dur ≈ 0.</p>}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onChange((e) => { const l = e.sets[e.sets.length - 1]; e.sets.push({ weightKg: l?.weightKg ?? 0, reps: l?.reps ?? e.target.repMin, done: false }); })}><Plus size={16} /> Sèrie</Button>
            <Button size="sm" disabled={!entry.sets.length || entry.sets[entry.sets.length - 1].done} onClick={() => onChange((e) => { e.sets.pop(); })}><Minus size={16} /> Sèrie</Button>
            <Button size="sm" onClick={onSwap}><Replace size={16} /> Canviar màquina</Button>
            <Button size="sm" variant="ghost" onClick={onRemove}><Trash2 size={16} /></Button>
          </div>
        </div>
      )}
    </section>
  );
}
