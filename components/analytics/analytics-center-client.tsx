"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";

import type { AchievementsOverview } from "@/app/(app)/achievements/actions";
import {
  getAnalyticsScores,
  type AnalyticsCenterSummary,
  type AnalyticsPeriod,
  type AnalyticsScores,
  type LifeScoreTrendPoint,
  type ProductivityWeekBundle,
} from "@/app/(app)/analytics/actions";
import { AchievementsClient } from "@/components/achievements/achievements-client";
import { CoachPanel } from "@/components/coach/coach-panel";
import { LifeScoreTrendChart } from "@/components/analytics/life-score-trend-chart";
import { ScoreCard } from "@/components/analytics/score-card";
import { HabitInsights } from "@/components/habits/habit-insights";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoodTrend } from "@/components/stats/mood-trend";
import { ProductivityChart } from "@/components/stats/productivity-chart";
import { StatCard } from "@/components/stats/stat-card";
import { TaskCompletionChart } from "@/components/stats/task-completion-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
  { value: "quarterly", label: "This quarter" },
  { value: "yearly", label: "This year" },
];

function DomainLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild size="sm" variant="outline" className="self-start">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

export function AnalyticsCenterClient({
  initialScores,
  trend,
  summary,
  achievements,
  weekBundle,
}: {
  initialScores: AnalyticsScores;
  trend: LifeScoreTrendPoint[];
  summary: AnalyticsCenterSummary;
  achievements: AchievementsOverview | null;
  weekBundle: ProductivityWeekBundle | null;
}) {
  const [period, setPeriod] = React.useState<AnalyticsPeriod>("monthly");
  const [scores, setScores] = React.useState(initialScores);
  const [isLoading, setLoading] = React.useState(false);

  async function handlePeriodChange(next: AnalyticsPeriod) {
    setPeriod(next);
    setLoading(true);
    const result = await getAnalyticsScores(next);
    setLoading(false);
    if (result.data) setScores(result.data);
  }

  return (
    <Tabs defaultValue="overview" className="flex flex-col gap-6">
      <div className="overflow-x-auto pb-1">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="habits">Habits</TabsTrigger>
          <TabsTrigger value="mood">Mood</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="travel">Travel</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Select value={period} onValueChange={(v) => handlePeriodChange(v as AnalyticsPeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLoading && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-2 pt-6">
            <span className="text-xs text-muted-foreground">Life Score</span>
            <span className="text-4xl font-semibold">{scores.life !== null ? Math.round(scores.life) : "—"}</span>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <ScoreCard label="Productivity" score={scores.productivity} icon="⚡" />
          <ScoreCard label="Health" score={scores.health} icon="🩺" />
          <ScoreCard label="Lifestyle" score={scores.lifestyle} icon="🌿" />
          <ScoreCard label="Consistency" score={scores.consistency} icon="🔥" />
          <ScoreCard label="Balance" score={scores.balance} icon="⚖️" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Life Score — last 8 weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <LifeScoreTrendChart points={trend} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="productivity" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Tasks done"
            value={`${summary.productivity.tasksCompletedThisWeek}/${summary.productivity.tasksPlannedThisWeek}`}
            sublabel="This week"
          />
          <StatCard
            label="Focus time"
            value={`${(summary.productivity.focusMinutesThisWeek / 60).toFixed(1)}h`}
            sublabel="This week"
          />
          <StatCard
            label="Productivity score"
            value={scores.productivity !== null ? String(Math.round(scores.productivity)) : "—"}
          />
        </div>
        {weekBundle && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Productive time — last 7 days</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductivityChart data={weekBundle.productivityData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task completion — last 7 days</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskCompletionChart data={weekBundle.taskCompletionData} />
              </CardContent>
            </Card>
          </>
        )}
        <DomainLink href="/today" label="Open task planner" />
      </TabsContent>

      <TabsContent value="health" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Avg sleep"
            value={summary.health.avgSleepHours !== null ? `${summary.health.avgSleepHours.toFixed(1)}h` : "—"}
            sublabel="Last 7 days"
          />
          <StatCard label="Exercise days" value={String(summary.health.exerciseDaysThisWeek)} sublabel="This week" />
          <StatCard
            label="Weight"
            value={summary.health.latestWeightKg !== null ? `${summary.health.latestWeightKg}kg` : "—"}
            sublabel={
              summary.health.weightChangeKg !== null
                ? `${summary.health.weightChangeKg > 0 ? "+" : ""}${summary.health.weightChangeKg}kg trend`
                : undefined
            }
          />
          <StatCard label="Health score" value={scores.health !== null ? String(Math.round(scores.health)) : "—"} />
        </div>
        <DomainLink href="/health" label="Open full health tracker" />
      </TabsContent>

      <TabsContent value="nutrition" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Avg daily calories"
            value={summary.nutrition.avgDailyCalories !== null ? String(summary.nutrition.avgDailyCalories) : "—"}
            sublabel={summary.nutrition.calorieGoal ? `Goal: ${summary.nutrition.calorieGoal}` : undefined}
          />
          <StatCard label="Days logged" value={String(summary.nutrition.daysLoggedThisWeek)} sublabel="This week" />
        </div>
        <DomainLink href="/nutrition" label="Open full nutrition tracker" />
      </TabsContent>

      <TabsContent value="finance" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Spent this month"
            value={`${summary.finance.spentThisMonth.toLocaleString()} ${summary.finance.currency}`}
          />
          <StatCard
            label="Monthly budget"
            value={
              summary.finance.budgetLimit !== null
                ? `${summary.finance.budgetLimit.toLocaleString()} ${summary.finance.currency}`
                : "Not set"
            }
          />
        </div>
        <DomainLink href="/finance" label="Open full finance dashboard" />
      </TabsContent>

      <TabsContent value="goals" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Active goals" value={String(summary.goals.activeCount)} />
          <StatCard
            label="Avg progress"
            value={summary.goals.avgProgressPct !== null ? `${summary.goals.avgProgressPct}%` : "—"}
          />
          <StatCard label="Completed this month" value={String(summary.goals.completedThisMonth)} />
        </div>
        <DomainLink href="/goals" label="Open full goals tracker" />
      </TabsContent>

      <TabsContent value="habits" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Active habits" value={String(summary.habits.activeCount)} />
          <StatCard label="Longest streak" value={`${summary.habits.longestStreak}d`} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <HabitInsights />
          </CardContent>
        </Card>
        <DomainLink href="/habits" label="Open full habit tracker" />
      </TabsContent>

      <TabsContent value="mood" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Avg mood"
            value={summary.mood.avgMoodThisWeek !== null ? `${summary.mood.avgMoodThisWeek}/5` : "—"}
            sublabel="This week"
          />
          <StatCard
            label="Lifestyle score"
            value={scores.lifestyle !== null ? String(Math.round(scores.lifestyle)) : "—"}
          />
        </div>
        {weekBundle && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mood trend — last 7 days</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <MoodTrend days={weekBundle.moodData} />
            </CardContent>
          </Card>
        )}
        <DomainLink href="/mood" label="Open full mood tracker" />
      </TabsContent>

      <TabsContent value="learning" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Active courses" value={String(summary.learning.activeCourses)} />
          <StatCard label="Flashcards due" value={String(summary.learning.dueFlashcards)} />
          <StatCard label="Study streak" value={`${summary.learning.studyStreakDays}d`} />
        </div>
        <DomainLink href="/learn" label="Open Learning Hub" />
      </TabsContent>

      <TabsContent value="travel" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Upcoming trips" value={String(summary.travel.upcomingTrips)} />
          <StatCard label="Past trips" value={String(summary.travel.pastTrips)} />
        </div>
        <DomainLink href="/travel" label="Open Travel Planner" />
      </TabsContent>

      <TabsContent value="achievements" className="flex flex-col gap-4">
        {achievements ? (
          <AchievementsClient overview={achievements} />
        ) : (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load achievements.</p>
        )}
      </TabsContent>

      <TabsContent value="ai-insights" className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Coach</CardTitle>
          </CardHeader>
          <CardContent>
            <CoachPanel />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
