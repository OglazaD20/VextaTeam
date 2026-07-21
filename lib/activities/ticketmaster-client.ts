import { env } from "@/lib/env";
import type { LatLng } from "./distance";

export interface EventCandidate {
  id: string;
  name: string;
  url: string;
  imageUrl: string | null;
  venueName: string;
  address: string | null;
  location: LatLng;
  startIso: string | null;
  classification: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
}

interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  images?: { url: string; width: number }[];
  dates?: { start?: { dateTime?: string } };
  classifications?: { segment?: { name?: string } }[];
  priceRanges?: { min?: number; max?: number; currency?: string }[];
  _embedded?: {
    venues?: {
      name?: string;
      address?: { line1?: string };
      city?: { name?: string };
      location?: { latitude?: string; longitude?: string };
    }[];
  };
}

function bestImage(images: TicketmasterEvent["images"]): string | null {
  if (!images || images.length === 0) return null;
  return images.reduce((best, img) => (img.width > best.width ? img : best), images[0]).url;
}

export async function searchNearbyEvents(
  location: LatLng,
  radiusKm: number,
  limit = 12,
): Promise<EventCandidate[]> {
  if (!env.TICKETMASTER_API_KEY) {
    throw new Error("TICKETMASTER_API_KEY is not set. Live events are unavailable until it's configured.");
  }

  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", env.TICKETMASTER_API_KEY);
  url.searchParams.set("latlong", `${location.lat},${location.lng}`);
  url.searchParams.set("radius", String(Math.max(1, Math.round(radiusKm))));
  url.searchParams.set("unit", "km");
  url.searchParams.set("size", String(limit));
  url.searchParams.set("sort", "date,asc");

  const response = await fetch(url.toString());
  if (!response.ok) {
    if (response.status === 404) {
      // Ticketmaster returns 404 for "no events found" rather than an empty list.
      return [];
    }
    throw new Error(`Ticketmaster event search failed with status ${response.status}`);
  }

  const data: { _embedded?: { events?: TicketmasterEvent[] } } = await response.json();
  const events = data._embedded?.events ?? [];

  return events
    .map((event): EventCandidate | null => {
      const venue = event._embedded?.venues?.[0];
      const lat = venue?.location?.latitude ? Number(venue.location.latitude) : null;
      const lng = venue?.location?.longitude ? Number(venue.location.longitude) : null;
      if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return null;

      const price = event.priceRanges?.[0];

      return {
        id: event.id,
        name: event.name,
        url: event.url,
        imageUrl: bestImage(event.images),
        venueName: venue?.name ?? "Venue TBA",
        address: [venue?.address?.line1, venue?.city?.name].filter(Boolean).join(", ") || null,
        location: { lat, lng },
        startIso: event.dates?.start?.dateTime ?? null,
        classification: event.classifications?.[0]?.segment?.name ?? null,
        priceMin: price?.min ?? null,
        priceMax: price?.max ?? null,
        currency: price?.currency ?? null,
      };
    })
    .filter((e): e is EventCandidate => e !== null);
}
