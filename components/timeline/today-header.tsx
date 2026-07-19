"use client";

import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/hooks/use-ui-store";

export function TodayHeader() {
  const openQuickAdd = useUIStore((state) => state.openQuickAdd);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>
      <Button onClick={openQuickAdd} size="sm">
        <PlusIcon /> Add
      </Button>
    </div>
  );
}
