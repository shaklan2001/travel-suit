import type { FareRules, FlightOption, JsonObject } from "./types";

/**
 * Cancellation, reschedule and baggage terms for each airline's domestic fare families, the way
 * TravelOne returns them next to a fare. Kept in one table so a client's negotiated terms replace
 * these rows without touching the desk. Fees are per passenger, per sector, before taxes.
 */

type Family = "Saver" | "Flexi" | "Corporate";

interface AirlineRules {
  match: RegExp;
  families: Record<Family, Omit<FareRules, "family">>;
}

/** Corporate desk bookings price on the airline's corporate fare unless the search says otherwise. */
const DEFAULT_FAMILY: Family = "Corporate";

const AIRLINES: AirlineRules[] = [
  {
    match: /^6E|INDIGO/,
    families: {
      Saver: { refundable: true, cancellationFee: 3999, rescheduleFee: 2999, checkInKg: 15, cabinKg: 7 },
      Flexi: { refundable: true, cancellationFee: 1999, rescheduleFee: 0, checkInKg: 15, cabinKg: 7 },
      Corporate: { refundable: true, cancellationFee: 1500, rescheduleFee: 0, checkInKg: 20, cabinKg: 7 },
    },
  },
  {
    match: /^IX|AIR INDIA EXPRESS/,
    families: {
      Saver: { refundable: true, cancellationFee: 3500, rescheduleFee: 3000, checkInKg: 15, cabinKg: 7 },
      Flexi: { refundable: true, cancellationFee: 1500, rescheduleFee: 0, checkInKg: 15, cabinKg: 7 },
      Corporate: { refundable: true, cancellationFee: 1500, rescheduleFee: 0, checkInKg: 20, cabinKg: 7 },
    },
  },
  {
    match: /^AI|^UK|AIR INDIA|VISTARA/,
    families: {
      Saver: { refundable: true, cancellationFee: 3000, rescheduleFee: 2250, checkInKg: 15, cabinKg: 7 },
      Flexi: { refundable: true, cancellationFee: 1000, rescheduleFee: 0, checkInKg: 25, cabinKg: 7 },
      Corporate: { refundable: true, cancellationFee: 1000, rescheduleFee: 0, checkInKg: 25, cabinKg: 7 },
    },
  },
  {
    match: /^QP|AKASA/,
    families: {
      Saver: { refundable: true, cancellationFee: 3500, rescheduleFee: 2750, checkInKg: 15, cabinKg: 7 },
      Flexi: { refundable: true, cancellationFee: 1500, rescheduleFee: 0, checkInKg: 15, cabinKg: 7 },
      Corporate: { refundable: true, cancellationFee: 1000, rescheduleFee: 0, checkInKg: 20, cabinKg: 7 },
    },
  },
  {
    match: /^SG|SPICEJET/,
    families: {
      Saver: { refundable: true, cancellationFee: 3500, rescheduleFee: 3000, checkInKg: 15, cabinKg: 7 },
      Flexi: { refundable: true, cancellationFee: 2500, rescheduleFee: 0, checkInKg: 15, cabinKg: 7 },
      Corporate: { refundable: true, cancellationFee: 2500, rescheduleFee: 1500, checkInKg: 15, cabinKg: 7 },
    },
  },
];

/** Any carrier not in the table: the strictest common terms, so the quote never promises more than the airline gives. */
const FALLBACK: Omit<FareRules, "family"> = { refundable: true, cancellationFee: 3500, rescheduleFee: 3000, checkInKg: 15, cabinKg: 7 };

function familyOf(option: Partial<FlightOption> & JsonObject): Family {
  const named = String(option.fareFamily ?? option.fareType ?? "").toLowerCase();
  if (/corp/.test(named)) return "Corporate";
  if (/flex|plus|comfort/.test(named)) return "Flexi";
  if (/saver|value|lite|regular|sale/.test(named)) return "Saver";
  return DEFAULT_FAMILY;
}

export function fareRulesFor(option: Partial<FlightOption> & JsonObject): FareRules {
  const family = familyOf(option);
  const flightCode = String(option.flightNo ?? "").toUpperCase().trim();
  const airlineName = String(option.airline ?? "").toUpperCase();
  const airline = AIRLINES.find((row) => row.match.test(flightCode) || row.match.test(airlineName));
  return { family, ...(airline?.families[family] ?? FALLBACK) };
}

/** Attaches fare rules to every option a search returned, keeping any the search already carried. */
export function withFareRules(options: JsonObject): JsonObject {
  if (!Array.isArray(options.options)) return options;
  return {
    ...options,
    options: (options.options as JsonObject[]).map((option) =>
      option && typeof option === "object" && !option.fareRules ? { ...option, fareRules: fareRulesFor(option) } : option,
    ),
  };
}

const inr = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

export function cancellationText(rules: FareRules): string {
  if (!rules.refundable) return "Non-refundable (taxes back)";
  return rules.cancellationFee === 0 ? "Free cancellation" : `${inr(rules.cancellationFee)} cancellation fee`;
}

export function rescheduleText(rules: FareRules): string {
  return rules.rescheduleFee === 0 ? "Free date change + fare difference" : `${inr(rules.rescheduleFee)} date change + fare difference`;
}

export function baggageText(rules: FareRules): string {
  return `${rules.checkInKg} kg check-in · ${rules.cabinKg} kg cabin`;
}
