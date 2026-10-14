import {
  DESTINATIONS,
  destinationById,
  INTEREST_LABELS,
  INTERNATIONAL_EXTRAS,
  matchDestination,
  STYLE_LABELS,
  STYLE_MULTIPLIER,
  type Destination,
  type Interest,
  type TravelStyle,
} from "./destinations";

/**
 * Trip Planner: the traveller chats, the planner suggests places with photos, builds a
 * day-by-day plan and an indicative budget, then hands the lead to a holiday expert who
 * confirms hotels, flights, and the final price. Deterministic slot-filling, not an LLM.
 */

export type TravellerType = "couple" | "family" | "friends" | "solo";
export type TripScope = "india" | "international" | "either";
export type PlannerStep =
  | "start"
  | "travellers"
  | "origin"
  | "month"
  | "days"
  | "style"
  | "scope"
  | "interest"
  | "pick"
  | "plan"
  | "lead"
  | "done";

export interface TripBrief {
  travellers: TravellerType | null;
  pax: number | null;
  origin: string | null;
  month: number | null;
  days: number | null;
  style: TravelStyle | null;
  scope: TripScope | null;
  interest: Interest | null;
  destinationId: string | null;
}

export interface BudgetLine {
  label: string;
  low: number;
  high: number;
}

export interface TripPlan {
  destinationId: string;
  /** The brief this plan was built from. */
  brief: TripBrief;
  days: { day: number; text: string }[];
  budget: BudgetLine[];
  totalLow: number;
  totalHigh: number;
  perPersonLow: number;
  perPersonHigh: number;
  seasonOk: boolean;
  seasonNote: string | null;
  notes: string[];
}

export interface TripMessage {
  id: number;
  from: "bot" | "traveller";
  text: string;
  suggestions?: string[];
  plan?: TripPlan;
}

export interface TripState {
  step: PlannerStep;
  brief: TripBrief;
  messages: TripMessage[];
  chips: string[];
  shown: string[];
  plan: TripPlan | null;
  leadCode: string | null;
  addOns: { forex: boolean; insurance: boolean; visa: boolean };
  nextId: number;
}

export const ORIGINS = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Ahmedabad", "Pune"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const GOLDEN_LEAD = "HL-2611";

/** Callback promise once a lead is created. Demo config. */
export const CALLBACK_MINUTES = 10;

const TRAVELLER_LABELS: Record<TravellerType, string> = {
  couple: "Couple",
  family: "Family with kids",
  friends: "Friends",
  solo: "Solo",
};
const DEFAULT_PAX: Record<TravellerType, number> = { couple: 2, family: 4, friends: 4, solo: 1 };
const DAY_CHIPS: [string, number][] = [
  ["4–5 days", 5],
  ["6–7 days", 7],
  ["8–10 days", 9],
  ["12 days or more", 12],
];
const INTEREST_KEYWORDS: [Interest, RegExp][] = [
  ["beaches", /\b(beach|beaches|sea|island|islands|snorkel\w*|div(e|ing)|coast)\b/],
  ["mountains", /\b(mountains?|snow|hills?|trek\w*|alps|himalaya\w*)\b/],
  ["culture", /\b(culture|heritage|forts?|palaces?|temples?|history|museums?)\b/],
  ["nature", /\b(nature|wildlife|green|lakes?|backwaters?|forests?|safari)\b/],
  ["city", /\b(city|cities|shopping|nightlife|theme parks?)\b/],
];

const EMPTY_BRIEF: TripBrief = {
  travellers: null,
  pax: null,
  origin: null,
  month: null,
  days: null,
  style: null,
  scope: null,
  interest: null,
  destinationId: null,
};

const START_CHIPS = ["Suggest a holiday for me", "Honeymoon ideas", "Family holiday in India", "Bali for 6 days"];
const PLAN_CHIPS = ["Get an exact quote", "Change dates", "Change the budget", "Show other places", "Start over"];

export function initialTripState(): TripState {
  return {
    step: "start",
    brief: { ...EMPTY_BRIEF },
    messages: [
      { id: 1, from: "bot", text: "Hi! I'm your trip planner. I can suggest places, build a day-by-day plan, and give you an idea of the budget." },
      { id: 2, from: "bot", text: "Tell me about the trip you have in mind, or pick one below." },
    ],
    chips: START_CHIPS,
    shown: [],
    plan: null,
    leadCode: null,
    addOns: { forex: false, insurance: false, visa: false },
    nextId: 3,
  };
}

