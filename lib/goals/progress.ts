export interface GoalProgressInput {
  targetValue: number | null;
  currentValue: number;
  manualProgressPct: number | null;
  milestones: { isCompleted: boolean }[];
}

/**
 * Progress is derived, in priority order: milestone completion ratio (most
 * granular signal when present), then numeric target/current, then a manual
 * fallback percentage for goals with neither. Never invents a number — a
 * goal with no milestones, no target, and no manual value is simply 0%.
 */
export function computeGoalProgressPct(input: GoalProgressInput): number {
  if (input.milestones.length > 0) {
    const completed = input.milestones.filter((m) => m.isCompleted).length;
    return Math.round((completed / input.milestones.length) * 100);
  }
  if (input.targetValue !== null && input.targetValue > 0) {
    return Math.round(Math.min(100, Math.max(0, (input.currentValue / input.targetValue) * 100)));
  }
  return input.manualProgressPct ?? 0;
}

/**
 * Linear extrapolation from creation date through now to the deadline,
 * based on progress made so far. A pure estimate, not a guarantee — returns
 * null when there's not enough information (no deadline, or zero progress
 * yet, which would make the projection meaningless).
 */
export function predictCompletionDate(
  createdAt: Date,
  deadline: Date | null,
  progressPct: number,
): Date | null {
  if (!deadline || progressPct <= 0) return null;
  const elapsedMs = Date.now() - createdAt.getTime();
  if (elapsedMs <= 0) return null;
  const totalProjectedMs = elapsedMs / (progressPct / 100);
  return new Date(createdAt.getTime() + totalProjectedMs);
}
