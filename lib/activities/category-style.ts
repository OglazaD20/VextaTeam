import type { ActivityCategory } from "./geoapify-client";

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityCategory, string> = {
  food_drink: "Food & drink",
  outdoors: "Outdoors",
  culture: "Culture",
  active: "Active",
  relax: "Relax",
  social: "Social",
};

export const ACTIVITY_CATEGORY_ICON: Record<ActivityCategory, string> = {
  food_drink: "🍽️",
  outdoors: "🌳",
  culture: "🎭",
  active: "🏃",
  relax: "🧘",
  social: "🎉",
};
