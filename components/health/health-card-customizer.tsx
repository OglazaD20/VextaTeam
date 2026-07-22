"use client";

import * as React from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { toast } from "sonner";

import { updateVisibleHealthCards } from "@/app/(app)/health/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HEALTH_CARD_KEYS, HEALTH_CARD_LABEL, type HealthCardKey } from "@/lib/health/cards";

export function HealthCardCustomizer({ visible }: { visible: HealthCardKey[] }) {
  const [selected, setSelected] = React.useState<Set<HealthCardKey>>(() => new Set(visible));
  const [isPending, startTransition] = React.useTransition();

  function toggle(key: HealthCardKey, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(key);
    else next.delete(key);
    setSelected(next);

    startTransition(async () => {
      const result = await updateVisibleHealthCards([...next]);
      if (result.error) {
        toast.error("Couldn't update your cards", { description: result.error });
      }
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <SlidersHorizontalIcon className="size-3.5" /> Customize
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <p className="mb-2 text-sm font-medium">Visible cards</p>
        <div className="flex flex-col gap-2.5">
          {HEALTH_CARD_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`card-${key}`}
                checked={selected.has(key)}
                onCheckedChange={(checked) => toggle(key, checked === true)}
              />
              <Label htmlFor={`card-${key}`} className="text-sm font-normal">
                {HEALTH_CARD_LABEL[key]}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
