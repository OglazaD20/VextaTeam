import type { Metadata } from "next";

import { getMemoryCategories, getMemoryTimeline } from "@/app/(app)/memory/actions";
import { MemoryClient } from "@/components/memory/memory-client";

export const metadata: Metadata = { title: "Memory — LifeFlow" };

export default async function MemoryPage() {
  const [allResult, pinnedResult, favoritedResult, categoriesResult] = await Promise.all([
    getMemoryTimeline(),
    getMemoryTimeline({ pinnedOnly: true }),
    getMemoryTimeline({ favoritedOnly: true }),
    getMemoryCategories(),
  ]);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Memory</h1>
        <p className="text-sm text-muted-foreground">
          Your second brain — everything you save, tracked and searchable.
        </p>
      </div>

      {allResult.error ? (
        <p className="text-sm text-destructive">{allResult.error}</p>
      ) : (
        <MemoryClient
          memories={allResult.data ?? []}
          pinned={pinnedResult.data ?? []}
          favorited={favoritedResult.data ?? []}
          categories={categoriesResult.data ?? []}
        />
      )}
    </div>
  );
}
