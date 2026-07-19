"use client";

import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function QuickAddTrigger() {
  return (
    <Button
      variant="outline"
      className="justify-start gap-2 text-muted-foreground"
      onClick={() =>
        toast("Quick add is on its way", {
          description:
            "Natural-language task capture arrives once the scheduling engine ships.",
        })
      }
    >
      <PlusIcon className="size-4" />
      Quick add
    </Button>
  );
}
