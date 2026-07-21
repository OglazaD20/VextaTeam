"use client";

import * as React from "react";
import { Loader2Icon, MapPinIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { CategorySelector } from "@/components/discover/category-selector";
import { SuggestionCard } from "@/components/discover/suggestion-card";
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
import type { ActivitySuggestion } from "@/lib/activities/discover";
import type { ActivityCategory } from "@/lib/activities/geoapify-client";

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "error"; message: string };

export function DiscoverClient() {
  const [categories, setCategories] = React.useState<ActivityCategory[]>(["food_drink", "outdoors"]);
  const [maxDistanceKm, setMaxDistanceKm] = React.useState("5");
  const [availableMinutes, setAvailableMinutes] = React.useState("120");
  const [budget, setBudget] = React.useState("low");
  const [indoorOutdoor, setIndoorOutdoor] = React.useState("any");
  const [social, setSocial] = React.useState("any");

  const [location, setLocation] = React.useState<LocationState>({ status: "idle" });
  const [isSearching, setIsSearching] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<ActivitySuggestion[] | null>(null);
  const [searchError, setSearchError] = React.useState<string | null>(null);

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
    if (categories.length === 0) {
      toast.error("Pick at least one category");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch("/api/activities/discover", {
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
      });
      const json = await response.json();
      if (!response.ok) {
        setSearchError(json.error ?? "Couldn't find activities");
        setSuggestions(null);
        return;
      }
      setSuggestions(json.data ?? []);
      if ((json.data ?? []).length === 0) {
        toast.info("No matches nearby — try widening the distance or picking more categories.");
      }
    } catch {
      setSearchError("Couldn't reach the activity discovery service");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label>What are you in the mood for?</Label>
          <CategorySelector selected={categories} onChange={setCategories} />
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

      {suggestions && suggestions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {suggestions.map((suggestion, index) => (
            <SuggestionCard key={`${suggestion.placeName}-${index}`} suggestion={suggestion} />
          ))}
        </div>
      )}
    </div>
  );
}
