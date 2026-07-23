import { geoapifyProvider } from "./geoapify-provider";
import { googlePlacesProvider } from "./google-places-provider";
import { tripAdvisorProvider } from "./tripadvisor-provider";
import type { NormalizedPlace, PlaceProvider, PlaceSearchParams } from "./types";

const PROVIDERS: PlaceProvider[] = [geoapifyProvider, googlePlacesProvider, tripAdvisorProvider];

/**
 * Runs every configured provider in parallel and returns one result array
 * per provider (not yet merged) — unconfigured providers and any that error
 * out contribute an empty array rather than failing the whole search, since
 * Geoapify alone is always enough for Discover to work.
 */
export async function searchAllProviders(params: PlaceSearchParams): Promise<NormalizedPlace[][]> {
  return Promise.all(
    PROVIDERS.map((provider) =>
      provider.isConfigured() ? provider.search(params).catch(() => []) : Promise.resolve([]),
    ),
  );
}