export function respondTrip(state: TripState, input: string): TripState {
  const text = input.trim();
  if (!text) {
    return state;
  }
  const next: TripState = { ...state, messages: [...state.messages], brief: { ...state.brief }, addOns: { ...state.addOns } };
  const say = (message: string, extra: Partial<TripMessage> = {}) => {
    next.messages.push({ id: next.nextId, from: "bot", text: message, ...extra });
    next.nextId += 1;
  };
  next.messages.push({ id: next.nextId, from: "traveller", text });
  next.nextId += 1;
  const lower = text.toLowerCase();

  if (/^(start over|plan another trip)$/i.test(text)) {
    const fresh = initialTripState();
    Object.assign(next, { step: "start", brief: fresh.brief, chips: fresh.chips, shown: [], plan: null, leadCode: null, addOns: fresh.addOns });
    say("Sure, a fresh plan. Where are you thinking of going?");
    return next;
  }

  switch (next.step) {
    case "start":
    case "travellers":
    case "origin":
    case "month":
    case "days":
    case "style":
    case "scope":
    case "interest": {
      const before = JSON.stringify(next.brief);
      absorb(next.brief, text, next.step);
      if (before === JSON.stringify(next.brief) && next.step !== "start") {
        say(offTopicReply(lower));
        return ask(next, say);
      }
      if (next.step === "start" && /suggest|ideas|not sure|anywhere/.test(lower) && !next.brief.destinationId) {
        say("Happy to. A few quick questions so the ideas fit you.");
      } else if (next.step === "start" && next.brief.destinationId) {
        say(`${destinationById(next.brief.destinationId)?.name} is a lovely pick. A few quick questions to shape the plan.`);
      }
      return ask(next, say);
    }
    case "pick": {
      const picked = matchDestination(text) ?? DESTINATIONS.find((destination) => lower.includes(destination.name.toLowerCase())) ?? null;
      if (/other|more|different/.test(lower) && !picked) {
        return suggest(next, say, true);
      }
      if (!picked) {
        say("Pick one of the places above, or ask me to show other places.");
        return next;
      }
      next.brief.destinationId = picked.id;
      return ask(next, say);
    }
    case "plan":
      return handlePlanAction(next, lower, say);
    case "lead":
      if (/forex/.test(lower)) next.addOns.forex = true;
      if (/insurance/.test(lower)) next.addOns.insurance = true;
      if (/visa/.test(lower)) next.addOns.visa = true;
      if (/no thanks|nothing|that's all|done/.test(lower)) {
        next.step = "done";
        next.chips = ["Plan another trip"];
        say("Perfect. Your holiday expert has everything. Speak soon!");
        return next;
      }
      say("Added. Your holiday expert will cover that on the call too.");
      next.chips = addOnChips(next);
      if (next.chips.length === 1) {
        next.step = "done";
        next.chips = ["Plan another trip"];
      }
      return next;
    case "done":
      say("I'm here whenever you want to plan another trip.");
      next.chips = ["Plan another trip"];
      return next;
  }
}

function handlePlanAction(next: TripState, lower: string, say: (text: string, extra?: Partial<TripMessage>) => void): TripState {
  if (/quote|book|expert|call me|go ahead|yes|confirm/.test(lower)) {
    next.leadCode = leadCode(next.brief);
    next.step = "lead";
    const destination = destinationById(next.brief.destinationId ?? "");
    say(
      `Done. Your trip is saved as ${next.leadCode}. A holiday expert will call you within ${CALLBACK_MINUTES} minutes to confirm hotels, flights, and the final price.`,
    );
    if (destination?.region === "international") {
      next.addOns.visa = true;
      say("For an international trip, our visa desk will check what your passport needs. Want help with forex and travel insurance too?");
      next.chips = addOnChips(next);
    } else {
      say("Want us to add travel insurance?");
      next.chips = addOnChips(next);
    }
    return next;
  }
  if (/date|month|when|days|longer|shorter/.test(lower)) {
    next.brief.month = null;
    next.brief.days = null;
    next.plan = null;
    return ask(next, say);
  }
  if (/budget|cheaper|luxury|style|comfort/.test(lower)) {
    next.brief.style = /luxury/.test(lower) ? "luxury" : /cheaper|budget/.test(lower) && !/change the budget/.test(lower) ? "budget" : null;
    next.plan = null;
    return ask(next, say);
  }
  if (/other|different|more places/.test(lower)) {
    next.brief.destinationId = null;
    next.plan = null;
    return suggest(next, say, true);
  }
  say("Tell me what to change, or ask for an exact quote.");
  next.chips = PLAN_CHIPS;
  return next;
}

