export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two points, in kilometers. */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return Math.round(EARTH_RADIUS_KM * c * 100) / 100;
}

const WALK_SPEED_KMH = 4.8;
const DRIVE_SPEED_KMH = 25; // city driving, accounting for stops/traffic

/** Rough travel time estimate in minutes — a heuristic, not a routed ETA. */
export function estimateTravelMinutes(distanceKm: number, mode: "walk" | "drive"): number {
  const speed = mode === "walk" ? WALK_SPEED_KMH : DRIVE_SPEED_KMH;
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}
