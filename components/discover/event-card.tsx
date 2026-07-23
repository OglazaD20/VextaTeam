"use client";

import { useTransition } from "react";
import {
  CalendarIcon,
  MapPinIcon,
  MessageCircleQuestionIcon,
  PlusIcon,
  Share2Icon,
  StarIcon,
  TicketIcon,
} from "lucide-react";
import { toast } from "sonner";

import { addEventToSchedule, saveActivity } from "@/app/(app)/discover/actions";
import { ResilientImage } from "@/components/shared/resilient-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/hooks/use-ui-store";
import type { EventCandidate } from "@/lib/activities/ticketmaster-client";
import { shareOrCopy } from "@/lib/activities/share";

function formatEventDate(iso: string | null): string {
  if (!iso) return "Date TBA";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPrice(event: EventCandidate): string | null {
  if (event.priceMin === null) return null;
  const currency = event.currency ?? "";
  return event.priceMax && event.priceMax !== event.priceMin
    ? `${event.priceMin}–${event.priceMax} ${currency}`
    : `${event.priceMin} ${currency}`;
}

export function EventCard({ event }: { event: EventCandidate & { distanceKm: number } }) {
  const [isAdding, startAdding] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const askAssistant = useUIStore((state) => state.askAssistant);
  const price = formatPrice(event);

  function handleAskAi() {
    askAssistant(
      `Tell me more about "${event.name}" at ${event.venueName} on ${formatEventDate(event.startIso)} — is it a good fit for me?`,
    );
  }

  function handleAdd() {
    if (!event.startIso) {
      toast.error("This event doesn't have a confirmed date yet");
      return;
    }
    startAdding(async () => {
      const result = await addEventToSchedule({
        name: event.name,
        venueName: event.venueName,
        address: event.address,
        url: event.url,
        startIso: event.startIso!,
        estimatedDurationMinutes: 120,
      });
      if (result.error) {
        toast.error("Couldn't add that event", { description: result.error });
      } else {
        toast.success("Added to your calendar");
      }
    });
  }

  function handleSave() {
    startSaving(async () => {
      const result = await saveActivity({
        kind: "event",
        title: event.name,
        subtitle: event.venueName,
        lat: event.location.lat,
        lng: event.location.lng,
        startsAt: event.startIso,
        data: event as unknown as Record<string, unknown>,
      });
      if (result.error) {
        toast.error("Couldn't save that", { description: result.error });
      } else {
        toast.success("Saved for later");
      }
    });
  }

  async function handleShare() {
    const result = await shareOrCopy({
      title: event.name,
      text: `${event.name} at ${event.venueName} — ${formatEventDate(event.startIso)}`,
      url: event.url,
    });
    if (result === "copied") toast.success("Copied to clipboard");
    if (result === "failed") toast.error("Couldn't share that");
  }

  return (
    <div className="glass-surface flex flex-col gap-3 rounded-2xl border border-border p-4 shadow-sm">
      {event.imageUrl ? (
        <ResilientImage
          src={event.imageUrl}
          alt={event.name}
          className="h-32 w-full"
          fallbackIcon={TicketIcon}
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-xl bg-muted">
          <TicketIcon className="size-8 text-muted-foreground" />
        </div>
      )}

      <div>
        <p className="font-medium">{event.name}</p>
        <p className="text-sm text-muted-foreground">{formatEventDate(event.startIso)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPinIcon className="size-3" />
          {event.venueName} · {event.distanceKm}km
        </span>
        <span className="flex items-center gap-1">
          <CalendarIcon className="size-3" />
          {formatEventDate(event.startIso)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {event.classification && (
          <Badge variant="outline" className="text-[10px]">
            {event.classification}
          </Badge>
        )}
        {price && (
          <Badge variant="outline" className="text-[10px]">
            {price}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={isAdding || !event.startIso}>
          <PlusIcon className="size-3.5" /> Add to calendar
        </Button>
        <Button size="sm" variant="ghost" onClick={handleSave} disabled={isSaving}>
          <StarIcon className="size-3.5" /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={handleShare}>
          <Share2Icon className="size-3.5" /> Share
        </Button>
        <Button size="sm" variant="ghost" onClick={handleAskAi}>
          <MessageCircleQuestionIcon className="size-3.5" /> Ask AI
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href={event.url} target="_blank" rel="noopener noreferrer">
            <TicketIcon className="size-3.5" /> Tickets
          </a>
        </Button>
      </div>
    </div>
  );
}
