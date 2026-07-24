"use client";

import * as React from "react";
import { Loader2Icon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

const EXAMPLES = [
  "Best sushi near me",
  "Romantic restaurant",
  "Good gym under €20",
  "Things to do for two hours",
  "Places open now",
  "Quiet coffee shop for studying",
];

export function NaturalLanguageSearch({
  onSearch,
  isParsing,
}: {
  onSearch: (query: string) => void;
  isParsing: boolean;
}) {
  const [value, setValue] = React.useState("");
  const [placeholder] = React.useState(() => `Try: "${EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]}"`);

  function submit() {
    if (!value.trim() || isParsing) return;
    onSearch(value.trim());
  }

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="pr-9 pl-9"
        aria-label="Describe what you're looking for"
      />
      {isParsing ? (
        <Loader2Icon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        value.trim() && (
          <button
            type="button"
            onClick={submit}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs font-medium text-primary hover:underline"
          >
            Search
          </button>
        )
      )}
    </div>
  );
}
