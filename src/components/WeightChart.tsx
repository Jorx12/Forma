import { useMemo, useState } from 'react';
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Profile, WeighIn } from '../db/types';
import { dayNum, fmtDate, fmtNum, fromDayNum, todayISO } from '../lib/dates';
import { goalLineAt, goalLinePoints, goalRangeAt, weeklyAverages } from '../lib/weight';
import { Segmented } from './ui';

type Range = 'recent' | 'tot';

export function WeightChart({ profile, weighIns, height = 260 }: { profile: Profile; weighIns: WeighIn[]; height?: number }) {
  const [range, setRange] = useState<Range>('recent');
  const today = dayNum(todayISO());

  const { points, weekly, line, band, domain, yDomain, marks } = useMemo(() => {
    const goalPts = goalLinePoints(profile);
    const points = weighIns.map((w) => ({ x: dayNum(w.date), y: w.weightKg }));
    const weekly = weeklyAverages(weighIns).map((w) => ({ x: w.day, y: w.avg }));
    const start = dayNum(profile.startDate);
    const lastData = points.length ? points[points.length - 1].x : start;
    const end = Math.max(goalPts[goalPts.length - 1].day, lastData);
    const first = Math.min(start, points[0]?.x ?? start);
    let domain: [number, number];
    if (range === 'tot') domain = [first - 3, end + 7];
    else {
      const right = Math.max(lastData, today) + 35;
      domain = [Math.max(first, right - 35 - 84) - 3, right];
    }
    const xs = [...new Set([domain[0], ...goalPts.map((p) => p.day), domain[1]])].filter((x) => x >= domain[0] && x <= domain[1] && x >= start).sort((a, b) => a - b);
    const line = xs.map((x) => ({ x, y: goalLineAt(profile, x) }));
    const band = xs.map((x) => ({ x, range: goalRangeAt(profile, x) }));
    const visibleY = [...points.filter((p) => p.x >= domain[0] && p.x <= domain[1]).map((p) => p.y), ...band.flatMap((b) => b.range)];
    const yDomain: [number, number] = [Math.floor(Math.min(...visibleY, 200) - 1), Math.ceil(Math.max(...visibleY, 0) + 1)];
    const marks = goalPts.slice(1).filter((p) => p.day >= domain[0] && p.day <= domain[1]);
    return { points, weekly, line, band, domain, yDomain, marks };
  }, [weighIns, profile, range, today]);

  const ticks = useMemo(() => {
    const n = 5, step = (domain[1] - domain[0]) / (n - 1);
    return Array.from({ length: n }, (_, i) => Math.round(domain[0] + i * step));
  }, [domain]);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <div className="w-48">
          <Segmented size="sm" value={range} onChange={setRange} options={[{ value: 'recent', label: '3 mesos' }, { value: 'tot', label: 'Tot el pla' }]} />
        </div>
      </div>
      <div style={{ height }} className="-ml-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis type="number" dataKey="x" domain={domain} ticks={ticks} allowDataOverflow
              tickFormatter={(v) => fmtDate(fromDayNum(v), range === 'tot' ? 'MMM yy' : 'd MMM')} stroke="var(--muted)" fontSize={11} tickLine={false} />
            <YAxis type="number" dataKey="y" domain={yDomain} allowDataOverflow stroke="var(--muted)" fontSize={11} width={38} tickLine={false} />
            <Area data={band} dataKey="range" type="linear" stroke="none" fill="var(--accent)" fillOpacity={0.12} isAnimationActive={false} name="Rang objectiu" />
            {marks.map((m) => (
              <ReferenceLine key={m.label} x={m.day} stroke="var(--accent)" strokeOpacity={0.25} ifOverflow="hidden"
                label={{ value: m.kgMin === m.kgMax ? `${fmtNum(m.kg)}` : `${m.kgMin}–${m.kgMax}`, position: 'insideTop', fill: 'var(--accent)', fontSize: 10 }} />
            ))}
            <ReferenceLine x={today} stroke="var(--muted)" strokeOpacity={0.4} ifOverflow="hidden" />
            <Line data={line} dataKey="y" type="linear" stroke="var(--accent)" strokeOpacity={0.7} strokeDasharray="6 4" dot={false} isAnimationActive={false} name="Objectiu" />
            <Scatter data={points} dataKey="y" fill="var(--muted)" fillOpacity={0.6} isAnimationActive={false} name="Pesada" />
            <Line data={weekly} dataKey="y" type="monotone" stroke="var(--info)" strokeWidth={2.5} dot={{ r: 3.5, fill: 'var(--info)' }} isAnimationActive={false} name="Mitjana setmanal" />
            <Tooltip cursor={{ stroke: 'var(--line)' }}
              contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)' }}
              labelFormatter={(v) => fmtDate(fromDayNum(Number(v)))}
              formatter={(v, name) => [Array.isArray(v) ? `${fmtNum(Number(v[0]))}–${fmtNum(Number(v[1]))} kg` : `${fmtNum(Number(v))} kg`, String(name)]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-info" /> Mitjana setmanal</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted" /> Pesades</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-accent" /> Fites del pla</span>
      </div>
    </div>
  );
}
