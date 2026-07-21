"use client";

import * as React from "react";
import { CompassIcon, Loader2Icon, MapPinIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { generateSimilarActivities } from "@/app/(app)/discover/actions";
import { ActivitiesOverviewMap } from "@/components/discover/activities-overview-map";
import { CategorySelector } from "@/components/discover/category-selector";
import { EventCard } from "@/components/discover/event-card";
import { SavedActivitiesList } from "@/components/discover/saved-activities-list";
import { SuggestionCard } from "@/components/discover/suggestion-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActivitySuggestion } from "@/lib/activities/discover";
import type { ActivityCategory } from "@/lib/activities/geoapify-client";
import type { EventCandidate } from "@/lib/activities/ticketmaster-client";
import type { Tables } from "@/types/database";

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "error"; message: string };

type EventWithDistance = EventCandidate & { distanceKm: number };

export function DiscoverClient({
  eventsAvailable,
  initialSavedActivities,
}: {
  eventsAvailable: boolean;
  initialSavedActivities: Tables<"saved_activities">[];
}) {
  const [categories, setCategories] = React.useState<ActivityCategory[]>(["food_drink", "outdoors"]);
  const [includeEvents, setIncludeEvents] = React.useState(false);
  const [maxDistanceKm, setMaxDistanceKm] = React.useState("5");
  const [availableMinutes, setAvailableMinutes] = React.useState("120");
  const [budget, setBudget] = React.useState("low");
  const [indoorOutdoor, setIndoorOutdoor] = React.useState("any");
  const [social, setSocial] = React.useState("any");

  const [location, setLocation] = React.useState<LocationState>({ status: "idle" });
  const [isSearching, setIsSearching] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<ActivitySuggestion[] | null>(null);
  const [events, setEvents] = React.useState<EventWithDistance[] | null>(null);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [isGeneratingSimilar, setIsGeneratingSimilar] = React.useState(false);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocation({ status: "error", message: "Geolocation isn't available in this browser" });
      return;
    }
    setLocation({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          status: "ready",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setLocation({
          status: "error",
          message: "Location permission denied — allow it in your browser to find nearby places",
        });
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  async function handleSearch() {
    if (location.status !== "ready") {
      requestLocation();
      return;
    }
    if (categories.length === 0 && !includeEvents) {
      toast.error("Pick at least one category");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const requests: Promise<void>[] = [];

      if (categories.length > 0) {
        requests.push(
          fetch("/api/activities/discover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categories,
              location: { lat: location.lat, lng: location.lng },
              maxDistanceKm: Number(maxDistanceKm),
              availableMinutes: Number(availableMinutes),
              budget,
              indoorOutdoor,
              social,
            }),
          })
            .then((r) => r.json())
            .then((json) => setSuggestions(json.data ?? [])),
        );
      } else {
        setSuggestions([]);
      }

      if (includeEvents) {
        requests.push(
          fetch("/api/activities/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: { lat: location.lat, lng: location.lng },
              maxDistanceKm: Number(maxDistanceKm),
            }),
          })
            .then((r) => r.json())
            .then((json) => setEvents(json.data ?? [])),
        );
      } else {
        setEvents(null);
      }

      await Promise.all(requests);
    } catch {
      setSearchError("Couldn't reach the activity discovery service");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleGenerateSimilar(reference: ActivitySuggestion) {
    if (location.status !== "ready") return;
    setIsGeneratingSimilar(true);
    try {
      const result = await generateSimilarActivities({
        category: reference.category,
        location: { lat: location.lat, lng: location.lng },
        maxDistanceKm: Number(maxDistanceKm),
        availableMinutes: Number(availableMinutes),
        budget: budget as "free" | "low" | "medium" | "high",
        indoorOutdoor: indoorOutdoor as "indoor" | "outdoor" | "any",
        social: social as "solo" | "group" | "any",
        referencePlaceName: reference.placeName,
        referencePitch: reference.pitch,
      });
      if (result.error) {
        toast.error("Couldn't find similar activities", { description: result.error });
        return;
      }
      const found = result.suggestions ?? [];
      if (found.length === 0) {
        toast.info("No similar places found nearby");
        return;
      }
      setSuggestions((prev) => [...found, ...(prev ?? [])]);
      toast.success(`Found ${found.length} more like "${reference.placeName}"`);
    } finally {
      setIsGeneratingSimilar(false);
    }
  }

  return (
    <Tabs defaultValue="discover" className="flex flex-col gap-6">
      <TabsList>
        <TabsTrigger value="discover">Discover</TabsTrigger>
        <TabsTrigger value="saved">Saved</TabsTrigger>
      </TabsList>

      <TabsContent value="discover" className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label>What are you in the mood for?</Label>
            <CategorySelector
              selected={categories}
              onChange={setCategories}
              includeEvents={includeEvents}
              onToggleEvents={() => setIncludeEvents((v) => !v)}
              eventsAvailable={eventsAvailable}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxDistanceKm">Max distance (km)</Label>
              <Input
                id="maxDistanceKm"
                type="number"
                min={0.5}
                step="0.5"
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="availableMinutes">Time available (min)</Label>
              <Input
                id="availableMinutes"
                type="number"
                min={10}
                step="10"
                value={availableMinutes}
                onChange={(e) => setAvailableMinutes(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget">Budget</Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger id="budget">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="low">$</SelectItem>
                  <SelectItem value="medium">$$</SelectItem>
                  <SelectItem value="high">$$$</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="indoorOutdoor">Setting</Label>
              <Select value={indoorOutdoor} onValueChange={setIndoorOutdoor}>
                <SelectTrigger id="indoorOutdoor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="indoor">Indoor</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:w-48">
            <Label htmlFor="social">Company</Label>
            <Select value={social} onValueChange={setSocial}>
              <SelectTrigger id="social">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Either</SelectItem>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="group">With others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {location.status === "error" && (
            <p className="text-sm text-destructive">{location.message}</p>
          )}

          <Button onClick={handleSearch} disabled={isSearching} className="self-start">
            {isSearching ? (
              <Loader2Icon className="animate-spin" />
            ) : location.status === "ready" ? (
              <SparklesIcon />
            ) : (
              <MapPinIcon />
            )}
            {location.status === "ready" ? "Find activities" : "Share location & find activities"}
          </Button>
        </div>

        {searchError && <p className="text-sm text-destructive">{searchError}</p>}
        {isGeneratingSimilar && (
          <p className="text-sm text-muted-foreground">Finding more like that…</p>
        )}

        {location.status === "ready" && (suggestions?.length || events?.length) ? (
          <ActivitiesOverviewMap
            center={{ lat: location.lat, lng: location.lng }}
            points={[
              ...(suggestions ?? []).map((s) => s.location),
              ...(events ?? []).map((e) => e.location),
            ]}
          />
        ) : null}

        {events && events.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">Live events nearby</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {suggestions &&
          (suggestions.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {suggestions.map((suggestion, index) => (
                <SuggestionCard
                  key={`${suggestion.placeName}-${index}`}
                  suggestion={suggestion}
                  onGenerateSimilar={handleGenerateSimilar}
                />
              ))}
            </div>
          ) : (
            (!events || events.length === 0) && (
              <EmptyState
                icon={CompassIcon}
                title="No matches nearby"
                description="Try a wider distance, a different budget, or a few more categories."
              />
            )
          ))}
      </TabsContent>

      <TabsContent value="saved">
        <SavedActivitiesList initial={initialSavedActivities} />
      </TabsContent>
    </Tabs>
  );
}
