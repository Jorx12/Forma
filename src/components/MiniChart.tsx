import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, ReferenceLine } from 'recharts';
import { fmtDate, fromDayNum } from '../lib/dates';

const tooltipStyle = { background: 'var(--surface-solid)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--text)' };

export function MetricLine({ data, unit, color = 'var(--accent)', height = 180 }: { data: { x: number; y: number }[]; unit: string; color?: string; height?: number }) {
  return (
    <div style={{ height }} className="-ml-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis type="number" dataKey="x" domain={['dataMin', 'dataMax']} tickFormatter={(v) => fmtDate(fromDayNum(v), 'd MMM')} stroke="var(--muted)" fontSize={11} tickLine={false} tickCount={4} />
          <YAxis domain={[(d: number) => Math.max(0, Math.floor(d * 0.92)), (d: number) => Math.ceil(d * 1.05)]} allowDecimals={false}
            tickFormatter={(v) => Number(v).toLocaleString('ca-ES', { maximumFractionDigits: 0 })} stroke="var(--muted)" fontSize={11} width={44} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => fmtDate(fromDayNum(Number(v)))}
            formatter={(v) => [`${Number(v).toLocaleString('ca-ES', { maximumFractionDigits: 1 })} ${unit}`, '']} />
          <Line dataKey="y" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeksBar({ data, target, height = 160 }: { data: { week: string; count: number }[]; target: number; height?: number }) {
  return (
    <div style={{ height }} className="-ml-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tickFormatter={(v) => fmtDate(v, 'd/M')} stroke="var(--muted)" fontSize={10} tickLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} domain={[0, Math.max(target + 1, ...data.map((d) => d.count))]} stroke="var(--muted)" fontSize={11} width={28} tickLine={false} />
          <ReferenceLine y={target} stroke="var(--accent)" strokeDasharray="4 4" />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `Setmana del ${fmtDate(String(v), 'd MMM')}`} formatter={(v) => [`${v} entrenaments`, '']} cursor={{ fill: 'var(--surface-2)' }} />
          <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
