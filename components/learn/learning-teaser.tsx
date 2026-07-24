import { differenceInCalendarDays } from "date-fns";
import { CalendarClockIcon, LayersIcon } from "lucide-react";

import { getDictionary } from "@/lib/i18n/get-locale";

interface NearestExam {
  title: string;
  examDate: string;
}

export async function LearningTeaser({
  dueFlashcardCount,
  nearestExam,
}: {
  dueFlashcardCount: number;
  nearestExam: NearestExam | null;
}) {
  const { t } = await getDictionary();

  if (dueFlashcardCount === 0 && !nearestExam) {
    return <p className="text-sm text-muted-foreground">{t.learn.dashboardEmptyBody}</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {dueFlashcardCount > 0 && (
        <div className="flex items-start gap-2">
          <LayersIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <p className="text-sm">{t.learn.flashcardsDueDashboard.replace("{count}", String(dueFlashcardCount))}</p>
        </div>
      )}
      {nearestExam && (
        <div className="flex items-start gap-2">
          <CalendarClockIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <p className="text-sm">
            {t.learn.examInDaysDashboard
              .replace("{title}", nearestExam.title)
              .replace(
                "{days}",
                String(Math.max(0, differenceInCalendarDays(new Date(`${nearestExam.examDate}T00:00:00`), new Date()))),
              )}
          </p>
        </div>
      )}
    </div>
  );
}
