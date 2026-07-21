import { cn } from "@/lib/utils";

interface MacroBar {
  label: string;
  valueG: number;
  goalG: number;
  color: string;
}

export function MacroRing({
  calories,
  calorieGoal,
  proteinG,
  proteinGoalG,
  carbsG,
  carbsGoalG,
  fatG,
  fatGoalG,
}: {
  calories: number;
  calorieGoal: number;
  proteinG: number;
  proteinGoalG: number;
  carbsG: number;
  carbsGoalG: number;
  fatG: number;
  fatGoalG: number;
}) {
  const pct = calorieGoal > 0 ? Math.min(100, Math.round((calories / calorieGoal) * 100)) : 0;
  const remaining = Math.max(0, calorieGoal - calories);

  const bars: MacroBar[] = [
    { label: "Protein", valueG: proteinG, goalG: proteinGoalG, color: "var(--macro-protein)" },
    { label: "Carbs", valueG: carbsG, goalG: carbsGoalG, color: "var(--macro-carbs)" },
    { label: "Fat", valueG: fatG, goalG: fatGoalG, color: "var(--macro-fat)" },
  ];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
      <div
        className="relative flex size-36 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--muted) 0deg)`,
        }}
      >
        <div className="flex size-28 flex-col items-center justify-center rounded-full bg-background">
          <span className="text-2xl font-semibold">{Math.round(calories)}</span>
          <span className="text-[11px] text-muted-foreground">
            {remaining > 0 ? `${Math.round(remaining)} left` : "goal reached"}
          </span>
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2.5">
        {bars.map((bar) => {
          const barPct = bar.goalG > 0 ? Math.min(100, Math.round((bar.valueG / bar.goalG) * 100)) : 0;
          return (
            <div key={bar.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{bar.label}</span>
                <span>
                  {Math.round(bar.valueG)}g / {Math.round(bar.goalG)}g
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all")}
                  style={{ width: `${barPct}%`, backgroundColor: bar.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
