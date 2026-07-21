"use client";

import { MapIcon } from "lucide-react";

import { ResilientImage } from "@/components/shared/resilient-image";
import type { LatLng } from "@/lib/activities/distance";

export function ActivitiesOverviewMap({
  center,
  points,
}: {
  center: LatLng;
  points: LatLng[];
}) {
  if (points.length === 0) return null;

  const pointsParam = points.map((p) => `${p.lat},${p.lng}`).join(";");
  const src = `/api/activities/overview-map?lat=${center.lat}&lng=${center.lng}&points=${encodeURIComponent(pointsParam)}`;

  return (
    <ResilientImage
      src={src}
      alt={`Map of ${points.length} nearby activities`}
      className="h-56 w-full"
      fallbackIcon={MapIcon}
    />
  );
}