function ask(next: TripState, say: (text: string, extra?: Partial<TripMessage>) => void): TripState {
  const { brief } = next;
  const question = (step: PlannerStep, text: string, chips: string[]) => {
    next.step = step;
    next.chips = chips;
    say(text);
    return next;
  };

  if (!brief.travellers) return question("travellers", "Who's travelling?", Object.values(TRAVELLER_LABELS));
  if (!brief.origin) return question("origin", "Which city will you fly from?", ORIGINS);
  if (!brief.month) return question("month", "Which month are you thinking of?", ["November", "December", "January", "February", "March", "April"]);
  if (!brief.days) return question("days", "How many days?", DAY_CHIPS.map(([label]) => label));
  if (!brief.style) return question("style", "What kind of stay do you like?", ["Budget", "Comfort", "Luxury"]);
  if (!brief.destinationId) {
    if (!brief.scope) return question("scope", "India or abroad?", ["India", "International", "Either is fine"]);
    if (!brief.interest) return question("interest", "What would make it a great trip?", Object.values(INTEREST_LABELS));
    return suggest(next, say, false);
  }

  next.plan = buildPlan(brief);
  next.step = "plan";
  next.chips = PLAN_CHIPS;
  const destination = destinationById(brief.destinationId);
  say(
    `Here's a ${brief.days}-day ${destination?.name} plan for ${paxLabel(brief)} from ${brief.origin} in ${MONTHS[(brief.month ?? 1) - 1]}. The budget is an estimate; your holiday expert confirms the real price.`,
    { plan: next.plan },
  );
  return next;
}

function suggest(next: TripState, say: (text: string, extra?: Partial<TripMessage>) => void, more: boolean): TripState {
  const ranked = rankDestinations(next.brief).filter((destination) => !more || !next.shown.includes(destination.id));
  const picks = ranked.slice(0, 3);
  if (picks.length === 0) {
    next.shown = [];
    return suggest(next, say, false);
  }
  next.shown = [...next.shown, ...picks.map((destination) => destination.id)];
  next.step = "pick";
  next.chips = [...picks.map((destination) => destination.name), "Show other places"];
  say(more ? "Here are a few more." : "These would suit you. Tap one to see the full plan.", { suggestions: picks.map((destination) => destination.id) });
  return next;
}

