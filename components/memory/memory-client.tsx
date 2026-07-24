"use client";

import { MemorySearchPanel } from "@/components/memory/memory-search-panel";
import { MemoryTimeline } from "@/components/memory/memory-timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tables } from "@/types/database";

export function MemoryClient({
  memories,
  pinned,
  favorited,
  categories,
}: {
  memories: Tables<"memories">[];
  pinned: Tables<"memories">[];
  favorited: Tables<"memories">[];
  categories: string[];
}) {
  return (
    <Tabs defaultValue="search" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="search">Ask</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="pinned">Pinned ({pinned.length})</TabsTrigger>
        <TabsTrigger value="favorites">Favorites ({favorited.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="search">
        <MemorySearchPanel />
      </TabsContent>

      <TabsContent value="timeline">
        <MemoryTimeline memories={memories} categories={categories} />
      </TabsContent>

      <TabsContent value="pinned">
        <MemoryTimeline memories={pinned} categories={[]} />
      </TabsContent>

      <TabsContent value="favorites">
        <MemoryTimeline memories={favorited} categories={[]} />
      </TabsContent>
    </Tabs>
  );
}
