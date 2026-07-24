import Link from "next/link";
import { DropletIcon, MapPinIcon, MoonIcon, SparklesIcon } from "lucide-react";

import { WeatherImpactBanner } from "@/components/weather/weather-impact-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABEL, CATEGORY_VAR } from "@/lib/scheduling/category-style";
import type { Tables } from "@/types/database";

export interface MorningSectionProps {
  firstEvent: Pick<Tables<"schedule_items">, "title" | "type" | "scheduled_start"> | null;
  priorities: Pick<Tables<"schedule_items">, "id" | "title" | "type">[];
  travelReminders: Pick<Tables<"schedule_items">, "id" | "title" | "location" | "scheduled_start">[];
  sleepHours: number | null;
  waterMl: number;
  waterGoalMl: number;
  motivationalQuote: string;
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function MorningSection({
  firstEvent,
  priorities,
  travelReminders,
  sleepHours,
  waterMl,
  waterGoalMl,
  motivationalQuote,
}: MorningSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <WeatherImpactBanner />

      <Card className="glass-surface">
        <CardContent className="flex items-start gap-3 pt-6">
          <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm italic text-muted-foreground">{motivationalQuote}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="text-base">First up today</CardTitle>
          </CardHeader>
          <CardContent>
            {firstEvent ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_VAR[firstEvent.type] }} />
                <span className="truncate">
                  {formatTime(firstEvent.scheduled_start)} · {firstEvent.title}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing scheduled yet — a clear start to the day.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="text-base">Sleep last night</CardTitle>
          </CardHeader>
          <CardContent>
            {sleepHours !== null ? (
              <p className="flex items-center gap-2 text-sm">
                <MoonIcon className="size-4 text-muted-foreground" />
                <span className="font-medium">{sleepHours}h</span> logged
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Not logged yet — add it in Health.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {priorities.length > 0 && (
        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s priorities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {priorities.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_VAR[item.type] }} />
                <span className="truncate">{item.title}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {CATEGORY_LABEL[item.type]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {travelReminders.length > 0 && (
        <Card className="glass-surface">
          <CardHeader>
            <CardTitle className="text-base">Heading out today</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {travelReminders.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {formatTime(item.scheduled_start)} · {item.title} — {item.location}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="glass-surface">
        <CardHeader>
          <CardTitle className="text-base">Morning hydration</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <DropletIcon className="size-4 text-sky-500" />
            {waterMl}ml <span className="text-muted-foreground">/ {waterGoalMl}ml today</span>
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/health">Log water</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
