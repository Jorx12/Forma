import { useMemo, useState } from 'react';
import {
  CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Profile, WeighIn } from '../db/types';
import { dayNum, fmtDate, fmtNum, fromDayNum, todayISO } from '../lib/dates';
import { goalLineAt, goalLinePoints } from '../lib/weight';
import { Segmented } from './ui';

type Range = 'recent' | 'tot';

export function WeightChart({ profile, weighIns, height = 260 }: { profile: Profile; weighIns: WeighIn[]; height?: number }) {
  const [range, setRange] = useState<Range>('recent');
  const goalPts = goalLinePoints(profile);
  const today = dayNum(todayISO());

  const { points, line, domain, yDomain } = useMemo(() => {
    const points = weighIns.map((w) => ({ x: dayNum(w.date), y: w.weightKg }));
    const start = dayNum(profile.startDate);
    const lastData = points.length ? points[points.length - 1].x : start;
    const end = Math.max(...profile.goals.map((g) => dayNum(g.dateTo)), lastData);
    let domain: [number, number];
    if (range === 'tot') domain = [Math.min(start, points[0]?.x ?? start) - 3, end + 3];
    else {
      const right = Math.max(lastData, today) + 21;
      domain = [Math.max(Math.min(start, points[0]?.x ?? start), right - 21 - 84) - 3, right];
    }
    // Línia objectiu: vèrtexs dins del domini + extrems
    const xs = [domain[0], ...goalPts.map((p) => p.day), domain[1]].filter((x) => x >= domain[0] && x <= domain[1]).sort((a, b) => a - b);
    const line = xs.filter((x) => x >= start).map((x) => ({ x, y: goalLineAt(profile, x) }));
    const visibleY = [...points.filter((p) => p.x >= domain[0] && p.x <= domain[1]).map((p) => p.y), ...line.map((p) => p.y)];
    const yDomain: [number, number] = [Math.floor(Math.min(...visibleY, 200) - 1), Math.ceil(Math.max(...visibleY, 0) + 1)];
    return { points, line, domain, yDomain };
  }, [weighIns, profile, range, today, goalPts]);

  const ticks = useMemo(() => {
    const n = 5;
    const step = (domain[1] - domain[0]) / (n - 1);
    return Array.from({ length: n }, (_, i) => Math.round(domain[0] + i * step));
  }, [domain]);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <div className="w-48">
          <Segmented size="sm" value={range} onChange={setRange} options={[{ value: 'recent', label: '12 setm.' }, { value: 'tot', label: 'Tot el pla' }]} />
        </div>
      </div>
      <div style={{ height }} className="-ml-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number" dataKey="x" domain={domain} ticks={ticks} allowDataOverflow
              tickFormatter={(v) => fmtDate(fromDayNum(v), range === 'tot' ? 'MMM yy' : 'd MMM')}
              stroke="var(--muted)" fontSize={11} tickLine={false}
            />
            <YAxis type="number" dataKey="y" domain={yDomain} allowDataOverflow stroke="var(--muted)" fontSize={11} width={38} tickLine={false} />
            {profile.goals.map((g) => (
              <ReferenceArea key={g.id} x1={dayNum(g.dateFrom)} x2={dayNum(g.dateTo)} fill="var(--accent)" fillOpacity={0.1} ifOverflow="hidden" />
            ))}
            {profile.goals.map((g) => (
              <ReferenceLine key={`l${g.id}`} y={g.targetKg} stroke="var(--accent)" strokeOpacity={0.5} strokeDasharray="4 4" ifOverflow="hidden"
                label={{ value: `${g.targetKg} kg`, position: 'insideTopRight', fill: 'var(--accent)', fontSize: 11 }} />
            ))}
            <ReferenceLine x={today} stroke="var(--muted)" strokeOpacity={0.4} ifOverflow="hidden" />
            <Line data={line} dataKey="y" type="linear" stroke="var(--accent)" strokeOpacity={0.6} strokeDasharray="6 4" dot={false} isAnimationActive={false} name="Objectiu" />
            <Line data={points} dataKey="y" type="monotone" stroke="var(--info)" strokeWidth={2} dot={false} isAnimationActive={false} name="Pes" />
            <Scatter data={points} dataKey="y" fill="var(--info)" isAnimationActive={false} name="Pes" />
            <Tooltip
              cursor={{ stroke: 'var(--line)' }}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)' }}
              labelFormatter={(v) => fmtDate(fromDayNum(Number(v)))}
              formatter={(v, name) => [`${fmtNum(Number(v))} kg`, String(name)]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-info" /> Pes</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-accent" /> Línia objectiu</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm bg-accent/20" /> Finestres de les fites</span>
      </div>
    </div>
  );
}
