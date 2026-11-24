import { ChevronLeft, ChevronRight, Share2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button, Card, Empty, Page, Stat } from '../components/ui';
import { useActivities, useDailyLogs, useExercises, useMeasurements, useSessions, useSwims, useWeighIns } from '../db/hooks';
import { fmtDate, fmtNum, todayISO } from '../lib/dates';
import { monthSummary, nextMonth, prevMonth } from '../lib/monthly';
import { monthImage } from '../lib/shareImage';

const monthTitle = (m: string) => { const t = fmtDate(`${m}-01`, "MMMM 'de' yyyy"); return t.charAt(0).toUpperCase() + t.slice(1); };

export function MonthlyPage() {
  const [params, setParams] = useSearchParams();
  const thisMonth = todayISO().slice(0, 7);
  const month = params.get('mes') ?? (Number(todayISO().slice(8, 10)) <= 7 ? prevMonth(thisMonth) : thisMonth);
  const weighIns = useWeighIns(), measures = useMeasurements(), sessions = useSessions(), swims = useSwims();
  const extras = useActivities(), logs = useDailyLogs(), exercises = useExercises();
  const [busy, setBusy] = useState(false);
  if (!weighIns || !measures || !sessions || !swims || !extras || !logs || !exercises) return null;
  const s = monthSummary(month, { weighIns, measures, sessions, swims, extras, logs });
  const name = (id: string) => exercises.find((e) => e.id === id)?.name ?? id;
  const empty = !s.avgKg && !s.totalSessions && !s.extras && !s.loggedDays;
  const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±');

  async function share() {
    setBusy(true);
    try {
      const blob = await monthImage(s, monthTitle(month), name);
      const file = new File([blob], `forma-${month}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Forma · ${monthTitle(month)}` }).catch(() => undefined);
      else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } finally { setBusy(false); }
  }

  return (
    <Page title="Resum" back>
      <div className="-mt-2 flex items-center gap-2">
        <button aria-label="Mes anterior" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2" onClick={() => setParams({ mes: prevMonth(month) }, { replace: true })}><ChevronLeft /></button>
        <div className="flex-1 text-center font-semibold">{monthTitle(month)}</div>
        <button aria-label="Mes següent" disabled={month >= thisMonth} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 disabled:opacity-30" onClick={() => setParams({ mes: nextMonth(month) }, { replace: true })}><ChevronRight /></button>
      </div>
      {empty ? <Card><Empty>No hi ha dades d'aquest mes.</Empty></Card> : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Pes" value={s.avgKg != null ? `${fmtNum(s.avgKg)} kg` : '—'} tone={s.kgChange != null && s.kgChange < 0 ? 'accent' : undefined}
              sub={s.kgChange != null ? `${sign(s.kgChange)}${fmtNum(Math.abs(s.kgChange))} kg` : undefined} />
            <Stat label="Cintura" value={s.waistLast != null ? `${fmtNum(s.waistLast)} cm` : '—'} tone={s.waistChange != null && s.waistChange < 0 ? 'accent' : undefined}
              sub={s.waistChange != null ? `${sign(s.waistChange)}${fmtNum(Math.abs(s.waistChange))} cm` : undefined} />
            <Stat label="Sessions" value={s.totalSessions} />
            <Stat label="Rècords" value={s.prs.length} />
          </div>
          {s.loggedDays > 0 && (
            <Card>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-2 py-2"><div className="tabular text-lg font-bold">{s.snacks}</div><div className="text-[11px] text-muted">🍎</div></div>
                <div className="rounded-xl bg-surface-2 py-2"><div className="tabular text-lg font-bold">{s.alcoholDays}</div><div className="text-[11px] text-muted">🍷</div></div>
                <div className="rounded-xl bg-surface-2 py-2"><div className="tabular text-lg font-bold">{s.stepsAvg != null ? s.stepsAvg.toLocaleString('ca-ES') : '—'}</div><div className="text-[11px] text-muted">👟/dia</div></div>
              </div>
            </Card>
          )}
          {s.prs.length > 0 && (
            <Card title="Rècords">
              <ul className="space-y-2">
                {s.prs.slice(0, 4).map((p, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Trophy size={18} className="shrink-0 text-warn" />
                    <span className="flex-1"><strong>{name(p.exerciseId)}</strong> · {p.value}</span>
                    <span className="text-xs text-muted">{fmtDate(p.date, 'd MMM')}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Button variant="primary" size="lg" className="w-full" disabled={busy} onClick={share}><Share2 /> Compartir</Button>
        </>
      )}
    </Page>
  );
}
