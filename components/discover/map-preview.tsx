export function MapPreview({ lat, lng, alt }: { lat: number; lng: number; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- proxied, non-optimizable external map tile
    <img
      src={`/api/activities/static-map?lat=${lat}&lng=${lng}`}
      alt={alt}
      className="h-32 w-full rounded-xl object-cover"
      loading="lazy"
    />
  );
}
