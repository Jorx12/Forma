import type { Profile } from '../db/types';

export interface NutritionRef {
  weightKg: number;
  bmr: number;
  tdee: number;
  target: number;
  targetLow: number;
  targetHigh: number;
  protein: number;
  proteinLow: number;
  proteinHigh: number;
}

/** Mifflin-St Jeor: 10·pes + 6,25·alçada − 5·edat + 5 (home) / −161 (dona) */
export function mifflin(sex: Profile['sex'], weightKg: number, heightCm: number, age: number) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'home' ? 5 : -161);
}

export function nutritionRef(profile: Profile, weightKg: number): NutritionRef {
  const bmr = mifflin(profile.sex, weightKg, profile.heightCm, profile.age);
  const tdee = bmr * profile.activityFactor;
  const target = tdee - profile.deficitKcal;
  const round = (n: number, step = 10) => Math.round(n / step) * step;
  return {
    weightKg,
    bmr: round(bmr),
    tdee: round(tdee),
    target: round(target),
    targetLow: round(tdee - 500),
    targetHigh: round(tdee - 400),
    protein: Math.round(weightKg * profile.proteinPerKg),
    proteinLow: Math.round(weightKg * 1.8),
    proteinHigh: Math.round(weightKg * 2),
  };
}
