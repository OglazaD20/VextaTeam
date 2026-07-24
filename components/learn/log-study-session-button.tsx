"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, TimerIcon } from "lucide-react";
import { toast } from "sonner";

import { logStudySession } from "@/app/(app)/learn/actions";
import { Button } from "@/components/ui/button";

const PRESETS = [15, 25, 45, 60];

export function LogStudySessionButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [pendingMinutes, setPendingMinutes] = React.useState<number | null>(null);

  function handleLog(minutes: number) {
    setPendingMinutes(minutes);
    startTransition(async () => {
      const result = await logStudySession({ courseId, durationMinutes: minutes });
      if (result.error) {
        toast.error("Couldn't log that session", { description: result.error });
        return;
      }
      toast.success(`Logged ${minutes} min of study`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <TimerIcon className="size-3.5 text-muted-foreground" />
      {PRESETS.map((minutes) => (
        <Button
          key={minutes}
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          disabled={isPending}
          onClick={() => handleLog(minutes)}
        >
          {isPending && pendingMinutes === minutes ? <Loader2Icon className="size-3 animate-spin" /> : `${minutes}m`}
        </Button>
      ))}
    </div>
  );
}
