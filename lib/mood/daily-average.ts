export interface DailyMoodPoint {
  dateKey: string;
  avgMood: number;
  avgEnergy: number | null;
  avgStress: number | null;
}

/** Buckets same-day check-ins (mood can shift through the day) into one averaged point per day. */
export function computeDailyMoodAverages(
  logs: { loggedForDate: string; mood: number; energy: number | null; stress: number | null }[],
): DailyMoodPoint[] {
  const byDate = new Map<string, { mood: number[]; energy: number[]; stress: number[] }>();

  for (const log of logs) {
    if (!byDate.has(log.loggedForDate)) byDate.set(log.loggedForDate, { mood: [], energy: [], stress: [] });
    const bucket = byDate.get(log.loggedForDate)!;
    bucket.mood.push(log.mood);
    if (log.energy !== null) bucket.energy.push(log.energy);
    if (log.stress !== null) bucket.stress.push(log.stress);
  }

  const avg = (arr: number[]) => (arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, bucket]) => ({
      dateKey,
      avgMood: avg(bucket.mood)!,
      avgEnergy: avg(bucket.energy),
      avgStress: avg(bucket.stress),
    }));
}
