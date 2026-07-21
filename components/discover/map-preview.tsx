import { MapIcon } from "lucide-react";

import { ResilientImage } from "@/components/shared/resilient-image";

export function MapPreview({ lat, lng, alt }: { lat: number; lng: number; alt: string }) {
  return (
    <ResilientImage
      src={`/api/activities/static-map?lat=${lat}&lng=${lng}`}
      alt={alt}
      className="h-32 w-full"
      fallbackIcon={MapIcon}
    />
  );
}
