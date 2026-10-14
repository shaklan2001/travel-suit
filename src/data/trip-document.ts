import { destinationById, DESTINATIONS, photoUrl, STYLE_LABELS, type Destination } from "./destinations";
import {
  defaultChoices,
  priceQuote,
  QUOTE_VALID_DAYS,
  type FlightOption,
  type HolidayLead,
  type PricedQuote,
  type QuoteChoices,
  type StayOption,
} from "./holiday-desk";
import { briefFromPrompt, buildPlan, MONTHS, type TripBrief } from "./trip-planner";

/**
 * Trip Document Designer: turns one prompt, or a lead with its quote, into a designed travel
 * document. The composer is deterministic; when the Vibrium worker is connected it rewrites the
 * copy (title, intro, day narratives, tips) and the layout stays the same.
 */

export type DocTemplate = "editorial" | "classic" | "minimal";
export type DocKind = "itinerary" | "quote";

export const TEMPLATE_LABELS: Record<DocTemplate, string> = {
  editorial: "Editorial",
  classic: "Classic",
  minimal: "Minimal",
};

export const DOC_KIND_LABELS: Record<DocKind, string> = {
  itinerary: "Itinerary",
  quote: "Itinerary + quote",
};

export interface DocBrand {
  agency: string;
  accent: string;
  phone: string;
  email: string;
}

export const DEFAULT_BRAND: DocBrand = {
  agency: "Wanderlust Holidays",
  accent: "#2c70f6",
  phone: "+91 22 4000 1234",
  email: "holidays@wanderlust.travel",
};

export const ACCENTS = ["#2c70f6", "#0e8f86", "#b8893b", "#c2410c", "#7a4bb8", "#1a333c"];

export interface DocDay {
  day: number;
  title: string;
  text: string;
  photo: string | null;
}

export interface TripDoc {
  ref: string;
  kind: DocKind;
  template: DocTemplate;
  brand: DocBrand;
  destination: Destination;
  title: string;
  subtitle: string;
  travellers: string;
  dates: string;
  hero: string;
  gallery: string[];
  glance: { label: string; value: string }[];
  intro: string;
  days: DocDay[];
  flight: FlightOption | null;
  stay: StayOption | null;
  price: PricedQuote | null;
  estimate: { low: number; high: number; perPersonLow: number; perPersonHigh: number };
  inclusions: string[];
  exclusions: string[];
  tips: string[];
  notes: string[];
  validity: string;
  preparedOn: string;
}

/** Copy the Vibrium worker may return. Every field is optional; anything missing keeps the composed text. */
export interface WorkerCopy {
  title?: string;
  intro?: string;
  days?: { title?: string; text?: string }[];
  tips?: string[];
}

export interface PromptRequest {
  brief: TripBrief;
  names: string | null;
  kind: DocKind;
  template: DocTemplate | null;
}

const TODAY = new Date(2026, 9, 15);
const NUMBER_WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen"];

/** Reads a one-line request such as "6-day Bali honeymoon for Rahul & Priya from Mumbai in November, with a quote". */
export function parsePrompt(prompt: string): PromptRequest {
  const brief = briefFromPrompt(prompt);
  if (!brief.destinationId) {
    const named = DESTINATIONS.find((destination) => prompt.toLowerCase().includes(destination.name.toLowerCase()));
    brief.destinationId = named?.id ?? null;
  }
  const namesMatch = prompt.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s*(?:&|and)\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?)/);
  const lower = prompt.toLowerCase();
  const template = (["editorial", "classic", "minimal"] as DocTemplate[]).find((name) => lower.includes(name)) ?? null;
  if (namesMatch && /&|\band\b/.test(namesMatch[1]) && !brief.travellers) {
    brief.travellers = "couple";
    brief.pax = brief.pax ?? 2;
  }
  return {
    brief,
    names: namesMatch ? namesMatch[1].replace(/\s+and\s+/, " & ") : null,
    kind: /quote|price|pric|cost|budget/.test(lower) ? "quote" : "itinerary",
    template,
  };
}

/** A lead-shaped record for a prompt that is not on the desk yet, so pricing works the same way. */
export function leadFromPrompt(request: PromptRequest, ref: string): HolidayLead {
  const destinationId = request.brief.destinationId ?? "bali";
  return {
    code: ref,
    names: request.names ?? defaultNames(request.brief),
    phone: "",
    channel: "website",
    received: "Now",
    status: "quoting",
    ask: "",
    brief: {
      ...request.brief,
      destinationId,
      pax: request.brief.pax ?? 2,
      days: request.brief.days ?? 6,
      style: request.brief.style ?? "comfort",
      origin: request.brief.origin ?? "Mumbai",
    },
  };
}

