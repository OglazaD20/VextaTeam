import type { ActivityCategory } from "./geoapify-client";

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityCategory, string> = {
  restaurants: "Restaurants",
  coffee: "Coffee",
  desserts: "Desserts",
  bars: "Bars & pubs",
  nightlife: "Nightlife",
  museums: "Museums",
  galleries: "Galleries & culture",
  parks: "Parks & forests",
  lakes_beaches: "Lakes & beaches",
  attractions: "Attractions",
  active_sports: "Sports & fields",
  gyms: "Gyms & fitness",
  pools: "Swimming pools",
  golf: "Golf",
  shopping: "Shopping",
  bookstores: "Bookstores",
  libraries: "Libraries",
  coworking: "Coworking",
  cinema: "Cinema",
  gaming: "Bowling & games",
  zoos_aquariums: "Zoos & aquariums",
  family: "Family & kids",
  learning: "Learning",
  relax: "Relax & spa",
};

/**
 * A simplified front-page category list — the other 17 real categories are
 * still fully supported, just tucked under "More Categories" in the UI so
 * the primary picker isn't overwhelming. Each entry maps to one real
 * ActivityCategory (search behavior is unchanged); PRIMARY_CATEGORY_LABEL
 * gives it a broader display name than its full taxonomy label.
 */
export const PRIMARY_CATEGORIES: ActivityCategory[] = [
  "restaurants",
  "coffee",
  "attractions",
  "parks",
  "active_sports",
  "cinema",
  "shopping",
];

export const PRIMARY_CATEGORY_LABEL: Partial<Record<ActivityCategory, string>> = {
  restaurants: "Restaurants",
  coffee: "Coffee",
  attractions: "Activities",
  parks: "Nature",
  active_sports: "Sports",
  cinema: "Entertainment",
  shopping: "Shopping",
};

export const MORE_CATEGORIES: ActivityCategory[] = (
  Object.keys(ACTIVITY_CATEGORY_LABEL) as ActivityCategory[]
).filter((c) => !PRIMARY_CATEGORIES.includes(c));

export const ACTIVITY_CATEGORY_ICON: Record<ActivityCategory, string> = {
  restaurants: "🍽️",
  coffee: "☕",
  desserts: "🍰",
  bars: "🍸",
  nightlife: "🌃",
  museums: "🏛️",
  galleries: "🎨",
  parks: "🌳",
  lakes_beaches: "🏖️",
  attractions: "🗼",
  active_sports: "🏟️",
  gyms: "💪",
  pools: "🏊",
  golf: "⛳",
  shopping: "🛍️",
  bookstores: "📖",
  libraries: "📚",
  coworking: "💻",
  cinema: "🎬",
  gaming: "🎳",
  zoos_aquariums: "🐠",
  family: "👨‍👩‍👧",
  learning: "🎓",
  relax: "🧘",
};
