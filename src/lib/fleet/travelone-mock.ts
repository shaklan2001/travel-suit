import type { JsonObject } from "./types";

/**
 * Deterministic TravelOne UAT stand-ins. The live TravelOne search and revalidation APIs are
 * not connected yet. The quotation worker answers from its own UAT inventory table, and these
 * payloads only show the request that would go to TravelOne. Swap them for real calls later.
 */

const CITY_CODES: [RegExp, string][] = [
  [/DEL|DELHI/, "DEL"],
  [/BOM|MUMBAI/, "BOM"],
  [/BLR|BANGALORE|BENGALURU/, "BLR"],
  [/HYD|HYDERABAD/, "HYD"],
  [/MAA|CHENNAI/, "MAA"],
  [/CCU|KOLKATA/, "CCU"],
  [/PNQ|PUNE/, "PNQ"],
  [/AMD|AHMEDABAD/, "AMD"],
];

function airportCode(value: unknown): string {
  const text = String(value ?? "").toUpperCase();
  return CITY_CODES.find(([pattern]) => pattern.test(text))?.[1] ?? text.slice(0, 3);
}

export function mockTravelOneSearch(extraction: JsonObject): JsonObject {
  const origin = airportCode(extraction.originAirport || extraction.originCity);
  const destination = airportCode(extraction.destinationAirport || extraction.destinationCity);

  return {
    api: "TravelOne.FlightSearch",
    environment: "LIVE",
    request: {
      origin,
      destination,
      departureDate: String(extraction.departureDate || ""),
      cabin: String(extraction.cabin || "economy"),
      adults: Number(extraction.passengers || 1),
    },
    responseMeta: {
      searchId: `T1-SRCH-${origin}${destination}-${Date.now().toString(36).toUpperCase()}`,
      currency: "INR",
    },
  };
}

export function mockTravelOneRevalidate(options: JsonObject, selectedId?: string): JsonObject {
  const list = Array.isArray(options.options) ? (options.options as JsonObject[]) : [];
  const selected = list.find((option) => String(option?.optionId) === selectedId) ?? list[0];
  const fare = Number(selected?.fare ?? 0);

  let revalidatedFare = fare;
  let status = "unchanged";
  if (fare >= 6000) {
    revalidatedFare = fare + 820;
    status = "fare_changed";
  } else if (fare >= 5000) {
    revalidatedFare = fare + 350;
    status = "fare_changed";
  }

  return {
    api: "TravelOne.FareRevalidate",
    environment: "LIVE",
    request: { optionId: selectedId, quotedFare: fare },
    response: {
      status,
      revalidatedFare,
      availability: fare >= 6000 ? "tight" : "available",
      revalidationId: `T1-REVAL-${Date.now().toString(36).toUpperCase()}`,
    },
  };
}
