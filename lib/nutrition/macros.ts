export interface Macros {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
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
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 },
  );
}

/** BMI from weight (kg) and height (cm). Returns null if either input is missing/invalid. */
export function computeBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}
