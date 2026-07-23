"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteTrip } from "@/app/(app)/travel/actions";
import { Button } from "@/components/ui/button";

export function DeleteTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTrip(tripId);
      if (result.error) {
        toast.error("Couldn't delete that trip", { description: result.error });
        return;
      }
      toast.success("Trip deleted");
      router.push("/travel");
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isPending}>
      {isPending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
      Delete
    </Button>
  );
}
