/**
 * User-facing activity categories mapped to Geoapify's Places category
 * taxonomy. Every value here has been verified against the live Places API —
 * Geoapify rejects an entire multi-category request with a 400 if even one
 * category in the comma-joined list is unrecognized (e.g. "entertainment.nightclub"
 * and "entertainment.casino" don't exist, "adult.nightclub"/"adult.casino" do),
 * so a typo here silently breaks that whole bucket in production.
 *
 * Kept in its own env-free module (no API-key-gated client code) so pure
 * consumers — like the weather-aware ranking logic in rank.ts — can import
 * the taxonomy without pulling in lib/env's eager validation.
 */
export const ACTIVITY_CATEGORIES = {
  restaurants: "catering.restaurant",
  coffee: "catering.cafe",
  desserts: "catering.ice_cream",
  bars: "catering.bar,catering.pub",
  nightlife: "adult.nightclub,adult.casino",
  museums: "entertainment.museum",
  galleries: "entertainment.culture",
  parks: "leisure.park,leisure.picnic,natural.forest",
  lakes_beaches: "natural.water,beach",
  attractions: "tourism.attraction,tourism.sights,tourism.attraction.viewpoint",
  active_sports: "sport,sport.stadium",
  gyms: "sport.fitness",
  pools: "sport.swimming_pool",
  golf: "sport.golf_course",
  shopping: "commercial.shopping_mall,commercial.marketplace,commercial",
  bookstores: "commercial.books",
  libraries: "education.library",
  coworking: "office.coworking",
  cinema: "entertainment.cinema",
  gaming: "entertainment.bowling_alley,entertainment.miniature_golf,entertainment.escape_game",
  zoos_aquariums: "entertainment.zoo,entertainment.aquarium,entertainment.theme_park",
  family: "leisure.playground,entertainment.zoo,entertainment.theme_park",
  learning: "education,entertainment.museum",
  relax: "leisure.spa,catering.cafe",
} as const;

export type ActivityCategory = keyof typeof ACTIVITY_CATEGORIES;

/** Categories whose venues are predominantly outdoors — used to weather-adjust ranking. */
export const OUTDOOR_ACTIVITY_CATEGORIES = new Set<ActivityCategory>([
  "parks",
  "lakes_beaches",
  "attractions",
  "golf",
  "zoos_aquariums",
]);
