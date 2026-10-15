import type { FleetRun } from "../lib/fleet/types";
import {
  INTENT_LABELS,
  MAX_PASTED_EMAIL_CHARACTERS,
  previewDeskEmail,
  type DeskPreview,
  type FleetStepResult,
  type TravelIntent,
} from "./corporate-desk";

/**
 * Every mail that lands in the connected inbox goes through this, with no button.
 * The fleet decides the path. The outcome says whether a person still has to act.
 */

export interface InboxMail {
  id: string;
  threadKey: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  receivedAt: string;
  body: string;
  /** Gmail web link for the source mail. Absent on the demo mailbox. */
  sourceUrl?: string;
  /** Scripted bullets for a demo thread. Real mail uses the generic path bullets. */
  scriptedBullets?: string[];
}

export type MailOutcome = "needs_you" | "awaiting_approval" | "draft_ready" | "waiting" | "handled" | "not_travel";

export const OUTCOME_ORDER: MailOutcome[] = ["needs_you", "awaiting_approval", "draft_ready", "waiting", "handled", "not_travel"];

export const OUTCOME_LABELS: Record<MailOutcome, string> = {
  needs_you: "Needs you",
  awaiting_approval: "Awaiting manager",
  draft_ready: "Draft ready",
  waiting: "Waiting on TravelOne",
  handled: "Handled",
  not_travel: "Not travel",
};

export interface TripFacts {
  route: string | null;
  date: string | null;
  cabin: string | null;
  timing: string | null;
  passengers: string | null;
  costCentre: string | null;
}

/**
 * What the reporting manager is asked to approve. Nothing is released to TravelOne until they approve this exact fare.
 * The manager is a role on the client profile. No address is invented here.
 */
export interface ApprovalRequest {
  traveller: string;
  route: string;
  date: string;
  flight: string;
  fare: number | null;
  costCentre: string | null;
  reason: string;
}

/** What the real Vibrium worker fleet returned for a mail. Absent when the scripted triage decided. */
export interface LiveFleet {
  run: FleetRun;
  steps: FleetStepResult[];
  replySubject: string | null;
}

export interface MailDecision {
  outcome: MailOutcome;
  caseCode: string | null;
  intentLabel: string;
  summary: string;
  automated: string[];
  humanAction: string | null;
  nextAutomatic: string | null;
  draftReply: string | null;
  trip: TripFacts | null;
  preview: DeskPreview | null;
  live?: LiveFleet | null;
  /** Set when the manager has to approve before the payload is released. */
  approval?: ApprovalRequest | null;
}

/**
 * First gate, before any agent runs. A mail needs a concrete air-travel signal. Words like "book", "trip" or
 * "travel" alone are not enough, because personal mail uses them too. The classifier makes the final call.
 */
const TRAVEL_SIGNALS =
  /\b(flights?|airlines?|airfares?|pnr|e-?tickets?|itinerary|one[- ]way|round[- ]trip|pax|economy class|business class|travel desk|corporate travel|ticketing|indigo|air india|vistara|akasa|spicejet)\b/i;

/** Bulk and promotional mail is never a desk request, even when it mentions flights. */
const BULK_SIGNALS =
  /\b(unsubscribe|view in browser|newsletter|limited[- ]time offer|\d{1,3}% off|flash sale|lottery|you(?:'ve| have) won|claim your (?:prize|reward)|click here to (?:claim|win))\b/i;

const ROUTE_CODES = /\b([A-Z]{3})\s*(?:-|–|—|→|to)\s*([A-Z]{3})\b/;
const ROUTE_WORDS = /\bfrom\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)(?:\s*\([A-Z]{3}\))?\s+to\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/;
const ROUTE_FIELDS = /^from:\s*([A-Za-z ]+?)(?:\s*\([A-Z]{3}\))?\s*$[\s\S]*?^to:\s*([A-Za-z ]+?)(?:\s*\([A-Z]{3}\))?\s*$/im;
const DATE_TEXT =
  /\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+20\d{2})?\b/gi;
const CABIN_TEXT = /\b(premium economy|economy|business|first class)\b/i;
const TIMING_TEXT = /\b((?:around\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)|early morning|morning|afternoon|evening|night|red[- ]eye)\b/i;
const PASSENGER_TEXT = /\b(\d{1,2})\s*(?:pax|passengers?|travell?ers?)\b|\b(?:passengers?|pax)\s*:\s*(\d{1,2})\b/i;
const COST_CENTRE_TEXT = /\b(CC-\d{3,6})\b/i;

