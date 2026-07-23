/**
 * SM-2 spaced-repetition scheduling — the same algorithm Anki is built on.
 * Pure and deterministic: given a card's current state and a 0-5 recall
 * quality rating, returns its next review state. No AI involved.
 */

export interface SpacedRepetitionState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface SpacedRepetitionResult extends SpacedRepetitionState {
  dueAt: Date;
}

/** quality: 0 (total blackout) to 5 (perfect recall). Below 3 counts as a miss and resets the interval. */
export function computeNextReview(
  state: SpacedRepetitionState,
  quality: number,
  now: Date = new Date(),
): SpacedRepetitionResult {
  const clampedQuality = Math.max(0, Math.min(5, Math.round(quality)));

  if (clampedQuality < 3) {
    return {
      easeFactor: state.easeFactor,
      intervalDays: 1,
      repetitions: 0,
      dueAt: new Date(now.getTime() + 1 * 86_400_000),
    };
  }

  const nextEaseFactor = Math.max(
    1.3,
    state.easeFactor + (0.1 - (5 - clampedQuality) * (0.08 + (5 - clampedQuality) * 0.02)),
  );

  const repetitions = state.repetitions + 1;
  let intervalDays: number;
  if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 6;
  else intervalDays = Math.round(state.intervalDays * nextEaseFactor);

  return {
    easeFactor: Math.round(nextEaseFactor * 100) / 100,
    intervalDays,
    repetitions,
    dueAt: new Date(now.getTime() + intervalDays * 86_400_000),
  };
}
