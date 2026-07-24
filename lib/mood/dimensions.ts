export type MoodDimension =
  | "mood"
  | "stress"
  | "energy"
  | "motivation"
  | "productivity"
  | "happiness"
  | "sleepQuality"
  | "anxiety"
  | "confidence"
  | "focus";

export interface MoodDimensionConfig {
  key: MoodDimension;
  column: string;
  label: string;
  /** Whether a higher value is the "good" direction — false for stress/anxiety, where lower is better. */
  higherIsBetter: boolean;
}

export const MOOD_DIMENSIONS: MoodDimensionConfig[] = [
  { key: "mood", column: "mood", label: "Mood", higherIsBetter: true },
  { key: "energy", column: "energy", label: "Energy", higherIsBetter: true },
  { key: "stress", column: "stress", label: "Stress", higherIsBetter: false },
  { key: "motivation", column: "motivation", label: "Motivation", higherIsBetter: true },
  { key: "productivity", column: "productivity", label: "Productivity", higherIsBetter: true },
  { key: "happiness", column: "happiness", label: "Happiness", higherIsBetter: true },
  { key: "sleepQuality", column: "sleep_quality", label: "Sleep quality", higherIsBetter: true },
  { key: "anxiety", column: "anxiety", label: "Anxiety", higherIsBetter: false },
  { key: "confidence", column: "confidence", label: "Confidence", higherIsBetter: true },
  { key: "focus", column: "focus", label: "Focus", higherIsBetter: true },
];

/** 5-point scale faces, used for the quick-log wheel across every dimension. */
export const MOOD_SCALE_EMOJI = ["😞", "🙁", "😐", "🙂", "😄"] as const;
export const MOOD_SCALE_LABEL = ["Very low", "Low", "Okay", "Good", "Great"] as const;
