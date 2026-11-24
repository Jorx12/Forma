import { useProfile, useWeighIns } from '../db/hooks';
import { Card, Disclosure, Page, Stat } from '../components/ui';
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
    <Page title="Calories" back>
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Objectiu" value={`${n.target.toLocaleString('ca-ES')} kcal`} sub={`${n.targetLow.toLocaleString('ca-ES')}–${n.targetHigh.toLocaleString('ca-ES')}`} tone="accent" />
          <Stat label="Proteïna" value={`${n.protein} g`} sub={`${n.proteinLow}–${n.proteinHigh} g`} tone="accent" />
        </div>
        <div className="mt-4">
          <Disclosure label="Càlcul">
            <div className="space-y-2 text-sm text-muted">
              <p>Basal (Mifflin-St Jeor): <span className="tabular text-text">{n.bmr} kcal</span><br /><span className="tabular text-xs">10 × {fmtNum(current)} + 6,25 × {profile.heightCm} − 5 × {profile.age} {s}</span></p>
              <p>Despesa: <span className="tabular text-text">{n.tdee} kcal</span> <span className="text-xs">(× {fmtNum(profile.activityFactor, 2)})</span></p>
              <p>Dèficit: <span className="tabular text-text">−{profile.deficitKcal} kcal</span> · proteïna {fmtNum(profile.proteinPerKg)} g/kg</p>
            </div>
          </Disclosure>
        </div>
      </Card>
    </Page>
  );
}
