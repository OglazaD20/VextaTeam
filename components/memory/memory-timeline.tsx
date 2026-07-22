"use client";

import * as React from "react";
import { BrainIcon } from "lucide-react";

import { MemoryCard } from "@/components/memory/memory-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

function dateGroupLabel(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(
    new Date(iso),
  );
}

export function MemoryTimeline({
  memories,
  categories,
}: {
  memories: Tables<"memories">[];
  categories: string[];
}) {
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  const filtered = activeCategory ? memories.filter((m) => m.category === activeCategory) : memories;

  const groups = new Map<string, Tables<"memories">[]>();
  for (const memory of filtered) {
    const dateKey = memory.occurred_at.slice(0, 10);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(memory);
  }

  if (memories.length === 0) {
    return (
      <EmptyState
        icon={BrainIcon}
        title="No memories yet"
        description="As you use LifeFlow — save places, set goals, log notes — your second brain builds up here automatically."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              activeCategory === null ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs capitalize",
                activeCategory === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {[...groups.entries()].map(([dateKey, dayMemories]) => (
        <div key={dateKey} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{dateGroupLabel(dateKey)}</h3>
          <div className="flex flex-col gap-2">
            {dayMemories.map((m) => (
              <MemoryCard key={m.id} memory={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
