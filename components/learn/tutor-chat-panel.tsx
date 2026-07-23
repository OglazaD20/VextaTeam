"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCapIcon, Loader2Icon, SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TutorChatApiResponse {
  conversationId?: string;
  message?: string;
  error?: string;
}

export function TutorChatPanel({ courseId, suggestions }: { courseId?: string; suggestions?: string[] }) {
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
      const response = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId: conversationId ?? undefined, courseId }),
      });
      const result: TutorChatApiResponse = await response.json();

      if (!response.ok || result.error || !result.message) {
        setError(result.error ?? "Something went wrong");
        return;
      }

      setConversationId(result.conversationId ?? null);
      setMessages((prev) => [...prev, { role: "assistant", content: result.message! }]);
      router.refresh();
    } catch {
      setError("Couldn't reach the AI Tutor");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="glass-surface flex h-[28rem] flex-col rounded-2xl border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <GraduationCapIcon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">AI Tutor</p>
          <p className="text-xs text-muted-foreground">Ask questions, or generate flashcards/quizzes/study plans</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm">
            Ask me to explain something, quiz you, make flashcards, or build a study plan.
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
              message.role === "user"
                ? "self-end rounded-br-sm bg-primary text-primary-foreground"
                : "self-start rounded-bl-sm bg-muted",
            )}
          >
            {message.content}
          </div>
        ))}

        {isSending && (
          <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            Thinking…
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {messages.length === 0 && suggestions && suggestions.length > 0 && (
          <div className="mt-auto flex flex-col gap-2">
            {suggestions.map((suggestion) => (
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
          placeholder="Ask the AI Tutor…"
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
