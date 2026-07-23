import { z } from "zod";

import { AI_MODEL_FAST, getOpenAIClient } from "@/lib/ai/client";
import { languageInstruction } from "@/lib/ai/language";
import { haversineDistanceKm, type LatLng } from "@/lib/activities/distance";
import { geocodeLocation, searchNearbyPlaces, type PlaceCandidate } from "@/lib/activities/geoapify-client";
import type { Locale } from "@/lib/i18n/locales";

const ITINERARY_CATEGORIES = ["restaurants", "museums", "parks", "cinema", "shopping", "family"] as const;
const SEARCH_RADIUS_KM = 15;
const MAX_CANDIDATES = 60;

export interface TripPlanInput {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  currency: string;
  transportation: string | null;
}

export interface ItineraryItem {
  dayNumber: number;
  startTime: string | null;
  title: string;
  type: "attraction" | "restaurant" | "activity" | "free_time";
  placeName: string | null;
  address: string | null;
  location: LatLng | null;
  estimatedCost: number | null;
  estimatedDurationMinutes: number | null;
  notes: string | null;
}

export interface TripPlanResult {
  destinationLocation: LatLng;
  items: ItineraryItem[];
  packingList: { item: string; category: string }[];
  weatherSummary: string;
  packingNotes: string;
}

const itinerarySchema = z.object({
  days: z.array(
    z.object({
      dayNumber: z.number().int().min(1),
      items: z.array(
        z.object({
          candidateIndex: z.number().int().min(-1),
          startTime: z.string().nullable(),
          title: z.string().max(100),
          type: z.enum(["attraction", "restaurant", "activity", "free_time"]),
          estimatedCost: z.number().min(0),
          estimatedDurationMinutes: z.number().int().min(15).max(600),
          notes: z.string().max(200),
        }),
      ),
    }),
  ),
  packingList: z.array(z.object({ item: z.string().max(60), category: z.string().max(30) })).max(30),
  weatherSummary: z.string().max(300),
  packingNotes: z.string().max(300),
});

function dayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

/**
 * Builds a day-by-day itinerary from real Geoapify place candidates near the
 * destination (never an invented place name/address) — same pattern as
 * lib/activities/discover.ts. The packing list and weather guidance are
 * genuine AI estimates from general destination/season knowledge (there's
 * no real forecast for a trip weeks or months out), same principle already
 * established for AI-estimated nutrition: the app trusts what the AI states
 * rather than trying to fabricate a false "real" number for it.
 */
export async function generateTripPlan(input: TripPlanInput, locale: Locale): Promise<TripPlanResult> {
  const geocoded = await geocodeLocation(input.destination, 1);
  const destination = geocoded[0];
  if (!destination) {
    throw new Error(`Couldn't find "${input.destination}" — try a more specific destination.`);
  }
  const destinationLocation = destination.location;

  const places = await searchNearbyPlaces(
    [...ITINERARY_CATEGORIES],
    destinationLocation,
    SEARCH_RADIUS_KM,
    MAX_CANDIDATES,
  );

  const ranked = places
    .map((place: PlaceCandidate) => ({ place, distanceKm: haversineDistanceKm(destinationLocation, place.location) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_CANDIDATES);

  const numDays = dayCount(input.startDate, input.endDate);

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: AI_MODEL_FAST,
    messages: [
      {
        role: "system",
        content: [
          "You are an AI travel planner. Build a realistic day-by-day itinerary using ONLY the real place",
          "candidates provided — never invent a place name or address. Reference each attraction/restaurant",
          "pick by its candidateIndex from the list. For meals and free time between activities that don't",
          "need a specific real place, use candidateIndex -1. Spread picks sensibly across the day (morning",
          "activity, lunch, afternoon activity, dinner) and don't schedule unrealistic back-to-back items —",
          "leave travel time between distant picks. Vary picks across days rather than repeating the same",
          "few. Give a realistic estimatedCost in the trip's currency for each item (0 for free", "attractions/parks). Then write a packing list (15-25 items, grouped by category like clothing,",
          "documents, electronics, toiletries) appropriate for this destination, season, and trip length —",
          "use your general knowledge of the destination's typical climate for the travel dates, and a short",
          "weatherSummary sentence explaining that reasoning, plus one packingNotes sentence with the single",
          "most important packing consideration for this trip. Never state a specific temperature or forecast",
          "as if it were a real measurement — describe the general expected conditions instead (e.g. \"typically",
          "warm and dry in July\").",
          languageInstruction(locale),
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          destination: destination.formatted,
          numDays,
          budget: input.budget,
          currency: input.currency,
          transportation: input.transportation,
          candidates: ranked.map((c, index) => ({
            index,
            name: c.place.name,
            category: c.place.category,
            distanceKm: c.distanceKm,
          })),
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "trip_itinerary",
        strict: true,
        schema: {
          type: "object",
          properties: {
            days: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  dayNumber: { type: "integer", minimum: 1 },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        candidateIndex: { type: "integer", minimum: -1 },
                        startTime: { type: ["string", "null"] },
                        title: { type: "string" },
                        type: { type: "string", enum: ["attraction", "restaurant", "activity", "free_time"] },
                        estimatedCost: { type: "number", minimum: 0 },
                        estimatedDurationMinutes: { type: "integer", minimum: 15, maximum: 600 },
                        notes: { type: "string" },
                      },
                      required: [
                        "candidateIndex",
                        "startTime",
                        "title",
                        "type",
                        "estimatedCost",
                        "estimatedDurationMinutes",
                        "notes",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["dayNumber", "items"],
                additionalProperties: false,
              },
            },
            packingList: {
              type: "array",
              items: {
                type: "object",
                properties: { item: { type: "string" }, category: { type: "string" } },
                required: ["item", "category"],
                additionalProperties: false,
              },
            },
            weatherSummary: { type: "string" },
            packingNotes: { type: "string" },
          },
          required: ["days", "packingList", "weatherSummary", "packingNotes"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The AI travel planner returned an empty response");
  }

  const parsed = itinerarySchema.parse(JSON.parse(content));

  const items: ItineraryItem[] = parsed.days.flatMap((day) =>
    day.items.map((item) => {
      const candidate = item.candidateIndex >= 0 ? ranked[item.candidateIndex] : null;
      return {
        dayNumber: Math.min(day.dayNumber, numDays),
        startTime: item.startTime,
        title: item.title,
        type: item.type,
        placeName: candidate?.place.name ?? null,
        address: candidate?.place.address ?? null,
        location: candidate?.place.location ?? null,
        estimatedCost: item.estimatedCost,
        estimatedDurationMinutes: item.estimatedDurationMinutes,
        notes: item.notes || null,
      };
    }),
  );

  return {
    destinationLocation,
    items,
    packingList: parsed.packingList,
    weatherSummary: parsed.weatherSummary,
    packingNotes: parsed.packingNotes,
  };
}
