"use client";

import * as React from "react";
import { XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TagInput({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  function addTag(name: string) {
    const clean = name.trim();
    if (!clean || value.includes(clean)) return;
    onChange([...value, clean]);
    setDraft("");
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  const filteredSuggestions = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase()),
  );

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-input px-2.5 py-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
              aria-label={`Remove ${tag}`}
            >
              <XIcon className="size-2.5" />
            </button>
          </Badge>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(draft);
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              removeTag(value[value.length - 1]);
            }
          }}
          placeholder={value.length === 0 ? "Add tags…" : ""}
          className="h-6 w-auto min-w-24 flex-1 border-none p-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full z-10 mt-1 w-full rounded-xl border border-border bg-popover p-1 shadow-md">
          {filteredSuggestions.slice(0, 6).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(suggestion);
              }}
              className={cn(
                "w-full rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-accent",
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
