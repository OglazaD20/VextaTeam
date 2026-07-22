const WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  pound: 453.6,
  pounds: 453.6,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
};

/**
 * Converts a described amount into the "servings" multiplier that
 * lib/nutrition/macros.ts's scaleMacros expects, matching exactly how the
 * manual food-search dialog already scales a food (a plain multiplier
 * against its serving_size/serving_unit) — so an AI-logged item and a
 * manually-logged one are computed identically, never differently.
 */
export function computeServingMultiplier(
  quantityGrams: number | null,
  quantityServings: number | null,
  servingSize: number,
  servingUnit: string,
): number {
  if (servingSize <= 0) return 1;

  if (quantityGrams !== null && quantityGrams > 0) {
    const unit = servingUnit.trim().toLowerCase();
    const factor = WEIGHT_TO_GRAMS[unit] ?? VOLUME_TO_ML[unit] ?? 1;
    const servingSizeInBaseUnit = servingSize * factor;
    return servingSizeInBaseUnit > 0 ? quantityGrams / servingSizeInBaseUnit : 1;
  }

  if (quantityServings !== null && quantityServings > 0) {
    return quantityServings;
  }

  return 1;
}
