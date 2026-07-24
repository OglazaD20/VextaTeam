"use client";

import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/hooks/use-ui-store";

export function QuickAddTrigger() {
  const openQuickAdd = useUIStore((state) => state.openQuickAdd);

  return (
    <Button
      variant="outline"
      className="justify-start gap-2 text-muted-foreground"
      onClick={openQuickAdd}
    >
      <PlusIcon className="size-4" />
      Quick add
    </Button>
  );
}
