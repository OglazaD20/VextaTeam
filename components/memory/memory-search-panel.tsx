"use client";

import * as React from "react";
import { Loader2Icon, SearchIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { askMemory, type AskMemoryResult } from "@/app/(app)/memory/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const EXAMPLE_QUESTIONS = [
  "What restaurant did I save last month?",
  "What gift ideas did I save?",
  "What did I do last weekend?",
  "What did I want to buy?",
];

export function MemorySearchPanel() {
  const [question, setQuestion] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<AskMemoryResult | null>(null);

  function handleAsk(q?: string) {
    const text = q ?? question;
    if (!text.trim()) return;
    setQuestion(text);

    startTransition(async () => {
      const response = await askMemory({ question: text });
      if (response.error) {
        toast.error("Couldn't search your memories", { description: response.error });
        return;
      }
      setResult(response.data ?? null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Ask anything about your history…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => handleAsk()} disabled={isPending || !question.trim()}>
          {isPending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Ask
        </Button>
      </div>

      {!result && !isPending && (
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleAsk(q)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {result && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm">{result.answer}</p>
            {result.citedMemories.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Sources</p>
                {result.citedMemories.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{m.category ? "📌" : "•"}</span>
                    <span className="font-medium text-foreground">{m.title}</span>
                    <span>
                      {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
                        new Date(m.occurredAt),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
