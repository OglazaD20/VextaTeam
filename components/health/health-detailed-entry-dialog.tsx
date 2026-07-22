"use client";

import * as React from "react";
import { ListPlusIcon } from "lucide-react";

import { HealthLogForm } from "@/components/health/health-log-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Tables } from "@/types/database";

export function HealthDetailedEntryDialog({
  todayKey,
  existing,
}: {
  todayKey: string;
  existing: Tables<"health_metrics"> | null;
}) {
  const [isOpen, setOpen] = React.useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ListPlusIcon className="size-3.5" /> Detailed entry
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log everything for today</DialogTitle>
        </DialogHeader>
        <HealthLogForm todayKey={todayKey} existing={existing} />
      </DialogContent>
    </Dialog>
  );
}
