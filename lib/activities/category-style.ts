import type { ActivityCategory } from "./geoapify-client";

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityCategory, string> = {
  food_drink: "Food & drink",
  outdoors: "Nature",
  culture: "Culture",
  active: "Sports",
  relax: "Relax & health",
  social: "Social",
  entertainment: "Entertainment",
  nightlife: "Nightlife",
  shopping: "Shopping",
  adventure: "Adventure",
  gaming: "Gaming",
  learning: "Learning",
  family: "Family",
};

export const ACTIVITY_CATEGORY_ICON: Record<ActivityCategory, string> = {
  food_drink: "🍽️",
  outdoors: "🌳",
  culture: "🎭",
  active: "🏃",
  relax: "🧘",
  social: "🎉",
  entertainment: "🎬",
  nightlife: "🌃",
  shopping: "🛍️",
  adventure: "🧗",
  gaming: "🎮",
  learning: "📚",
  family: "👨‍👩‍👧",
};
