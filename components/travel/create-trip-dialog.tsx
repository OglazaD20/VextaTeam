"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { createTrip } from "@/app/(app)/travel/actions";
import type { CreateTripInput } from "@/app/(app)/travel/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TRANSPORT_OPTIONS = [
  { value: "flight", label: "Flight" },
  { value: "train", label: "Train" },
  { value: "car", label: "Car" },
  { value: "bus", label: "Bus" },
  { value: "other", label: "Other" },
];

export function CreateTripDialog() {
  const router = useRouter();
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createTrip({
        title: String(formData.get("title") ?? ""),
        destination: String(formData.get("destination") ?? ""),
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
        budget: formData.get("budget") ? Number(formData.get("budget")) : undefined,
        currency: String(formData.get("currency") ?? "EUR"),
        transportation: (formData.get("transportation") || undefined) as CreateTripInput["transportation"],
      });

      if (result.error || !result.data) {
        setError(result.error ?? "Couldn't create that trip");
        toast.error("Couldn't create trip", { description: result.error });
        return;
      }

      toast.success("Trip created");
      setOpen(false);
      router.push(`/travel/${result.data.id}`);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="size-3.5" /> New trip
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Plan a trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trip-title">Trip name</Label>
            <Input id="trip-title" name="title" placeholder="Summer in Rome" required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trip-destination">Destination</Label>
            <Input id="trip-destination" name="destination" placeholder="Rome, Italy" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-start">Start date</Label>
              <Input id="trip-start" name="startDate" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-end">End date</Label>
              <Input id="trip-end" name="endDate" type="date" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-budget">Budget (optional)</Label>
              <Input id="trip-budget" name="budget" type="number" min={0} step="any" placeholder="1500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-currency">Currency</Label>
              <Input id="trip-currency" name="currency" defaultValue="EUR" maxLength={3} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trip-transportation">Transportation</Label>
            <Select name="transportation">
              <SelectTrigger id="trip-transportation">
                <SelectValue placeholder="How are you getting there?" />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Create trip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
