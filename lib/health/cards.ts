export const HEALTH_CARD_KEYS = [
  "sleep",
  "steps",
  "calories_burned",
  "heart_rate",
  "workouts",
  "water",
  "weight",
] as const;

export type HealthCardKey = (typeof HEALTH_CARD_KEYS)[number];

export const HEALTH_CARD_LABEL: Record<HealthCardKey, string> = {
  sleep: "Sleep",
  steps: "Steps",
  calories_burned: "Calories Burned",
  heart_rate: "Heart Rate",
  workouts: "Workouts",
  water: "Water Intake",
  weight: "Weight",
};

export const DEFAULT_VISIBLE_HEALTH_CARDS: HealthCardKey[] = [...HEALTH_CARD_KEYS];

export function isHealthCardKey(value: string): value is HealthCardKey {
  return (HEALTH_CARD_KEYS as readonly string[]).includes(value);
}
