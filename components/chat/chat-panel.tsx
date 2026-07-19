"use client";

import { SendIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "What should I do next?",
  "Can I fit a gym workout today?",
  "When am I free this week?",
];

export function ChatPanel({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SparklesIcon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Assistant</p>
          <p className="text-xs text-muted-foreground">Ask about your day</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto p-4">
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm">
          Hi! Once your schedule is connected I&apos;ll help you plan, reprioritize,
          and answer questions about your day. This assistant lands in an
          upcoming milestone — for now, enjoy the preview.
        </div>
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled
              className="w-fit rounded-full border border-border px-3 py-1.5 text-left text-xs text-muted-foreground opacity-70"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <form className="flex items-center gap-2 border-t border-border p-3">
        <Input
          placeholder="Assistant chat arrives soon…"
          disabled
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled aria-label="Send">
          <SendIcon />
        </Button>
      </form>
    </div>
  );
}
