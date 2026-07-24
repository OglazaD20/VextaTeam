"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { logHealthMetrics } from "@/app/(app)/health/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface QuickEditField {
  name: string;
  label: string;
  type?: "number" | "text";
  step?: string;
  defaultValue: number | string | null;
}

export function HealthQuickEditPopover({
  todayKey,
  title,
  fields,
  trigger,
}: {
  todayKey: string;
  title: string;
  fields: QuickEditField[];
  trigger: React.ReactNode;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [isOpen, setOpen] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("date", todayKey);

    startTransition(async () => {
      const result = await logHealthMetrics(formData);
      if (result.error) {
        toast.error(`Couldn't save ${title.toLowerCase()}`, { description: result.error });
        return;
      }
      toast.success("Saved");
      setOpen(false);
    });
  }

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-sm font-medium">Log {title.toLowerCase()}</p>
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label htmlFor={`qe-${field.name}`}>{field.label}</Label>
              <Input
                id={`qe-${field.name}`}
                name={field.name}
                type={field.type ?? "number"}
                step={field.step}
                min={field.type === "text" ? undefined : 0}
                defaultValue={field.defaultValue ?? ""}
                autoFocus
              />
            </div>
          ))}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending && <Loader2Icon className="animate-spin" />}
            Save
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
