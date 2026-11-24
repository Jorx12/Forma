import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { db, uid } from '../db/db';
import { useMeasurements, useProfile, useWeighIns } from '../db/hooks';
import { MetricLine } from '../components/MiniChart';
import type { Profile, WeighIn } from '../db/types';
import { Badge, Button, Card, Empty, Field, inputCls, Notice, Page, Sheet, Stat, Stepper } from '../components/ui';
import { WeightChart } from '../components/WeightChart';
import { dayNum, fmtDate, fmtNum, todayISO } from '../lib/dates';
import { analyzeWeight, bmiLabel, statusLabel, type WeightAnalysis } from '../lib/weight';

export function WeightPage() {
  const profile = useProfile();
  const weighIns = useWeighIns();
  const [editing, setEditing] = useState<WeighIn | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { hash } = useLocation();
  const ready = !!profile && !!weighIns;
  useEffect(() => {
    if (ready && hash === '#cintura') setTimeout(() => document.getElementById('cintura')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [ready, hash]);
  if (!profile || !weighIns) return null;
  const a = analyzeWeight(profile, weighIns);

  return (
    <Page title="Pes">
      <p className="-mt-2 text-sm text-muted">Pesa't dilluns, dimecres i divendres al matí, en dejú. La dada que compta és la <strong className="text-text">mitjana setmanal</strong>.</p>
      <WeighInForm key={a.lastWeighIn?.id ?? 'x'} initialKg={a.lastWeighIn?.weightKg ?? a.current} />
      {a.tooFast && <TooFastNotice a={a} />}
      <Card title="Evolució">
        <WeightChart profile={profile} weighIns={a.sorted} />
      </Card>
      <WeightIndicators profile={profile} a={a} />
      <WaistCard />
      <Card title="Registres">
        {a.sorted.length === 0 ? <Empty>Encara no hi ha cap pesada.</Empty> : (
          <ul className="divide-y divide-line">
            {[...a.sorted].reverse().slice(0, showAll ? undefined : 12).map((w) => (
              <li key={w.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <div className="tabular font-semibold">{fmtNum(w.weightKg)} kg{w.bodyFatPct != null && <span className="ml-2 text-sm font-normal text-muted">{fmtNum(w.bodyFatPct)} % greix</span>}</div>
                  <div className="text-xs text-muted">{fmtDate(w.date)}{w.note && ` · ${w.note}`}{w.isDemo && ' · prova'}</div>
                </div>
                <button aria-label="Editar" onClick={() => setEditing(w)} className="flex h-10 w-10 items-center justify-center rounded-full text-muted active:bg-surface-2"><Pencil size={18} /></button>
              </li>
            ))}
          </ul>
        )}
        {a.sorted.length > 12 && !showAll && <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => setShowAll(true)}>Veure totes ({a.sorted.length})</Button>}
      </Card>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Editar pesada">
        {editing && <WeighInEditor w={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </Page>
  );
}

function WeighInForm({ initialKg }: { initialKg: number }) {
  const [date, setDate] = useState(todayISO());
  const [kg, setKg] = useState(Math.round(initialKg * 10) / 10);
  const [fat, setFat] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  async function save() {
    const fatN = parseFloat(fat.replace(',', '.'));
    // Una pesada per dia: si ja n'hi ha una aquell dia, la substituïm
    const existing = await db.weighIns.where('date').equals(date).first();
    await db.weighIns.put({
      id: existing?.id ?? uid(), date, weightKg: Math.round(kg * 10) / 10,
      bodyFatPct: Number.isFinite(fatN) ? fatN : undefined,
      note: note.trim() || undefined, source: 'manual',
    });
    setNote(''); setFat(''); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card title="Nova pesada">
      <div className="space-y-3">
        <Stepper value={kg} onChange={setKg} step={0.1} digits={1} min={30} max={250} unit="kg" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Data"><input type="date" className={inputCls} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="% greix (opcional)"><input inputMode="decimal" className={inputCls} placeholder="—" value={fat} onChange={(e) => setFat(e.target.value)} /></Field>
        </div>
        <Field label="Nota (opcional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="p. ex. després de sopar fora" /></Field>
        <Button variant="primary" size="lg" className="w-full" onClick={save}>{saved ? 'Desat ✓' : 'Desar pes'}</Button>
      </div>
    </Card>
  );
}

function WeighInEditor({ w, onDone }: { w: WeighIn; onDone: () => void }) {
  const [kg, setKg] = useState(w.weightKg);
  const [date, setDate] = useState(w.date);
  const [fat, setFat] = useState(w.bodyFatPct != null ? String(w.bodyFatPct) : '');
  const [note, setNote] = useState(w.note ?? '');
  return (
    <div className="space-y-3">
      <Stepper value={kg} onChange={setKg} step={0.1} digits={1} min={30} max={250} unit="kg" />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Data"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="% greix"><input inputMode="decimal" className={inputCls} value={fat} onChange={(e) => setFat(e.target.value)} /></Field>
      </div>
      <Field label="Nota"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="flex gap-2">
        <Button variant="danger" onClick={async () => { if (confirm('Esborrar aquesta pesada?')) { await db.weighIns.delete(w.id); onDone(); } }}><Trash2 size={18} /></Button>
        <Button variant="primary" className="flex-1" onClick={async () => {
          const f = parseFloat(fat.replace(',', '.'));
          await db.weighIns.update(w.id, { weightKg: Math.round(kg * 10) / 10, date, bodyFatPct: Number.isFinite(f) ? f : undefined, note: note.trim() || undefined });
          onDone();
        }}>Desar canvis</Button>
      </div>
    </div>
  );
}

export function TooFastNotice({ a }: { a: WeightAnalysis }) {
  return (
    <Notice tone="warn">
      <strong>Estàs baixant més d'1 kg per setmana</strong> ({fmtNum(Math.abs(a.weeklyChange ?? 0), 2)} kg). Menja una mica més per protegir el múscul i el rendiment.
    </Notice>
  );
}

export function statusTone(s: WeightAnalysis['status']) {
  return s === 'per_davant' ? 'accent' : s === 'per_darrere' ? 'warn' : s === 'en_cami' ? 'info' : 'muted';
}

const rate = (r?: number) => (r === undefined ? '—' : `${r > 0 ? '+' : ''}${fmtNum(r, 2)}`);

export function WeightIndicators({ profile, a }: { profile: Profile; a: WeightAnalysis }) {
  return (
    <Card title="Indicadors" right={<Badge tone={statusTone(a.status)}>{statusLabel(a)}</Badge>}>
      {a.maintain && <p className="mb-3 text-sm text-info">🎄 Mode Nadal: l'objectiu és mantenir-te a {fmtNum(profile.modes?.christmas.refKg ?? a.current)} kg (±0,5).</p>}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Mitjana setmanal" value={`${fmtNum(a.current)} kg`} sub={a.currentWeek ? `setm. ${fmtDate(a.currentWeek, 'd MMM')} · ${a.currentN} pesades` : 'pes inicial'} tone="accent" />
        <Stat label="Canvi setmanal" value={a.weeklyChange !== undefined ? `${a.weeklyChange > 0 ? '+' : ''}${fmtNum(a.weeklyChange, 2)} kg` : '—'} sub="mitjana vs setmana anterior" />
        <Stat label="Perduts" value={`${fmtNum(a.lostKg)} kg`} sub={`des de ${fmtNum(profile.startWeightKg)} kg`} tone={a.lostKg > 0 ? 'accent' : undefined} />
        <Stat label="IMC" value={fmtNum(a.bmi)} sub={bmiLabel(a.bmi)} />
        <Stat label="% greix" value={a.bodyFat != null ? `${fmtNum(a.bodyFat)} %` : '—'} sub="última mesura" />
        <Stat label="Ritme real" value={`${rate(a.rateKgWeek)} kg/set.`} sub={a.rateWindowWeeks ? `${a.rateWindowWeeks} mitjanes setmanals` : 'calen 2 setmanes de pesades'} />
        <Stat label="Ritme necessari" value={`${rate(a.requiredKgWeek)} kg/set.`} sub={`pla: ${rate(a.plannedKgWeek)} kg/set.`} />
      </div>
      <div className="mt-3 space-y-2">
        {a.goals.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
            <div>
              <div className="font-semibold">{g.targetKg} kg {g.reached && '✓'}</div>
              <div className="text-xs text-muted">objectiu ≈ {fmtDate(g.targetDate)}</div>
            </div>
            <div className="text-right">
              <div className="tabular font-semibold">{g.reached ? 'Assolit' : `falten ${fmtNum(g.remainingKg)} kg`}</div>
              <div className="text-xs text-muted">{g.reached ? '' : g.forecast ? `previsió: ${fmtDate(g.forecast)}` : 'previsió: calen més dades'}</div>
            </div>
          </div>
        ))}
      </div>
      {a.status !== 'sense_dades' && (
        <p className="mt-3 text-xs text-muted">
          Segons les fites del pla, aquesta setmana hauries d'estar a {fmtNum(a.expectedNow)} kg ({a.diffVsPlan > 0 ? '+' : ''}{fmtNum(a.diffVsPlan)} kg).
          Marge «en camí»: ±0,5 kg.
        </p>
      )}
    </Card>
  );
}

function WaistCard() {
  const measures = useMeasurements();
  const [cm, setCm] = useState<number | null>(null);
  const [date, setDate] = useState(todayISO());
  if (!measures) return null;
  const waist = measures.filter((m) => m.waistCm != null);
  const last = waist[waist.length - 1];
  const value = cm ?? last?.waistCm ?? 95;
  const first = waist[0];
  return (
    <section id="cintura">
      <Card title="Cintura (cada dilluns)">
        <Stepper value={value} onChange={setCm} step={0.5} digits={1} min={50} max={200} unit="cm" />
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <input type="date" className={inputCls} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          <Button variant="primary" onClick={async () => {
            const existing = await db.bodyMeasurements.where('date').equals(date).first();
            await db.bodyMeasurements.put({ ...(existing ?? {}), id: existing?.id ?? uid(), date, waistCm: Math.round(value * 10) / 10 });
            setCm(null);
          }}>Desar</Button>
        </div>
        <p className="mt-2 text-xs text-muted">Mesura-la al melic, de peu, relaxat i després d'expulsar l'aire.</p>
        {waist.length > 0 && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stat label="Última" value={`${fmtNum(last.waistCm!)} cm`} sub={fmtDate(last.date)} />
              <Stat label="Des de l'inici" value={`${last.waistCm! - first.waistCm! > 0 ? '+' : ''}${fmtNum(last.waistCm! - first.waistCm!)} cm`} tone={last.waistCm! < first.waistCm! ? 'accent' : undefined} sub={`${fmtNum(first.waistCm!)} cm el ${fmtDate(first.date, 'd MMM')}`} />
            </div>
            {waist.length > 1 && <div className="mt-3"><MetricLine data={waist.map((m) => ({ x: dayNum(m.date), y: m.waistCm! }))} unit="cm" color="var(--warn)" height={150} /></div>}
            <ul className="mt-2 divide-y divide-line text-sm">
              {[...waist].reverse().slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2">
                  <span className="text-muted">{fmtDate(m.date)}{m.isDemo && ' · prova'}</span>
                  <span className="flex items-center gap-2"><strong className="tabular">{fmtNum(m.waistCm!)} cm</strong>
                    <button aria-label="Esborrar" className="text-muted" onClick={async () => { if (confirm('Esborrar aquesta mesura?')) await db.bodyMeasurements.delete(m.id); }}><Trash2 size={16} /></button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </section>
  );
}
