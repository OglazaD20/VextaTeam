import { OUTDOOR_ACTIVITY_CATEGORIES, type ActivityCategory } from "./category-taxonomy";

/** True for a category whose venues are predominantly outdoors and weather is currently unfavorable for them. */
export function isWeatherUnfavorableFor(category: ActivityCategory, badOutdoorWeather: boolean): boolean {
  return badOutdoorWeather && OUTDOOR_ACTIVITY_CATEGORIES.has(category);
}