function defaultNames(brief: TripBrief): string {
  if (brief.travellers === "family") return "The family";
  if (brief.travellers === "friends") return "The group";
  if (brief.travellers === "solo") return "You";
  return "You both";
}

export function docRef(seedText: string): string {
  let hash = 0;
  for (const character of seedText) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `TD-${4000 + (hash % 5000)}`;
}

function travelYear(month: number): number {
  return month >= TODAY.getMonth() + 1 ? TODAY.getFullYear() : TODAY.getFullYear() + 1;
}

function datesLabel(brief: TripBrief): string {
  if (!brief.month) return `${brief.days ?? 6} days · dates to confirm`;
  const year = travelYear(brief.month);
  const start = new Date(year, brief.month - 1, 14);
  const end = new Date(start);
  end.setDate(start.getDate() + (brief.days ?? 6) - 1);
  const fmt = (date: Date, withYear: boolean) =>
    date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
  return `${fmt(start, false)} – ${fmt(end, true)}`;
}

function splitDay(text: string): { title: string; text: string } {
  const colon = text.indexOf(": ");
  if (colon > 0 && colon < 40) return { title: text.slice(0, colon), text: capitalise(text.slice(colon + 2)) };
  const stop = text.indexOf(". ");
  if (stop > 0 && stop < 48) return { title: text.slice(0, stop), text: capitalise(text.slice(stop + 2)) };
  return { title: text, text: "" };
}

