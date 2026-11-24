import clsx from 'clsx';
import { Plus, Search, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FOOT_LABEL, MUSCLE_LABEL, MUSCLE_ORDER, PATTERN_LABEL, POSITION_LABEL } from '../data/catalog';
import { db, uid } from '../db/db';
import { useExercises } from '../db/hooks';
import type { Exercise, FootImpact, MuscleGroup, Pattern, Position, Preference } from '../db/types';
import { Button, Card, Field, inputCls, Page, Segmented, Sheet } from '../components/ui';

export function CatalogPage() {
  const exercises = useExercises();
  const [q, setQ] = useState('');
  const [onlyMine, setOnlyMine] = useState(true);
  const [edit, setEdit] = useState<Exercise | 'new' | null>(null);

  const groups = useMemo(() => {
    const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const nq = norm(q);
    const list = (exercises ?? []).filter((e) => (!onlyMine || e.available) && (!nq || norm(e.name).includes(nq)));
    return MUSCLE_ORDER.map((g) => ({ g, items: list.filter((e) => e.muscleGroup === g).sort((a, b) => a.name.localeCompare(b.name, 'ca')) }))
      .filter((x) => x.items.length);
  }, [exercises, q, onlyMine]);

  if (!exercises) return null;
  const count = exercises.filter((e) => e.available).length;

  return (
    <Page title="Màquines" back="/mes" action={<Button size="sm" variant="primary" onClick={() => setEdit('new')}><Plus size={16} /> Nova</Button>}>
      <div className="relative">
        <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input className={`${inputCls} pl-10`} placeholder="Cercar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Segmented value={onlyMine ? 'mine' : 'all'} onChange={(v) => setOnlyMine(v === 'mine')}
        options={[{ value: 'all', label: `Totes (${exercises.length})` }, { value: 'mine', label: `Les tinc (${count})` }]} />

      {groups.map(({ g, items }) => (
        <Card key={g} title={MUSCLE_LABEL[g]}>
          <ul className="divide-y divide-line">
            {items.map((e) => <ExerciseRow key={e.id} e={e} onOpen={() => setEdit(e)} />)}
          </ul>
        </Card>
      ))}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Nova màquina' : 'Editar màquina'}>
        {edit && <ExerciseEditor e={edit === 'new' ? null : edit} onDone={() => setEdit(null)} />}
      </Sheet>
    </Page>
  );
}

function ExerciseRow({ e, onOpen }: { e: Exercise; onOpen: () => void }) {
  const setPref = (p: Preference) => db.exercises.update(e.id, { preference: e.preference === p ? 'neutral' : p });
  const foot = e.footImpact === 'alt' ? 'peu: alt ⚠️' : e.footImpact === 'mitja' ? 'peu: mitjà' : 'peu: baix';
  return (
    <li className="flex items-center gap-2 py-2.5">
      <button aria-label={e.available ? 'La tinc' : 'No la tinc'} onClick={() => db.exercises.update(e.id, { available: !e.available })}
        className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm', e.available ? 'border-accent bg-accent text-accent-ink' : 'border-line text-transparent')}>✓</button>
      <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <div className={clsx('truncate text-[15px] font-medium', !e.available && 'text-muted')}>{e.name}</div>
        <div className={clsx('truncate text-xs', e.footImpact === 'alt' ? 'text-warn' : 'text-muted')}>{POSITION_LABEL[e.position]} · {foot}{e.isCustom ? ' · pròpia' : ''}{e.note ? ` · ${e.note}` : ''}</div>
      </button>
      <button aria-label="M'agrada" onClick={() => setPref('like')}
        className={clsx('flex h-9 w-9 items-center justify-center rounded-full', e.preference === 'like' ? 'bg-accent/15 text-accent' : 'text-muted/60')}><ThumbsUp size={16} /></button>
      <button aria-label="No m'agrada" onClick={() => setPref('dislike')}
        className={clsx('flex h-9 w-9 items-center justify-center rounded-full', e.preference === 'dislike' ? 'bg-danger/15 text-danger' : 'text-muted/60')}><ThumbsDown size={16} /></button>
    </li>
  );
}

