const MOOD_EMOJI = ["😞", "😕", "😐", "🙂", "😄"];

export function MoodTrend({
  days,
}: {
  days: { label: string; avgMood: number | null }[];
}) {
  const hasAnyData = days.some((day) => day.avgMood !== null);

  if (!hasAnyData) {
    return (
      <p className="text-sm text-muted-foreground">
        Log mood after a focus session to see your trend here.
      </p>
    );
  }

  return (
    <div className="flex items-end justify-between gap-2">
      {days.map((day) => (
        <div key={day.label} className="flex flex-col items-center gap-1.5">
          <span className="text-xl">
            {day.avgMood ? MOOD_EMOJI[Math.round(day.avgMood) - 1] : "—"}
          </span>
          <span className="text-xs text-muted-foreground">{day.label}</span>
        </div>
      ))}
    </div>
  );
}