function capitalise(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

const PACE: Record<string, string> = {
  budget: "Smart, well-rated stays and shared transfers keep the budget in check.",
  comfort: "Comfortable stays, private transfers, and an easy pace.",
  luxury: "Five-star stays, private transfers, and time set aside to slow down.",
};

function dayText(destination: Destination, index: number, total: number, raw: string, free: boolean): string {
  if (index === 0) return raw ? `${raw}. Your driver meets you at ${destination.gateway} and the evening is yours.` : `Your driver meets you at ${destination.gateway} and takes you to the hotel.`;
  if (index === total - 1) return "Breakfast, a slow morning, and a private transfer to the airport for your flight home.";
  if (free) return "Rest, shop, or add an excursion your expert can book for you.";
  return raw
    ? `${raw}. Back at the hotel by evening, with dinner left open so you can explore.`
    : "A guided day out with private transfers. Back at the hotel by evening, with dinner left open so you can explore.";
}

function tipsFor(destination: Destination, brief: TripBrief, seasonOk: boolean): string[] {
  const tips: string[] = [];
  if (destination.interests.includes("beaches")) tips.push("Reef-safe sunscreen, a hat, and light cotton clothes.");
  if (destination.interests.includes("mountains")) tips.push("Pack layers: mornings and evenings are cold even in season.");
  if (destination.interests.includes("culture")) tips.push("Cover shoulders and knees for temples and places of worship.");
  if (!seasonOk) tips.push("A light rain jacket and quick-dry shoes for the wet-season showers.");
  if (destination.region === "international") {
    tips.push("Carry a forex card for daily spends; it beats cash and airport exchange rates.");
    tips.push("Passport valid for six months beyond your return date.");
  }
  if (brief.travellers === "family") tips.push("Keep a small day bag with snacks and medicines for the kids.");
  tips.push("Save your expert's number. We're on WhatsApp for anything on the trip.");
  return tips.slice(0, 6);
}

export interface ComposeOptions {
  lead: HolidayLead;
  kind: DocKind;
  template: DocTemplate;
  brand: DocBrand;
  choices?: QuoteChoices;
}

export function composeDocument({ lead, kind, template, brand, choices }: ComposeOptions): TripDoc {
  const brief = lead.brief;
  const plan = buildPlan(brief);
  const destination = destinationById(plan.destinationId) as Destination;
  const days = brief.days ?? plan.days.length;
  const pax = brief.pax ?? 2;
  const quote = kind === "quote" ? priceQuote(lead, choices ?? defaultChoices(lead)) : null;
  const picked = choices ?? defaultChoices(lead);
  const month = brief.month ? MONTHS[brief.month - 1] : null;

  const docDays: DocDay[] = plan.days.map((entry, index) => {
    const free = /^free day/i.test(entry.text);
    const raw = index === plan.days.length - 1 ? { title: "Fly home", text: "" } : free ? { title: "Free day", text: "" } : splitDay(entry.text);
    return {
      day: entry.day,
      title: raw.title,
      text: dayText(destination, index, plan.days.length, raw.text, free),
      photo: index > 0 && index < plan.days.length - 1 && index % 2 === 1 ? photoUrl(destination.photos[(index + 1) % destination.photos.length], 900) : null,
    };
  });

  const daysWord = NUMBER_WORDS[days] ?? String(days);
  const season = plan.seasonOk
    ? month
      ? `${month} is a good time to go.`
      : ""
    : `${plan.seasonNote ?? ""} We've kept the plan flexible, with indoor options for rainy afternoons.`;
  const intro = [
    `${daysWord} days in ${destination.name} for ${lead.names}${brief.origin ? `, flying from ${brief.origin}` : ""}.`,
    `${destination.tagline}.`,
    PACE[brief.style ?? "comfort"],
    season,
  ]
    .filter(Boolean)
    .join(" ");

  const inclusions = quote
    ? [
        ...quote.lines.map((line) => line.label),
        "All taxes on the package, including GST",
        "24×7 support on WhatsApp during the trip",
      ]
    : ["Day-by-day plan with private transfers", `${STYLE_LABELS[brief.style ?? "comfort"]} stays`, "24×7 support on WhatsApp during the trip"];
  const exclusions = [
    "Lunches and dinners unless stated",
    "Personal expenses, tips, and optional activities",
    ...(destination.region === "international" && !(quote && picked.forex) ? ["Foreign exchange"] : []),
    "Anything not listed under inclusions",
  ];
  const notes = [
    ...(quote ? [`Prices are held for ${QUOTE_VALID_DAYS} days and confirmed again at booking.`] : ["This plan is a starting point. Your expert confirms flights, stays, and the final price."]),
    ...(quote && picked.forex && destination.region === "international" ? ["Your forex card is arranged with the booking and delivered before you fly."] : []),
    ...plan.notes.filter((note) => !/forex/i.test(note)),
  ];

  const validUntil = new Date(TODAY);
  validUntil.setDate(validUntil.getDate() + QUOTE_VALID_DAYS);

  return {
    ref: lead.code,
    kind,
    template,
    brand,
    destination,
    title: `${destination.name}${brief.travellers === "couple" ? " for two" : brief.travellers === "family" ? " with family" : ""}`,
    subtitle: destination.tagline,
    travellers: lead.names,
    dates: datesLabel(brief),
    hero: photoUrl(destination.photos[0], 1400),
    gallery: destination.photos.slice(1, 3).map((id) => photoUrl(id, 700)),
    glance: [
      { label: "Travellers", value: `${pax} ${pax === 1 ? "adult" : "adults"}` },
      { label: "Duration", value: `${days} days · ${Math.max(days - 1, 1)} nights` },
      { label: "From", value: brief.origin ?? "Your city" },
      { label: "Stay", value: STYLE_LABELS[brief.style ?? "comfort"] },
      { label: "Best season", value: seasonLabel(destination.bestMonths) },
      { label: quote ? "Package price" : "Estimated budget", value: quote ? inrShort(quote.total) : `${inrShort(plan.totalLow)} – ${inrShort(plan.totalHigh)}` },
    ],
    intro,
    days: docDays,
    flight: quote?.flight ?? null,
    stay: quote?.stay ?? null,
    price: quote,
    estimate: { low: plan.totalLow, high: plan.totalHigh, perPersonLow: plan.perPersonLow, perPersonHigh: plan.perPersonHigh },
    inclusions,
    exclusions,
    tips: tipsFor(destination, brief, plan.seasonOk),
    notes,
    validity: validUntil.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    preparedOn: TODAY.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  };
}

/** Months as ranges, wrapping over the year end: [11, 12, 1, 2, 3] reads "Nov – Mar". */
function seasonLabel(months: number[]): string {
  const set = new Set(months);
  if (set.size === 12) return "All year";
  const starts = [...set].filter((month) => !set.has(month === 1 ? 12 : month - 1)).sort((a, b) => a - b);
  const short = (month: number) => MONTHS[month - 1].slice(0, 3);
  return starts
    .map((start) => {
      let end = start;
      while (set.has(end === 12 ? 1 : end + 1)) end = end === 12 ? 1 : end + 1;
      return end === start ? short(start) : `${short(start)} – ${short(end)}`;
    })
    .join(", ");
}

export function applyWorkerCopy(doc: TripDoc, copy: WorkerCopy | null): TripDoc {
  if (!copy) return doc;
  return {
    ...doc,
    title: copy.title?.trim() || doc.title,
    intro: copy.intro?.trim() || doc.intro,
    days: doc.days.map((day, index) => ({
      ...day,
      title: copy.days?.[index]?.title?.trim() || day.title,
      text: copy.days?.[index]?.text?.trim() || day.text,
    })),
    tips: copy.tips && copy.tips.length > 0 ? copy.tips.slice(0, 6) : doc.tips,
  };
}

export function inrShort(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2).replace(/\.?0+$/, "")} L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