const DESK_SIGNATURE = "Corporate Travel Desk";

/** Fixed case codes for the demo book threads, so the queue matches the Command Center. */
const KNOWN_CASE_CODES: Record<string, string> = {
  "demo-ananya-del-bom": "CT-BT-1042",
  "demo-vikram-blr-hyd": "CT-BT-1048",
  "demo-fyi-ananya": "CT-BT-1051",
};

export function triageMail(mail: InboxMail): MailDecision {
  const caseCode = caseCodeFor(mail.threadKey);
  const latestBody = stripQuotedReply(mail.body);
  const threadText = composeThreadText(mail, latestBody).slice(0, MAX_PASTED_EMAIL_CHARACTERS);

  if (!looksLikeTravelMail(mail.subject, latestBody)) {
    return {
      outcome: "not_travel",
      caseCode: null,
      intentLabel: "Not a travel request",
      summary: "Intent Router read the mail and found no corporate travel ask, so the desk left it alone. No reply, no agent woke up and no case was opened.",
      automated: ["Read by Intent Router", "No case opened"],
      humanAction: null,
      nextAutomatic: null,
      draftReply: null,
      trip: null,
      preview: null,
    };
  }

  const preview = previewDeskEmail(threadText, mail.scriptedBullets);
  if ("message" in preview) {
    return {
      outcome: "needs_you",
      caseCode,
      intentLabel: "Could not read",
      summary: "The mail was too short or too long for the fleet to read safely, so nothing ran.",
      automated: ["Read by Intent Router"],
      humanAction: "Read the mail yourself and decide the path.",
      nextAutomatic: null,
      draftReply: null,
      trip: null,
      preview: null,
    };
  }

  const extracted = extractTrip(latestBody);
  const trip = Object.values(extracted).some((value) => value !== null) ? extracted : null;
  return {
    caseCode,
    intentLabel: INTENT_LABELS[preview.intent],
    summary: preview.pathSummary,
    trip,
    preview,
    ...decisionFor(preview.intent, caseCode, mail, trip),
  };
}

function decisionFor(
  intent: TravelIntent,
  caseCode: string,
  mail: InboxMail,
  trip: TripFacts | null,
): Pick<MailDecision, "outcome" | "automated" | "humanAction" | "nextAutomatic" | "draftReply"> {
  const linked = `Linked to case ${caseCode}`;
  const greeting = `Hi ${senderFirstName(mail.from)},`;

  switch (intent) {
    case "new_request":
      return {
        outcome: "waiting",
        automated: ["Classified as a new request", "Trip read from the mail", linked, "Client policy applied"],
        humanAction: null,
        nextAutomatic:
          "Meera runs the TravelOne search and Anika drafts the quotation straight away. Nothing is ticketed.",
        draftReply: null,
      };
    case "modification":
      return {
        outcome: "waiting",
        automated: ["Classified as a change", "New preference read from the mail", linked, "Earlier option kept unbooked"],
        humanAction: null,
        nextAutomatic: "Meera searches again and Anika drafts a revised quotation straight away.",
        draftReply: null,
      };
    case "confirmation":
      return {
        outcome: "needs_you",
        automated: ["Classified as a confirmation", "Selected option read from the thread", linked],
        humanAction:
          "Ticket the selected option on TravelOne yourself. Fare revalidation and the booking API are later phases, so the fleet stops here.",
        nextAutomatic: null,
        draftReply: null,
      };
    case "clarification":
      return {
        outcome: "draft_ready",
        automated: ["Classified as incomplete", "Search held back on purpose", linked, "Question drafted by Anika"],
        humanAction: "Send the drafted question. The mailbox is connected read-only, so the fleet cannot send it.",
        nextAutomatic: "When the reply with the missing details lands, the fleet picks it up on the same case.",
        draftReply: [
          greeting,
          "",
          `Thanks for the request${trip?.route ? ` for ${trip.route}` : ""}. Before we search, please share ${missingFieldsText(trip)}.`,
          "",
          "Regards,",
          DESK_SIGNATURE,
        ].join("\n"),
      };
    case "cancellation":
      return {
        outcome: "draft_ready",
        automated: ["Classified as a cancellation", "Booking work stopped on the case", linked, "Acknowledgement drafted by Anika"],
        humanAction: "Send the drafted acknowledgement. The mailbox is connected read-only, so the fleet cannot send it.",
        nextAutomatic: null,
        draftReply: [
          greeting,
          "",
          "Noted. We have stopped work on this request and nothing has been booked.",
          "",
          "Regards,",
          DESK_SIGNATURE,
        ].join("\n"),
      };
    case "fyi_internal":
      return {
        outcome: "handled",
        automated: ["Classified as internal FYI", linked, "No reply and no search, on purpose"],
        humanAction: null,
        nextAutomatic: null,
        draftReply: null,
      };
  }
}

