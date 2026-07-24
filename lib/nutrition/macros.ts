export interface Macros {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

/** Scale a food's per-serving macros by a quantity multiplier, rounded to 1 decimal. */
export function scaleMacros(base: Macros, quantity: number): Macros {
  const round = (n: number) => Math.round(n * quantity * 10) / 10;
  return {
    calories: round(base.calories),
    proteinG: round(base.proteinG),
    fatG: round(base.fatG),
    carbsG: round(base.carbsG),
    fiberG: round(base.fiberG),
    sugarG: round(base.sugarG),
    sodiumMg: round(base.sodiumMg),
  };
}

export function sumMacros(entries: Macros[]): Macros {
  return entries.reduce(
    (total, m) => ({
      calories: total.calories + m.calories,
      proteinG: total.proteinG + m.proteinG,
      fatG: total.fatG + m.fatG,
      carbsG: total.carbsG + m.carbsG,
      fiberG: total.fiberG + m.fiberG,
      sugarG: total.sugarG + m.sugarG,
      sodiumMg: total.sodiumMg + m.sodiumMg,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 },
  );
}

/** kcal → kJ, per the EU food-label conversion factor (Regulation (EU) No 1169/2011). */
export function kcalToKj(kcal: number): number {
  return Math.round(kcal * 4.184);
}

/** BMI from weight (kg) and height (cm). Returns null if either input is missing/invalid. */
export function computeBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}
