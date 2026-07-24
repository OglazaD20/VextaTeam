"use client";

import * as React from "react";
import { Loader2Icon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { LatLng } from "@/lib/activities/distance";

interface GeocodeResult {
  formatted: string;
  location: LatLng;
}

export function LocationSearchBox({ onSelect }: { onSelect: (location: LatLng, label: string) => void }) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (query.trim().length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/activities/geocode?q=${encodeURIComponent(query)}`);
        const json = await response.json();
        setResults(response.ok ? (json.data ?? []) : []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleSelect(result: GeocodeResult) {
    onSelect(result.location, result.formatted);
    setQuery(result.formatted);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search another location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="pl-9"
        />
        {isSearching && (
          <Loader2Icon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-md">
          {results.map((result, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(result)}
              className="block w-full px-3.5 py-2 text-left text-sm hover:bg-accent"
            >
              {result.formatted}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
