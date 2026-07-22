import { cn } from "@/lib/utils";

function scoreColor(score: number | null): string {
  if (score === null) return "var(--muted-foreground)";
  if (score >= 75) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--destructive)";
}

export function ScoreCard({ label, score, icon }: { label: string; score: number | null; icon: string }) {
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4">
      <div
        className="relative flex size-20 items-center justify-center rounded-full"
        style={{
          background:
            score === null
              ? "var(--muted)"
              : `conic-gradient(${color} ${score * 3.6}deg, var(--muted) 0deg)`,
        }}
      >
        <div className="flex size-16 flex-col items-center justify-center rounded-full bg-background">
          <span className={cn("text-lg font-semibold", score === null && "text-muted-foreground")}>
            {score !== null ? Math.round(score) : "—"}
          </span>
        </div>
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon} {label}
      </span>
    </div>
  );
}
