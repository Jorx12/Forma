import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { db, uid } from '../db/db';
import { useMeasurements, useProfile, useWeighIns } from '../db/hooks';
import { MetricLine } from '../components/MiniChart';
import type { Profile, WeighIn } from '../db/types';
import { Badge, Button, Card, Disclosure, Empty, Field, inputCls, Notice, Page, Sheet, Stat, Stepper } from '../components/ui';
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
    <Page title="Pes" subtitle="Dl, dc i dv al matí · compta la mitjana setmanal">
      {a.tooFast && !a.maintain && <TooFastNotice a={a} />}
      <WeightIndicators profile={profile} a={a}>
        <div className="mt-5"><WeightChart profile={profile} weighIns={a.sorted} /></div>
      </WeightIndicators>
      <WeighInForm key={a.lastWeighIn?.id ?? 'x'} initialKg={a.lastWeighIn?.weightKg ?? a.current} />
      <WaistCard />
      <Card title="Registres">
        {a.sorted.length === 0 ? <Empty>Encara no hi ha cap pesada.</Empty> : (
          <ul className="divide-y divide-line">
            {[...a.sorted].reverse().slice(0, showAll ? undefined : 6).map((w) => (
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
        {a.sorted.length > 6 && !showAll && <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => setShowAll(true)}>Veure totes ({a.sorted.length})</Button>}
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
      <div className="space-y-4">
        <Stepper value={kg} onChange={setKg} step={0.1} digits={1} min={30} max={250} unit="kg" />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input type="date" aria-label="Data" className={inputCls} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          <Button variant="primary" className="px-6" onClick={save}>{saved ? 'Desat ✓' : 'Desar'}</Button>
        </div>
        <Disclosure label="% greix i nota">
          <div className="grid grid-cols-2 gap-2">
            <input inputMode="decimal" aria-label="% greix" className={inputCls} placeholder="% greix" value={fat} onChange={(e) => setFat(e.target.value)} />
            <input aria-label="Nota" className={inputCls} placeholder="Nota" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </Disclosure>
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

export function WeightIndicators({ profile, a, children }: { profile: Profile; a: WeightAnalysis; children?: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{a.currentWeek ? `Setmana del ${fmtDate(a.currentWeek, 'd MMM')} · ${a.currentN} pesades` : 'Pes inicial'}</span>
        <Badge tone={statusTone(a.status)}>{statusLabel(a)}</Badge>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="tabular text-[44px] leading-none font-semibold tracking-tight">{fmtNum(a.current)}</span>
        <span className="text-muted">kg</span>
        {a.weeklyChange !== undefined && (
          <span className={`tabular ml-auto text-sm ${a.weeklyChange <= 0 ? 'text-accent' : 'text-warn'}`}>{a.weeklyChange > 0 ? '+' : '−'}{fmtNum(Math.abs(a.weeklyChange), 2)} kg/setm.</span>
        )}
      </div>
      {a.maintain && <p className="mt-2 text-sm text-muted">🎄 Mantenir {fmtNum(profile.modes?.christmas.refKg ?? a.current)} kg (±0,5)</p>}
      {children}
      <div className="mt-5 space-y-3">
        {a.goals.map((g) => (
          <div key={g.id}>
            <div className="mb-1.5 flex justify-between text-xs"><span>{g.targetKg} kg</span>
              <span className="tabular text-muted">{g.reached ? 'Assolit' : `falten ${fmtNum(g.remainingKg)} kg${g.forecast ? ` · previsió ${fmtDate(g.forecast, 'MMM yy')}` : ''}`}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${g.pct}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <Disclosure label="Més dades">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Perduts" value={`${fmtNum(a.lostKg)} kg`} sub={`des de ${fmtNum(profile.startWeightKg)} kg`} />
            <Stat label="IMC" value={fmtNum(a.bmi)} sub={bmiLabel(a.bmi)} />
            <Stat label="Ritme real" value={`${rate(a.rateKgWeek)} kg/s`} sub={a.rateWindowWeeks ? `${a.rateWindowWeeks} setmanes` : 'calen 2 setmanes'} />
            <Stat label="Ritme necessari" value={`${rate(a.requiredKgWeek)} kg/s`} sub="per a la propera fita" />
            {a.bodyFat != null && <Stat label="% greix" value={`${fmtNum(a.bodyFat)} %`} />}
            {a.status !== 'sense_dades' && <Stat label="Segons el pla" value={`${fmtNum(a.expectedNow)} kg`} sub={`${a.diffVsPlan > 0 ? '+' : ''}${fmtNum(a.diffVsPlan)} kg`} />}
          </div>
        </Disclosure>
      </div>
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
      <Card title="Cintura · dilluns" right={last && first && last !== first ? <span className={`tabular text-xs ${last.waistCm! < first.waistCm! ? 'text-accent' : 'text-muted'}`}>{last.waistCm! - first.waistCm! > 0 ? '+' : '−'}{fmtNum(Math.abs(last.waistCm! - first.waistCm!))} cm des de l'inici</span> : undefined}>
        <Stepper value={value} onChange={setCm} step={0.5} digits={1} min={50} max={200} unit="cm" />
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <input type="date" aria-label="Data" className={inputCls} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          <Button variant="primary" className="px-6" onClick={async () => {
            const existing = await db.bodyMeasurements.where('date').equals(date).first();
            await db.bodyMeasurements.put({ ...(existing ?? {}), id: existing?.id ?? uid(), date, waistCm: Math.round(value * 10) / 10 });
            setCm(null);
          }}>Desar</Button>
        </div>
        {waist.length > 1 && <div className="mt-5"><MetricLine data={waist.map((m) => ({ x: dayNum(m.date), y: m.waistCm! }))} unit="cm" color="var(--warn)" height={140} /></div>}
        {waist.length > 0 && (
          <div className="mt-3">
            <Disclosure label="Historial i com mesurar">
              <p className="mb-2 text-xs text-muted">Al melic, de peu, relaxat i després de treure l'aire.</p>
              <ul className="divide-y divide-line text-sm">
                {[...waist].reverse().slice(0, 8).map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2">
                    <span className="text-muted">{fmtDate(m.date)}</span>
                    <span className="flex items-center gap-3"><span className="tabular">{fmtNum(m.waistCm!)} cm</span>
                      <button aria-label="Esborrar" className="text-muted" onClick={async () => { if (confirm('Esborrar aquesta mesura?')) await db.bodyMeasurements.delete(m.id); }}><Trash2 size={15} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            </Disclosure>
          </div>
        )}
      </Card>
    </section>
  );
}
