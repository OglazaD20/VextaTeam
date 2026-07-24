"use client";

import { motion } from "framer-motion";
import {
  BellRingIcon,
  CalendarSyncIcon,
  ListChecksIcon,
  SparklesIcon,
  TimerIcon,
  TrendingUpIcon,
} from "lucide-react";

const FEATURES = [
  {
    icon: SparklesIcon,
    title: "AI daily planning",
    description:
      "Add meetings, deadlines, and tasks in plain language. LifeFlow estimates durations, prioritizes what matters, and builds the schedule.",
  },
  {
    icon: BellRingIcon,
    title: "Smart notifications",
    description:
      "“Leave in 18 minutes — traffic increased.” Contextual nudges, not generic reminders.",
  },
  {
    icon: CalendarSyncIcon,
    title: "AI assistant chat",
    description:
      "“Can I fit a gym workout today?” Ask, and LifeFlow updates your schedule live.",
  },
  {
    icon: ListChecksIcon,
    title: "Habits that stick",
    description:
      "Sleep, gym, water, reading, meditation, walking — tracked with streaks and gentle skip detection.",
  },
  {
    icon: TimerIcon,
    title: "Focus mode",
    description:
      "Pomodoro timer, muted notifications, and deep work tracking whenever you need to disappear into a task.",
  },
  {
    icon: TrendingUpIcon,
    title: "Smart statistics",
    description:
      "Weekly reports on productive hours, focus score, habit streaks, and mood trends — with AI recommendations.",
  },
] as const;

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto mb-12 max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Everything a calendar and to-do app forgot
        </h2>
        <p className="mt-3 text-muted-foreground">
          LifeFlow sits above both — deciding what to do, when, and adapting
          the moment reality changes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }, index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
