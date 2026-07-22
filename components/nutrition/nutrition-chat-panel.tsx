"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppleIcon, Loader2Icon, SendIcon } from "lucide-react";

import { NutritionFoodSummaryCard } from "@/components/nutrition/nutrition-food-summary-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NutritionChatSummary } from "@/lib/ai/nutrition-chat-tools";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "How many calories does one banana have?",
  "I ate two apples and 150g of chicken breast.",
  "What should I eat after a workout?",
  "Create a 2500 kcal meal plan.",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  foodSummary?: NutritionChatSummary | null;
}

interface NutritionChatApiResponse {
  conversationId?: string;
  message?: string;
  foodSummary?: NutritionChatSummary | null;
  error?: string;
}

export function NutritionChatPanel() {
  const router = useRouter();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/nutrition-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId: conversationId ?? undefined }),
      });
      const result: NutritionChatApiResponse = await response.json();

      if (!response.ok || result.error || !result.message) {
        setError(result.error ?? "Something went wrong");
        return;
      }

      setConversationId(result.conversationId ?? null);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.message!, foodSummary: result.foodSummary },
      ]);
      router.refresh();
    } catch {
      setError("Couldn't reach the nutrition assistant");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="glass-surface flex h-[32rem] flex-col rounded-2xl border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <AppleIcon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Nutrition Chat</p>
          <p className="text-xs text-muted-foreground">Ask about food, or tell me what you ate</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm">
            Ask me anything about food and nutrition, or tell me what you ate and I&apos;ll calculate it for you.
          </div>
        )}

        {messages.map((message, index) => (
          <React.Fragment key={index}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                message.role === "user"
                  ? "self-end rounded-br-sm bg-primary text-primary-foreground"
                  : "self-start rounded-bl-sm bg-muted",
              )}
            >
              {message.content}
            </div>
            {message.foodSummary && <NutritionFoodSummaryCard summary={message.foodSummary} />}
          </React.Fragment>
        ))}

        {isSending && (
          <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            Thinking…
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {messages.length === 0 && (
          <div className="mt-auto flex flex-col gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => sendMessage(suggestion)}
                disabled={isSending}
                className="w-fit rounded-full border border-border px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about nutrition…"
          disabled={isSending}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isSending || !input.trim()} aria-label="Send">
          <SendIcon />
        </Button>
      </form>
    </div>
  );
}
