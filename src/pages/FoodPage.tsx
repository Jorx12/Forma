import { Card, Page } from '../components/ui';
import { SNACK_OPTIONS, SNACK_TIME } from '../data/plan';

export function FoodPage() {
  return (
    <Page title="Alimentació" back>
      <Card title="Plat">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0" aria-label="Plat: meitat verdura, un quart proteïna, un quart hidrats">
            <circle cx="50" cy="50" r="48" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="2" />
            <path d="M50 50 L50 6 A44 44 0 0 0 50 94 Z" fill="#22c55e" />
            <path d="M50 50 L50 6 A44 44 0 0 1 94 50 Z" fill="#f87171" />
            <path d="M50 50 L94 50 A44 44 0 0 1 50 94 Z" fill="#fbbf24" />
          </svg>
          <ul className="space-y-3 text-[15px]">
            <li><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#22c55e]" /><strong>½</strong> verdura</li>
            <li><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#f87171]" /><strong>¼</strong> proteïna</li>
            <li><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#fbbf24]" /><strong>¼</strong> hidrats</li>
          </ul>
        </div>
      </Card>
      <Card title={`Berenar · ${SNACK_TIME.from}–${SNACK_TIME.to} h`}>
        <ul className="space-y-1.5">
          {SNACK_OPTIONS.map((o) => <li key={o} className="rounded-2xl bg-surface-2 px-4 py-2.5 text-sm">{o}</li>)}
        </ul>
      </Card>
      <Card title="Cap de setmana · 80/20">
        <p className="text-sm text-muted">8 de cada 10 àpats, el plat. La resta, flexible i sense culpa.</p>
      </Card>
    </Page>
  );
}
