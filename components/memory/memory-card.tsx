"use client";

import * as React from "react";
import { ChevronDownIcon, Loader2Icon, PinIcon, StarIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteMemory, getRelatedMemories, toggleMemoryFavorited, toggleMemoryPinned } from "@/app/(app)/memory/actions";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MEMORY_SOURCE_ICON, MEMORY_SOURCE_LABEL } from "@/lib/memory/source-style";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

interface RelatedMemory {
  id: string;
  title: string;
  content: string;
  category: string | null;
  occurredAt: string;
  similarity: number;
}

export function MemoryCard({ memory }: { memory: Tables<"memories"> }) {
  const [pinned, setPinned] = React.useState(memory.pinned);
  const [favorited, setFavorited] = React.useState(memory.favorited);
  const [isDeleted, setDeleted] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isRelatedOpen, setRelatedOpen] = React.useState(false);
  const [related, setRelated] = React.useState<RelatedMemory[] | null>(null);
  const [isLoadingRelated, setLoadingRelated] = React.useState(false);

  async function handlePin() {
    setPinned((v) => !v);
    const result = await toggleMemoryPinned(memory.id);
    if (result.error) {
      setPinned((v) => !v);
      toast.error("Couldn't update that", { description: result.error });
    }
  }

  async function handleFavorite() {
    setFavorited((v) => !v);
    const result = await toggleMemoryFavorited(memory.id);
    if (result.error) {
      setFavorited((v) => !v);
      toast.error("Couldn't update that", { description: result.error });
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteMemory(memory.id);
    if (result.error) {
      setIsDeleting(false);
      toast.error("Couldn't remove that memory", { description: result.error });
      return;
    }
    setDeleted(true);
  }

  async function handleToggleRelated(open: boolean) {
    setRelatedOpen(open);
    if (open && related === null) {
      setLoadingRelated(true);
      const result = await getRelatedMemories(memory.id);
      setLoadingRelated(false);
      if (result.error) {
        toast.error("Couldn't load related memories", { description: result.error });
        return;
      }
      setRelated(result.data ?? []);
    }
  }

  if (isDeleted) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="text-lg">{MEMORY_SOURCE_ICON[memory.source_type]}</span>
          <div>
            <p className="font-medium">{memory.title}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <Badge variant="outline" className="text-[10px]">
                {MEMORY_SOURCE_LABEL[memory.source_type]}
              </Badge>
              {memory.category && (
                <Badge variant="outline" className="text-[10px]">
                  {memory.category}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
                  new Date(memory.occurred_at),
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handlePin}
            aria-label={pinned ? "Unpin" : "Pin"}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <PinIcon className={cn("size-3.5", pinned && "fill-primary text-primary")} />
          </button>
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={favorited ? "Unfavorite" : "Favorite"}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <StarIcon className={cn("size-3.5", favorited && "fill-warning text-warning")} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete memory"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-50"
          >
            {isDeleting ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{memory.content}</p>

      <Collapsible open={isRelatedOpen} onOpenChange={handleToggleRelated}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Related memories
            <ChevronDownIcon className={cn("size-3 transition-transform", isRelatedOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-1.5 pt-2">
            {isLoadingRelated ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : related && related.length > 0 ? (
              related.map((r) => (
                <div key={r.id} className="rounded-lg border border-border px-2 py-1.5 text-xs">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-muted-foreground">{r.content}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No related memories found.</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
