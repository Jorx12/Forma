import { Card, Notice, Page } from '../components/ui';
import { SNACK_OPTIONS, SNACK_TIME } from '../data/plan';

export function FoodPage() {
  const wd = new Date().getDay();
  return (
    <Page title="Alimentació" back>
      <p className="-mt-2 text-sm text-muted">Recordatoris senzills, sense comptar calories.</p>
      <Card title="Plat de referència">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0" aria-label="Plat: meitat verdura, un quart proteïna, un quart hidrats">
            <circle cx="50" cy="50" r="48" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="2" />
            <path d="M50 50 L50 6 A44 44 0 0 0 50 94 Z" fill="#22c55e" />
            <path d="M50 50 L50 6 A44 44 0 0 1 94 50 Z" fill="#f87171" />
            <path d="M50 50 L94 50 A44 44 0 0 1 50 94 Z" fill="#fbbf24" />
          </svg>
          <ul className="space-y-2 text-sm">
            <li><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#22c55e]" /><strong>½ verdura</strong><br /><span className="text-muted">amanida, verdura cuita, crema</span></li>
            <li><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#f87171]" /><strong>¼ proteïna</strong><br /><span className="text-muted">carn, peix, ous, llegums</span></li>
            <li><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-[#fbbf24]" /><strong>¼ hidrats</strong><br /><span className="text-muted">arròs, pasta, pa, patata</span></li>
          </ul>
        </div>
      </Card>
      <Card title={`Berenar · ${SNACK_TIME.from}–${SNACK_TIME.to} h`}>
        <p className="mb-2 text-sm text-muted">Berenar a la tarda evita arribar afamat al sopar i picar.</p>
        <ul className="space-y-1.5">
          {SNACK_OPTIONS.map((o) => <li key={o} className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm">🍽️ {o}</li>)}
        </ul>
      </Card>
      <Card title="Caps de setmana: regla 80/20">
        {(wd === 0 || wd === 6) && <Notice tone="info">Avui és cap de setmana!</Notice>}
        <p className="mt-2 text-sm leading-relaxed">El 80 % dels àpats segueixen el plat de referència. El 20 % restant és flexible: un dinar fora, unes postres o una cervesa, sense culpa. Si un àpat se'n va, el següent torna al pla.</p>
      </Card>
    </Page>
  );
}
