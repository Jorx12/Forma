import { useProfile, useWeighIns } from '../db/hooks';
import { Card, Page, Stat } from '../components/ui';
import { fmtNum } from '../lib/dates';
import { nutritionRef } from '../lib/nutrition';
import { analyzeWeight } from '../lib/weight';

export function NutritionPage() {
  const profile = useProfile();
  const weighIns = useWeighIns();
  if (!profile || !weighIns) return null;
  const { current } = analyzeWeight(profile, weighIns);
  const n = nutritionRef(profile, current);
  const s = profile.sex === 'home' ? '+ 5' : '− 161';

  return (
    <Page title="Referència calòrica" back>
      <Card title={`Amb ${fmtNum(current)} kg`}>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Calories objectiu" value={`${n.target.toLocaleString('ca-ES')} kcal`} sub={`rang ${n.targetLow.toLocaleString('ca-ES')}–${n.targetHigh.toLocaleString('ca-ES')}`} tone="accent" />
          <Stat label="Proteïna" value={`${n.protein} g`} sub={`rang ${n.proteinLow}–${n.proteinHigh} g`} tone="accent" />
          <Stat label="Metabolisme basal" value={`${n.bmr.toLocaleString('ca-ES')} kcal`} />
          <Stat label="Despesa total" value={`${n.tdee.toLocaleString('ca-ES')} kcal`} sub={`factor ${fmtNum(profile.activityFactor, 2)}`} />
        </div>
        <p className="mt-3 text-xs text-muted">Es recalcula automàticament amb l'últim pes registrat. És només una referència orientativa.</p>
      </Card>
      <Card title="D'on surten els números">
        <div className="space-y-3 text-sm leading-relaxed">
          <p><strong>1. Metabolisme basal (Mifflin-St Jeor)</strong> — l'energia que gastes en repòs:<br />
            <span className="tabular text-muted">10 × {fmtNum(current)} + 6,25 × {profile.heightCm} − 5 × {profile.age} {s} = <strong className="text-text">{n.bmr} kcal</strong></span></p>
          <p><strong>2. Despesa total</strong> — basal × factor d'activitat. Amb feina d'oficina, 7.000–10.000 passos i 3 dies de gimnàs,
            un factor moderat d'1,5–1,55 és raonable: <span className="tabular text-muted">{n.bmr} × {fmtNum(profile.activityFactor, 2)} ≈ <strong className="text-text">{n.tdee} kcal</strong></span>.</p>
          <p><strong>3. Dèficit</strong> — restant-ne {profile.deficitKcal} kcal surt <strong>≈{n.target} kcal/dia</strong>. Un dèficit de 400–500 kcal sol donar
            uns 0,4–0,5 kg/setmana: prou per avançar sense perdre massa múscul.</p>
          <p><strong>4. Proteïna</strong> — {fmtNum(profile.proteinPerKg)} g per kg de pes ({n.proteinLow}–{n.proteinHigh} g amb 1,8–2 g/kg) ajuda a mantenir el múscul durant el dèficit.</p>
          <p className="text-muted">Si després de 3–4 setmanes el ritme real no s'acosta al necessari, ajusta el factor d'activitat o el dèficit al perfil.</p>
        </div>
      </Card>
    </Page>
  );
}
