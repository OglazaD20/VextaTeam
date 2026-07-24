import type { MealType } from "@/types/database";

/** A reasonable default meal type from the local hour, used to pre-fill (not lock) the AI chat's log confirmation. */
export function guessMealType(hour: number): MealType {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}