const PATTERN_GROUPS: { label: string; options: Pattern[] }[] = [
  { label: 'Empènyer', options: ['push_h', 'push_v'] },
  { label: 'Estirar', options: ['pull_h', 'pull_v'] },
  { label: 'Cames', options: ['knee', 'hip'] },
  { label: 'Aïllament', options: ['isolation', 'core'] },
];

function ExerciseEditor({ e, onDone }: { e: Exercise | null; onDone: () => void }) {
  const [x, setX] = useState<Exercise>(e ?? {
    id: uid(), name: '', muscleGroup: 'pit', pattern: 'push_h', position: 'assegut', footImpact: 'baix',
    isCompound: true, available: true, preference: 'neutral', isCustom: true,
  });
  const set = <K extends keyof Exercise>(k: K, v: Exercise[K]) => setX({ ...x, [k]: v });
  const editable = x.isCustom;

  return (
    <div className="space-y-3">
      {editable ? (
        <Field label="Nom"><input className={inputCls} value={x.name} onChange={(ev) => set('name', ev.target.value)} autoFocus={!e} /></Field>
      ) : <div className="text-lg font-semibold">{x.name}</div>}

      {editable && (
        <>
          <Field label="Grup muscular">
            <select className={inputCls} value={x.muscleGroup} onChange={(ev) => set('muscleGroup', ev.target.value as MuscleGroup)}>
              {MUSCLE_ORDER.map((g) => <option key={g} value={g}>{MUSCLE_LABEL[g]}</option>)}
            </select>
          </Field>
          <Field label="Patró">
            <select className={inputCls} value={x.pattern} onChange={(ev) => {
              const p = ev.target.value as Pattern;
              setX({ ...x, pattern: p, isCompound: p !== 'isolation' && p !== 'core' });
            }}>
              {PATTERN_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((p) => <option key={p} value={p}>{PATTERN_LABEL[p]}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Posició">
            <Segmented value={x.position} onChange={(v) => set('position', v as Position)}
              options={(['assegut', 'estirat', 'dempeus'] as Position[]).map((p) => ({ value: p, label: POSITION_LABEL[p] }))} />
          </Field>
        </>
      )}
      <Field label="Impacte al peu" hint="Alt = càrrega important a la planta (dempeus amb molt pes, salts). S'evita al generador.">
        <Segmented value={x.footImpact} onChange={(v) => set('footImpact', v as FootImpact)}
          options={(['baix', 'mitja', 'alt'] as FootImpact[]).map((p) => ({ value: p, label: FOOT_LABEL[p] }))} />
      </Field>
      <Field label="Preferència">
        <Segmented value={x.preference} onChange={(v) => set('preference', v as Preference)}
          options={[{ value: 'like', label: "M'agrada" }, { value: 'neutral', label: 'Neutral' }, { value: 'dislike', label: "No m'agrada" }]} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="La tinc al gimnàs">
          <Segmented value={x.available ? 'y' : 'n'} onChange={(v) => set('available', v === 'y')} options={[{ value: 'y', label: 'Sí' }, { value: 'n', label: 'No' }]} />
        </Field>
        <Field label="Increment mínim (kg)" hint="Buit = per defecte">
          <input className={inputCls} inputMode="decimal" defaultValue={x.incrementKg ?? ''} onChange={(ev) => {
            const n = parseFloat(ev.target.value.replace(',', '.'));
            set('incrementKg', Number.isFinite(n) && n > 0 ? n : undefined);
          }} />
        </Field>
      </div>
      <Field label="Nota"><input className={inputCls} value={x.note ?? ''} placeholder="p. ex. seient 4, respatller 2" onChange={(ev) => set('note', ev.target.value || undefined)} /></Field>
      <div className="flex gap-2 pt-1">
        {e?.isCustom && (
          <Button variant="danger" onClick={async () => {
            if (!confirm(`Esborrar «${e.name}»? L'historial d'entrenaments es manté.`)) return;
            await db.exercises.delete(e.id); onDone();
          }}><Trash2 size={18} /></Button>
        )}
        <Button variant="primary" className="flex-1" disabled={!x.name.trim()} onClick={async () => { await db.exercises.put({ ...x, name: x.name.trim() }); onDone(); }}>Desar</Button>
      </div>
    </div>
  );
}