function missingFieldsText(trip: TripFacts | null): string {
  const missing = [
    trip?.date ? null : "the travel date",
    trip?.route ? null : "the route",
    trip?.timing ? null : "a preferred departure time",
  ].filter((item): item is string => item !== null);
  if (missing.length === 0) {
    return "any missing trip details";
  }
  if (missing.length === 1) {
    return missing[0];
  }
  return `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
}

export function looksLikeTravelMail(subject: string, body: string): boolean {
  if (BULK_SIGNALS.test(subject) || BULK_SIGNALS.test(body)) {
    return false;
  }
  return TRAVEL_SIGNALS.test(subject) || TRAVEL_SIGNALS.test(body) || ROUTE_CODES.test(body);
}

export function extractTrip(body: string): TripFacts {
  const codes = body.match(ROUTE_CODES);
  const words = body.match(ROUTE_WORDS) ?? body.match(ROUTE_FIELDS);
  const route = codes ? `${codes[1]} → ${codes[2]}` : words ? `${words[1].trim()} → ${words[2].trim()}` : null;
  const dates = body.match(DATE_TEXT);
  const passengers = body.match(PASSENGER_TEXT);
  return {
    route,
    date: dates ? Array.from(new Set(dates)).join(", ") : null,
    cabin: body.match(CABIN_TEXT)?.[1] ?? null,
    timing: body.match(TIMING_TEXT)?.[1] ?? null,
    passengers: passengers ? (passengers[1] ?? passengers[2]) : null,
    costCentre: body.match(COST_CENTRE_TEXT)?.[1]?.toUpperCase() ?? null,
  };
}

/** Trip chips from what the extraction worker returned, instead of from regexes over the body. */
export function extractTripFromFleet(extraction: Record<string, unknown>): TripFacts | null {
  const pick = (value: unknown): string | null => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);
  const place = (airport: unknown, city: unknown) => pick(airport) ?? pick(city);
  const origin = place(extraction.originAirport, extraction.originCity);
  const destination = place(extraction.destinationAirport, extraction.destinationCity);
  const passengers = Number(extraction.passengers);

  const trip: TripFacts = {
    route: origin && destination ? `${origin} → ${destination}` : null,
    date: pick(extraction.departureDate),
    cabin: pick(extraction.cabin),
    timing: pick(extraction.preferredTimeWindow),
    passengers: Number.isFinite(passengers) && passengers > 0 ? String(passengers) : null,
    costCentre: pick(extraction.costCentre),
  };
  return Object.values(trip).some((value) => value !== null) ? trip : null;
}

/** Classify on the newest message only. Quoted history must not flip the intent. */
export function stripQuotedReply(body: string): string {
  const kept: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (/^On .+wrote:\s*$/.test(line.trim()) || /^-{2,}\s*Original Message/i.test(line.trim())) {
      break;
    }
    if (line.trimStart().startsWith(">")) {
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n").trim();
}

export function composeThreadText(mail: InboxMail, latestBody: string): string {
  const headers = [`From: ${mail.from}`, `To: ${mail.to}`];
  if (mail.cc) {
    headers.push(`Cc: ${mail.cc}`);
  }
  headers.push(`Subject: ${mail.subject}`);
  return `${headers.join("\n")}\n\n${latestBody}`;
}

export function caseCodeFor(threadKey: string): string {
  const known = KNOWN_CASE_CODES[threadKey];
  if (known) {
    return known;
  }
  let hash = 0;
  for (const character of threadKey) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `CT-BT-${2000 + (hash % 8000)}`;
}

export function senderName(from: string): string {
  const display = from.match(/^\s*"?([^"<]+?)"?\s*</)?.[1]?.trim();
  if (display) {
    return display;
  }
  const local = from.match(/([^\s<@]+)@/)?.[1] ?? from;
  const parts = local.split(/[._-]+/).filter(Boolean);
  // Role prefixes such as "ea" in ea.rahul@ are not part of the name.
  const named = parts.filter((part) => part.length > 2);
  return (named.length > 0 ? named : parts)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function senderFirstName(from: string): string {
  return senderName(from).split(" ")[0] || "there";
}