export function rankDestinations(brief: TripBrief): Destination[] {
  return DESTINATIONS.filter((destination) => !brief.scope || brief.scope === "either" || destination.region === brief.scope)
    .map((destination) => {
      let score = 0;
      if (brief.interest && destination.interests.includes(brief.interest)) score += 3;
      if (brief.month && destination.bestMonths.includes(brief.month)) score += 2;
      if (brief.travellers === "couple" && destination.romantic) score += 1;
      if (brief.travellers === "family" && destination.familyFriendly) score += 1;
      if (brief.style === "budget" && destination.cost.stay.comfort <= 8000) score += 1;
      if (brief.style === "luxury" && destination.cost.stay.luxury >= 25000) score += 1;
      return { destination, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.destination);
}

export function buildPlan(brief: TripBrief): TripPlan {
  const destination = destinationById(brief.destinationId ?? "") ?? DESTINATIONS[0];
  const days = brief.days ?? 6;
  const pax = brief.pax ?? 2;
  const style = brief.style ?? "comfort";
  const nights = Math.max(days - 1, 1);
  const rooms = Math.ceil(pax / 2);
  const multiplier = STYLE_MULTIPLIER[style];

  const itinerary = Array.from({ length: days }, (_, index) => {
    if (index === days - 1) return { day: index + 1, text: `Check out and fly home from ${destination.gateway}` };
    return { day: index + 1, text: destination.days[index] ?? "Free day, or an optional excursion your expert can add" };
  });

  const stay = rooms * nights * destination.cost.stay[style];
  const budget: BudgetLine[] = [
    { label: `Return flights for ${pax}`, low: pax * destination.cost.flight[0], high: pax * destination.cost.flight[1] },
    { label: `${STYLE_LABELS[style]} stay · ${nights} nights · ${rooms} room${rooms > 1 ? "s" : ""}`, low: stay * 0.9, high: stay * 1.15 },
    { label: "Transfers and sightseeing", low: pax * days * destination.cost.local * multiplier * 0.9, high: pax * days * destination.cost.local * multiplier * 1.15 },
    { label: "Meals", low: pax * days * destination.cost.meals * multiplier * 0.85, high: pax * days * destination.cost.meals * multiplier * 1.2 },
  ];
  if (destination.region === "international") {
    budget.push({ label: "Visa and travel insurance", low: pax * INTERNATIONAL_EXTRAS[0], high: pax * INTERNATIONAL_EXTRAS[1] });
  }
  const rounded = budget.map((line) => ({ ...line, low: roundTo(line.low), high: roundTo(line.high) }));
  const totalLow = rounded.reduce((sum, line) => sum + line.low, 0);
  const totalHigh = rounded.reduce((sum, line) => sum + line.high, 0);
  const seasonOk = brief.month ? destination.bestMonths.includes(brief.month) : true;

  const notes: string[] = [];
  if (destination.region === "international") {
    notes.push("Visa desk checks what your passport needs for this trip.");
    notes.push("A forex card is easier than cash for daily spends.");
  }
  if (days > destination.days.length + 1) {
    notes.push("Longer than our base plan, so a few days are free for add-ons.");
  }

  return {
    destinationId: destination.id,
    brief: { ...brief },
    days: itinerary,
    budget: rounded,
    totalLow,
    totalHigh,
    perPersonLow: roundTo(totalLow / pax),
    perPersonHigh: roundTo(totalHigh / pax),
    seasonOk,
    seasonNote: seasonOk ? null : destination.offSeasonNote,
    notes,
  };
}

/** Reads a free-text request, such as a document prompt, into a trip brief using the chat's own parser. */
export function briefFromPrompt(text: string): TripBrief {
  const brief: TripBrief = { ...EMPTY_BRIEF };
  absorb(brief, text, "start");
  if (!brief.month) {
    const monthIndex = MONTHS.findIndex((month) => new RegExp(`\\b(${month.toLowerCase()}|${month.slice(0, 3).toLowerCase()})\\b`).test(text.toLowerCase()));
    if (monthIndex >= 0) brief.month = monthIndex + 1;
  }
  if (!brief.origin) {
    const lower = text.toLowerCase();
    brief.origin = ORIGINS.find((city) => lower.includes(city.toLowerCase())) ?? null;
  }
  return brief;
}

/** Indicative price per person for a suggestion card, at the brief's style and length. */
export function indicativeFrom(destination: Destination, brief: TripBrief): number {
  return buildPlan({ ...brief, destinationId: destination.id }).perPersonLow;
}

function absorb(brief: TripBrief, text: string, step: PlannerStep) {
  const lower = text.toLowerCase();
  const destination = matchDestination(text);
  if (destination) brief.destinationId = destination.id;

  if (/honeymoon|couple|wife|husband|partner|anniversary|two of us/.test(lower) || (step === "travellers" && /couple/.test(lower))) {
    brief.travellers = "couple";
  } else if (/family|kids|children|parents/.test(lower)) {
    brief.travellers = "family";
  } else if (/friends|gang|group/.test(lower)) {
    brief.travellers = "friends";
  } else if (/solo|alone|myself|just me/.test(lower)) {
    brief.travellers = "solo";
  }
  const paxMatch = lower.match(/(\d+)\s*(people|of us|adults|pax|travellers|travelers|persons)/);
  if (paxMatch) brief.pax = Number(paxMatch[1]);
  if (brief.travellers && !brief.pax) brief.pax = DEFAULT_PAX[brief.travellers];
  if (brief.travellers && !paxMatch && step === "travellers") brief.pax = DEFAULT_PAX[brief.travellers];

  const origin = ORIGINS.find((city) => lower.includes(city.toLowerCase())) ?? (/bangalore/.test(lower) ? "Bengaluru" : null);
  if (origin && (step === "origin" || /from\s/.test(lower))) brief.origin = origin;

  const monthIndex = MONTHS.findIndex((month) => new RegExp(`\\b(${month.toLowerCase()}|${month.slice(0, 3).toLowerCase()})\\b`).test(lower));
  if (monthIndex >= 0 && (step === "month" || /\bin\s|month/.test(lower) || step === "start")) brief.month = monthIndex + 1;

  const dayChip = DAY_CHIPS.find(([label]) => label.toLowerCase() === lower);
  const daysMatch = lower.match(/(\d+)\s*(days|day|d\b)/);
  const nightsMatch = lower.match(/(\d+)\s*(nights|night|n\b)/);
  if (dayChip) brief.days = dayChip[1];
  else if (daysMatch) brief.days = Math.min(Number(daysMatch[1]), 21);
  else if (nightsMatch) brief.days = Math.min(Number(nightsMatch[1]) + 1, 21);
  else if (/a week|one week/.test(lower)) brief.days = 7;

  if (/luxury|premium|5 ?star|five star/.test(lower)) brief.style = "luxury";
  else if (/budget|cheap|affordable|backpack/.test(lower)) brief.style = "budget";
  else if (/comfort|mid|4 ?star|standard/.test(lower)) brief.style = "comfort";

  if (/\bindia\b|domestic|within india/.test(lower)) brief.scope = "india";
  else if (/international|abroad|overseas|outside india/.test(lower)) brief.scope = "international";
  else if (/either|anywhere|no preference/.test(lower) && step === "scope") brief.scope = "either";

  const interest = INTEREST_KEYWORDS.find(([, pattern]) => pattern.test(lower))?.[0];
  if (interest && (step === "interest" || step === "start")) brief.interest = interest;
}

function offTopicReply(lower: string): string {
  if (/price|cost|how much|cheap/.test(lower)) {
    return "I'll show an estimated budget with the plan. The final price comes from your holiday expert.";
  }
  if (/weather|rain|season|hot|cold/.test(lower)) {
    return "I'll check the season for your month and flag it with the plan.";
  }
  if (/visa/.test(lower)) {
    return "Our visa desk checks the rules for your passport once you ask for a quote.";
  }
  return "I didn't quite get that. Let's keep going.";
}

function addOnChips(next: TripState): string[] {
  const chips: string[] = [];
  const international = destinationById(next.brief.destinationId ?? "")?.region === "international";
  if (international && !next.addOns.forex) chips.push("Yes, add forex");
  if (!next.addOns.insurance) chips.push("Add travel insurance");
  chips.push("No thanks");
  return chips;
}

export function paxLabel(brief: TripBrief): string {
  if (!brief.travellers) return `${brief.pax ?? 2} travellers`;
  if (brief.travellers === "solo") return "one traveller";
  if (brief.travellers === "couple") return "a couple";
  return `${TRAVELLER_LABELS[brief.travellers].toLowerCase()} (${brief.pax})`;
}

export function travellerLabel(brief: TripBrief): string | null {
  return brief.travellers ? `${TRAVELLER_LABELS[brief.travellers]} · ${brief.pax}` : null;
}

function leadCode(brief: TripBrief): string {
  if (brief.destinationId === "bali" && brief.travellers === "couple") {
    return GOLDEN_LEAD;
  }
  const key = JSON.stringify(brief);
  let hash = 0;
  for (const character of key) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `HL-${3000 + (hash % 6000)}`;
}

function roundTo(value: number): number {
  return Math.round(value / 1000) * 1000;
}

export function formatInr(value: number): string {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(value >= 1000000 ? 1 : 2).replace(/\.?0+$/, "")} L`;
  }
  return `₹${Math.round(value / 1000)}k`;
}

/** The HL-2611 golden path as traveller turns, for the demo replay button. */
export const GOLDEN_TRIP_TURNS = [
  "Honeymoon in Bali for 6 days",
  "Mumbai",
  "November",
  "Comfort",
  "Get an exact quote",
  "Yes, add forex",
  "No thanks",
];
