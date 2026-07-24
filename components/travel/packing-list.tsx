"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { addPackingItem, deletePackingItem, togglePackingItem } from "@/app/(app)/travel/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

export function PackingList({ tripId, items }: { tripId: string; items: Tables<"trip_packing_items">[] }) {
  const router = useRouter();
  const [newItem, setNewItem] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const byCategory = new Map<string, Tables<"trip_packing_items">[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  const packedCount = items.filter((i) => i.is_packed).length;

  function handleToggle(item: Tables<"trip_packing_items">) {
    startTransition(async () => {
      const result = await togglePackingItem(item.id, !item.is_packed);
      if (result.error) toast.error("Couldn't update that", { description: result.error });
      router.refresh();
    });
  }

  function handleDelete(itemId: string) {
    startTransition(async () => {
      await deletePackingItem(itemId);
      router.refresh();
    });
  }

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!newItem.trim()) return;
    startTransition(async () => {
      const result = await addPackingItem(tripId, { item: newItem.trim(), category: "general" });
      if (result.error) {
        toast.error("Couldn't add that item", { description: result.error });
        return;
      }
      setNewItem("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {packedCount}/{items.length} packed
        </p>
      )}

      {[...byCategory.entries()].map(([category, categoryItems]) => (
        <div key={category} className="flex flex-col gap-1.5">
          <h4 className="text-xs font-medium text-muted-foreground capitalize">{category}</h4>
          <div className="flex flex-col gap-1">
            {categoryItems.map((item) => (
              <div key={item.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-accent/50">
                <Checkbox checked={item.is_packed} onCheckedChange={() => handleToggle(item)} disabled={isPending} />
                <span className={cn("flex-1 text-sm", item.is_packed && "text-muted-foreground line-through")}>
                  {item.item}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  aria-label={`Remove ${item.item}`}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add an item…"
          className="h-8 text-sm"
        />
        <Button type="submit" size="icon" variant="ghost" className="size-8 shrink-0" disabled={!newItem.trim()} aria-label="Add packing item">
          <PlusIcon className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
