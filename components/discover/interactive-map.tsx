"use client";

import dynamic from "next/dynamic";
import { Loader2Icon } from "lucide-react";

export type { MapPoint } from "@/components/discover/interactive-map-inner";

const InteractiveMapInner = dynamic(
  () => import("@/components/discover/interactive-map-inner").then((m) => m.InteractiveMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export { InteractiveMapInner as InteractiveMap };
