/**
 * Ride planning: CX Rider takes the brief in chat, Route Clerk drafts the route,
 * Group Ride Clerk writes the iRide note, and the ride lead publishes.
 *
 * Every route below is a demo draft with approximate distances, listed in
 * context/use-cases/ride-planning.md. The rider and the ride lead confirm before
 * anything is published. No price is stored. Weather is not connected.
 */

export type RideMode = "group" | "solo";
export type RideLength = "half" | "one" | "weekend" | "multi";
export type RideExperience = "new" | "mixed" | "experienced";
export type PlannerStep =
  | "intent"
  | "start"
  | "length"
  | "riders"
  | "experience"
  | "when"
  | "plan"
  | "done"
  | "testride_city"
  | "testride_bike"
  | "testride_done";

export interface RideBrief {
  mode: RideMode | null;
  start: string | null;
  length: RideLength | null;
  riders: number | null;
  experience: RideExperience | null;
  when: string | null;
}

export interface RideLeg {
  day: number;
  from: string;
  to: string;
  km: number;
  hours: string;
  stops: string[];
}

export interface RideRoute {
  name: string;
  vibe: string;
  meetingPoint: string;
  legs: RideLeg[];
}

export interface RidePlan {
  caseCode: string;
  route: RideRoute | null;
  startLabel: string;
  lengthLabel: string;
  totalKm: number | null;
  flagOff: string;
  crew: { lead: number; sweep: number; marshals: number } | null;
  warnings: string[];
  checklist: string[];
  rideNote: string | null;
}

export interface ChatMessage {
  id: number;
  from: "bot" | "rider";
  text: string;
  /** Snapshot of the plan when this message was sent. Rendered as the plan card. */
  plan?: RidePlan;
}

export interface PlannerState {
  step: PlannerStep;
  brief: RideBrief;
  messages: ChatMessage[];
  chips: string[];
  plan: RidePlan | null;
  sentToLead: boolean;
  testRide: { city: string | null; bike: string | null } | null;
  nextId: number;
}

/** Demo crew rule, kept in config because the community will set its own. */
export const RIDERS_PER_MARSHAL = 8;

/** Comfortable riding distance per day by group experience. Demo config, not a safety standard. */
export const DAILY_KM_CAP: Record<RideExperience, number> = {
  new: 150,
  mixed: 250,
  experienced: 350,
};

export const GOLDEN_CASE_CODE = "RD-0907";

const LENGTH_LABELS: Record<RideLength, string> = {
  half: "Morning loop (half day)",
  one: "One full day",
  weekend: "Weekend (2 days)",
  multi: "3 days or more",
};

const EXPERIENCE_LABELS: Record<RideExperience, string> = {
  new: "First group ride / new owners",
  mixed: "Mixed group",
  experienced: "Experienced tourers",
};

export const TEST_RIDE_BIKES = ["Hunter 350", "Classic 350", "Himalayan 450", "Guerrilla 450"];

const CITY_ALIASES: Record<string, string[]> = {
  Gurugram: ["gurugram", "gurgaon", "cyber hub", "cyberhub", "ncr"],
  Pune: ["pune"],
  Bengaluru: ["bengaluru", "bangalore", "blr"],
};

/** Demo route drafts per start city and length. Distances are approximate. */
const ROUTES: Record<string, Record<RideLength, RideRoute>> = {
  Gurugram: {
    half: {
      name: "Aravallis Sunday Scramble",
      vibe: "Forest-edge loops and a chai stop. Built for a first group ride.",
      meetingPoint: "Cyber Hub, Gurugram",
      legs: [{ day: 1, from: "Cyber Hub", to: "Cyber Hub", km: 90, hours: "about 3.5 h", stops: ["Damdama Lake regroup", "Sohna chai stop"] }],
    },
    one: {
      name: "Neemrana Fort run",
      vibe: "Highway cruise to a heritage fort, lunch, and back before dark.",
      meetingPoint: "Cyber Hub, Gurugram",
      legs: [{ day: 1, from: "Cyber Hub", to: "Cyber Hub", km: 240, hours: "about 6.5 h", stops: ["Manesar regroup", "Neemrana Fort lunch", "Dharuhera fuel stop"] }],
    },
    weekend: {
      name: "Alwar and Sariska weekend",
      vibe: "Aravalli hills, a lake stay, and forest roads on day two.",
      meetingPoint: "Cyber Hub, Gurugram",
      legs: [
        { day: 1, from: "Cyber Hub", to: "Alwar", km: 160, hours: "about 4.5 h", stops: ["Sohna regroup", "Nuh fuel stop", "Siliserh Lake"] },
        { day: 2, from: "Alwar", to: "Cyber Hub", km: 170, hours: "about 5 h", stops: ["Sariska forest road", "Bhiwadi fuel stop"] },
      ],
    },
    multi: {
      name: "Kasauli hills tour",
      vibe: "Plains to pine hills over three days, with a rest loop in the middle.",
      meetingPoint: "Cyber Hub, Gurugram",
      legs: [
        { day: 1, from: "Cyber Hub", to: "Chandigarh", km: 270, hours: "about 6 h", stops: ["Murthal breakfast", "Karnal fuel stop"] },
        { day: 2, from: "Chandigarh", to: "Kasauli", km: 60, hours: "about 2 h", stops: ["Parwanoo regroup", "Kasauli ridge loop"] },
        { day: 3, from: "Kasauli", to: "Cyber Hub", km: 320, hours: "about 7.5 h", stops: ["Pinjore regroup", "Panipat fuel stop"] },
      ],
    },
  },
  Pune: {
    half: {
      name: "Sinhagad sunrise loop",
      vibe: "Early climb, fort views, and breakfast by the dam.",
      meetingPoint: "Chandni Chowk, Pune",
      legs: [{ day: 1, from: "Chandni Chowk", to: "Chandni Chowk", km: 70, hours: "about 3 h", stops: ["Sinhagad base regroup", "Khadakwasla breakfast"] }],
    },
    one: {
      name: "Tamhini Ghat run",
      vibe: "Ghat twisties, waterfalls in season, and a lake lunch.",
      meetingPoint: "Chandni Chowk, Pune",
      legs: [{ day: 1, from: "Chandni Chowk", to: "Chandni Chowk", km: 140, hours: "about 5 h", stops: ["Paud regroup", "Tamhini viewpoint", "Mulshi lunch"] }],
    },
    weekend: {
      name: "Mahabaleshwar weekend",
      vibe: "Pasarni ghat up, Panchgani tableland on the way back.",
      meetingPoint: "Katraj, Pune",
      legs: [
        { day: 1, from: "Katraj", to: "Mahabaleshwar", km: 120, hours: "about 3.5 h", stops: ["Khambatki ghat regroup", "Wai breakfast"] },
        { day: 2, from: "Mahabaleshwar", to: "Katraj", km: 120, hours: "about 3.5 h", stops: ["Panchgani tableland", "Shirwal fuel stop"] },
      ],
    },
    multi: {
      name: "Konkan coast tour",
      vibe: "Down the ghats to the sea, a coastal day, and back over the hills.",
      meetingPoint: "Chandni Chowk, Pune",
      legs: [
        { day: 1, from: "Chandni Chowk", to: "Dapoli", km: 190, hours: "about 5.5 h", stops: ["Tamhini regroup", "Mangaon lunch"] },
        { day: 2, from: "Dapoli", to: "Ganpatipule", km: 120, hours: "about 4 h", stops: ["Coastal road", "Guhagar beach stop"] },
        { day: 3, from: "Ganpatipule", to: "Chandni Chowk", km: 320, hours: "about 8 h", stops: ["Chiplun regroup", "Kumbharli ghat", "Karad fuel stop"] },
      ],
    },
  },
  Bengaluru: {
    half: {
      name: "Nandi Hills sunrise",
      vibe: "Pre-dawn ride up the hairpins for sunrise, breakfast on the way down.",
      meetingPoint: "Hebbal flyover, Bengaluru",
      legs: [{ day: 1, from: "Hebbal", to: "Hebbal", km: 120, hours: "about 4 h", stops: ["Devanahalli regroup", "Nandi Hills top", "Breakfast stop"] }],
    },
    one: {
      name: "Shivanasamudra falls run",
      vibe: "Countryside roads to the falls and back.",
      meetingPoint: "Nice Road junction, Bengaluru",
      legs: [{ day: 1, from: "Nice Road", to: "Nice Road", km: 280, hours: "about 7 h", stops: ["Maddur vada stop", "Shivanasamudra falls", "Malavalli fuel stop"] }],
    },
    weekend: {
      name: "Chikmagalur weekend",
      vibe: "Coffee estates, a hill-road morning, and a long highway return.",
      meetingPoint: "Nelamangala toll, Bengaluru",
      legs: [
        { day: 1, from: "Nelamangala", to: "Chikmagalur", km: 245, hours: "about 6 h", stops: ["Kunigal regroup", "Hassan lunch"] },
        { day: 2, from: "Chikmagalur", to: "Nelamangala", km: 245, hours: "about 6 h", stops: ["Mullayanagiri morning loop", "Hassan fuel stop"] },
      ],
    },
    multi: {
      name: "Coorg three-day tour",
      vibe: "Highway out, two days of estate roads, and back.",
      meetingPoint: "Nice Road junction, Bengaluru",
      legs: [
        { day: 1, from: "Nice Road", to: "Madikeri", km: 265, hours: "about 6.5 h", stops: ["Mysuru breakfast", "Kushalnagar regroup"] },
        { day: 2, from: "Madikeri", to: "Madikeri", km: 80, hours: "about 3 h", stops: ["Abbey Falls", "Estate road loop"] },
        { day: 3, from: "Madikeri", to: "Nice Road", km: 265, hours: "about 6.5 h", stops: ["Hunsur regroup", "Mysuru lunch"] },
      ],
    },
  },
};

const RIDE_CHECKLIST = [
  "Driving licence, RC, insurance, and PUC",
  "Full-face helmet, riding jacket, gloves, and boots",
  "Full tank at the meeting point",
  "Puncture kit and a charged phone",
];

const FAQ: { pattern: RegExp; answer: string }[] = [
  {
    pattern: /\b(document|documents|papers|licen[cs]e|dl|rc|carry|pack|gear|helmet|jacket)\b/i,
    answer:
      "Carry your driving licence, RC, insurance, and PUC. For a group ride: full-face helmet, riding jacket, gloves, and boots. Start with a full tank.",
  },
  {
    pattern: /\b(weather|rain|forecast|monsoon|fog)\b/i,
    answer:
      "Weather Watch is not connected yet, so I can't give you a forecast. Check it the evening before. The ride lead calls off a ride if the weather turns.",
  },
  {
    pattern: /\b(price|cost|costs|on-road|onroad|emi|fee|fees|charge|charges|expensive)\b/i,
    answer:
      "I don't quote prices. Ex-showroom prices on the site are indicative and the dealer confirms the on-road price. Ride costs like fuel and food are shared by the ride lead in the iRide note.",
  },
  {
    pattern: /\b(marshal|marshals|sweep|lead rider|crew)\b/i,
    answer: `A group ride has a lead at the front, a sweep at the back, and one marshal for every ${RIDERS_PER_MARSHAL} riders after the first ${RIDERS_PER_MARSHAL}. Nobody overtakes the lead or drops behind the sweep.`,
  },
  {
    pattern: /\b(iride|publish|join|sign up|signup|register)\b/i,
    answer:
      "Group rides are published and joined on the iRide portal. I draft the plan, and the ride lead publishes it there. I can't promise a slot.",
  },
  {
    pattern: /\b(fuel|petrol|mileage)\b/i,
    answer: "Start with a full tank. The draft marks a fuel stop on longer legs. The ride lead confirms it.",
  },
  {
    pattern: /\b(human|person|someone|call me|talk to)\b/i,
    answer: "Noted. The ride lead sees this case and can call you back. I'll keep planning in the meantime.",
  },
];

const QUESTIONS: Record<PlannerStep, { text: (brief: RideBrief) => string; chips: string[] }> = {
  intent: {
    text: () => "What are you planning?",
    chips: ["A group ride event", "A solo ride", "Book a test ride", "What do I need to carry?"],
  },
  start: {
    text: (brief) => (brief.mode === "solo" ? "Where are you starting from?" : "Where does the ride start?"),
    chips: ["Gurugram", "Pune", "Bengaluru", "Another city"],
  },
  length: {
    text: () => "How long is the ride?",
    chips: [LENGTH_LABELS.half, LENGTH_LABELS.one, LENGTH_LABELS.weekend, LENGTH_LABELS.multi],
  },
  riders: {
    text: () => "How many riders are you expecting, including you?",
    chips: ["2 to 5", "6 to 15", "16 to 30", "More than 30"],
  },
  experience: {
    text: (brief) => (brief.mode === "solo" ? "How much touring have you done?" : "How experienced is the group?"),
    chips: [EXPERIENCE_LABELS.new, EXPERIENCE_LABELS.mixed, EXPERIENCE_LABELS.experienced],
  },
  when: {
    text: () => "When do you want to ride?",
    chips: ["This Sunday", "Next weekend", "Date not fixed yet"],
  },
  plan: { text: () => "", chips: [] },
  done: { text: () => "", chips: ["Plan another ride", "What do I need to carry?"] },
  testride_city: {
    text: () => "Happy to set that up. Which city should the dealer be in?",
    chips: ["Gurugram", "Pune", "Bengaluru"],
  },
  testride_bike: {
    text: () => "Which motorcycle would you like to ride?",
    chips: TEST_RIDE_BIKES,
  },
  testride_done: { text: () => "", chips: ["Plan a group ride", "What do I need to carry?"] },
};

const PLAN_CHIPS_GROUP = ["Send to ride lead", "Change the start", "Change the length", "Change group size", "Start over"];
const PLAN_CHIPS_SOLO = ["Looks good", "Change the start", "Change the length", "Start over"];

const EMPTY_BRIEF: RideBrief = { mode: null, start: null, length: null, riders: null, experience: null, when: null };

export function initialPlannerState(): PlannerState {
  return {
    step: "intent",
    brief: { ...EMPTY_BRIEF },
    messages: [
      { id: 1, from: "bot", text: "Hi, I'm CX Rider from the Pure Motorcycling community. I help riders plan rides and group ride events." },
      { id: 2, from: "bot", text: QUESTIONS.intent.text(EMPTY_BRIEF) },
    ],
    chips: QUESTIONS.intent.chips,
    plan: null,
    sentToLead: false,
    testRide: null,
    nextId: 3,
  };
}

/** One rider turn in, the bot's reply out. Pure: the UI decides how to animate it. */
export function respond(state: PlannerState, input: string): PlannerState {
  const text = input.trim();
  if (!text) {
    return state;
  }

  let next: PlannerState = { ...state, messages: [...state.messages] };
  const say = (message: string, plan?: RidePlan) => {
    next.messages.push({ id: next.nextId, from: "bot", text: message, plan });
    next.nextId += 1;
  };
  next.messages.push({ id: next.nextId, from: "rider", text });
  next.nextId += 1;

  const lower = text.toLowerCase();

  if (/^(start over|plan another ride|plan a group ride|restart)$/i.test(text)) {
    const fresh = initialPlannerState();
    next = { ...fresh, messages: next.messages, nextId: next.nextId, sentToLead: false };
    if (/group/i.test(text)) {
      next.brief = { ...EMPTY_BRIEF, mode: "group" };
      return ask(next, say, "Let's plan it.");
    }
    return ask(next, say, "Sure, a fresh plan.");
  }

  switch (next.step) {
    case "intent":
      return handleIntent(next, lower, say);
    case "start": {
      if (/another city|other city/i.test(text)) {
        say("Type the city or the meeting point.");
        next.chips = [];
        return next;
      }
      const faq = faqAnswer(text);
      if (faq && !matchCity(text)) {
        return answerThenAsk(next, say, faq);
      }
      next.brief = { ...next.brief, start: matchCity(text) ?? titleCase(text) };
      return advance(next, say);
    }
    case "length": {
      const length = parseLength(lower);
      if (!length) {
        return fallback(next, say, text);
      }
      next.brief = { ...next.brief, length };
      return advance(next, say);
    }
    case "riders": {
      const riders = parseRiders(lower);
      if (!riders) {
        return fallback(next, say, text);
      }
      next.brief = { ...next.brief, riders };
      return advance(next, say);
    }
    case "experience": {
      const experience = parseExperience(lower);
      if (!experience) {
        return fallback(next, say, text);
      }
      next.brief = { ...next.brief, experience };
      return advance(next, say);
    }
    case "when": {
      const faq = faqAnswer(text);
      if (faq) {
        return answerThenAsk(next, say, faq);
      }
      next.brief = { ...next.brief, when: /not fixed/i.test(text) ? "Date to be fixed" : text };
      return advance(next, say);
    }
    case "plan":
      return handlePlanAction(next, lower, text, say);
    case "testride_city": {
      const city = matchCity(text) ?? titleCase(text);
      next.testRide = { city, bike: null };
      return askStep(next, say, "testride_bike");
    }
    case "testride_bike": {
      const bike = TEST_RIDE_BIKES.find((name) => lower.includes(name.toLowerCase().split(" ")[0])) ?? titleCase(text);
      next.testRide = { city: next.testRide?.city ?? null, bike };
      say(
        `Done. Dealer Handoff has sent a test-ride request for the ${bike} to a dealer in ${next.testRide.city}. The dealer confirms the slot and whether the bike is in stock. The on-road price also comes from the dealer.`,
      );
      next.step = "testride_done";
      next.chips = QUESTIONS.testride_done.chips;
      return next;
    }
    case "done":
    case "testride_done": {
      const faq = faqAnswer(text);
      say(faq ?? "I'm here if you want to plan another ride.");
      next.chips = QUESTIONS[next.step].chips;
      return next;
    }
  }
}

function handleIntent(next: PlannerState, lower: string, say: (text: string) => void): PlannerState {
  if (/test ?ride|test-ride|try (a|the) bike/.test(lower)) {
    next.testRide = { city: null, bike: null };
    return askStep(next, say, "testride_city");
  }
  if (/group|event|community|friends|club|we are|we're|crew/.test(lower)) {
    next.brief = absorbDetails({ ...next.brief, mode: "group" }, lower);
    return ask(next, say, "A group ride. Let's put the plan together.");
  }
  if (/solo|alone|myself|just me|only me/.test(lower)) {
    next.brief = absorbDetails({ ...next.brief, mode: "solo" }, lower);
    return ask(next, say, "A solo ride. Let's plan it.");
  }
  const faq = faqAnswer(lower);
  if (faq) {
    return answerThenAsk(next, say, faq);
  }
  return fallback(next, say, lower);
}

function handlePlanAction(next: PlannerState, lower: string, text: string, say: (text: string, plan?: RidePlan) => void): PlannerState {
  if (/send to (the )?ride lead|send it|publish|looks good|confirm|go ahead|yes/.test(lower)) {
    next.sentToLead = next.brief.mode === "group";
    next.step = "done";
    next.chips = QUESTIONS.done.chips;
    if (next.brief.mode === "group" && next.plan) {
      say(
        `Sent. Group Ride Clerk wrote the iRide note on case ${next.plan.caseCode}. The ride lead reviews it, publishes on iRide, and shares the join link. I can't promise the slot until they do.`,
      );
    } else {
      say(`Saved on case ${next.plan?.caseCode ?? ""}. Ride safe, and check the weather the evening before.`);
    }
    return next;
  }
  const change: [RegExp, keyof RideBrief][] = [
    [/start|city|meeting/, "start"],
    [/length|long|days|duration/, "length"],
    [/group size|riders|people|how many/, "riders"],
    [/experience/, "experience"],
    [/date|when|day/, "when"],
  ];
  for (const [pattern, slot] of change) {
    if (pattern.test(lower)) {
      next.brief = { ...next.brief, [slot]: null };
      next.plan = null;
      return ask(next, say, "Sure.");
    }
  }
  const faq = faqAnswer(text);
  say(faq ?? "Tell me what to change, or send it to the ride lead.");
  next.chips = next.brief.mode === "solo" ? PLAN_CHIPS_SOLO : PLAN_CHIPS_GROUP;
  return next;
}

function advance(next: PlannerState, say: (text: string, plan?: RidePlan) => void): PlannerState {
  return ask(next, say, null);
}

/** Moves to the first missing slot, or to the plan once the brief is complete. */
function ask(next: PlannerState, say: (text: string, plan?: RidePlan) => void, lead: string | null): PlannerState {
  const missing = firstMissing(next.brief);
  if (lead) {
    say(lead);
  }
  if (missing) {
    return askStep(next, say, missing);
  }
  next.plan = buildPlan(next.brief);
  next.step = "plan";
  next.chips = next.brief.mode === "solo" ? PLAN_CHIPS_SOLO : PLAN_CHIPS_GROUP;
  say(
    next.plan.route
      ? "Here is the draft. Route Clerk put it together. Distances are approximate, and you confirm before anything is published."
      : `I don't have a saved route from ${next.brief.start} yet. Route Clerk has opened the case so the ride lead can draft the route with you.`,
    next.plan,
  );
  say(next.brief.mode === "solo" ? "Does this work for you?" : "Shall I send this to the ride lead? They publish it on iRide.");
  return next;
}

function askStep(next: PlannerState, say: (text: string) => void, step: PlannerStep): PlannerState {
  next.step = step;
  next.chips = QUESTIONS[step].chips;
  say(QUESTIONS[step].text(next.brief));
  return next;
}

function answerThenAsk(next: PlannerState, say: (text: string) => void, answer: string): PlannerState {
  say(answer);
  return askStep(next, say, next.step);
}

function fallback(next: PlannerState, say: (text: string) => void, text: string): PlannerState {
  const faq = faqAnswer(text);
  if (faq) {
    return answerThenAsk(next, say, faq);
  }
  say("I can help plan rides, set up a test ride, and tell you what to carry. Let's keep going.");
  return askStep(next, say, next.step);
}

/** A first message often carries more than the intent: "20 of us, weekend ride from Pune". Keep what it says. */
function absorbDetails(brief: RideBrief, lower: string): RideBrief {
  const riders = lower.match(/(\d+)\s*(riders|people|friends|of us|bikes|members)/);
  return {
    ...brief,
    start: brief.start ?? matchCity(lower),
    length: brief.length ?? (/\b(weekend|half day|full day|one day|\d+ days)\b/.test(lower) ? parseLength(lower) : null),
    riders: brief.riders ?? (brief.mode === "group" && riders ? Number(riders[1]) : null),
    experience: brief.experience ?? (/\b(new riders|first ride|beginners|experienced|tourers)\b/.test(lower) ? parseExperience(lower) : null),
  };
}

function firstMissing(brief: RideBrief): PlannerStep | null {
  if (!brief.mode) return "intent";
  if (!brief.start) return "start";
  if (!brief.length) return "length";
  if (brief.mode === "group" && !brief.riders) return "riders";
  if (!brief.experience) return "experience";
  if (!brief.when) return "when";
  return null;
}

function faqAnswer(text: string): string | null {
  return FAQ.find((entry) => entry.pattern.test(text))?.answer ?? null;
}

export function matchCity(text: string): string | null {
  const lower = text.toLowerCase();
  return Object.entries(CITY_ALIASES).find(([, aliases]) => aliases.some((alias) => lower.includes(alias)))?.[0] ?? null;
}

function parseLength(lower: string): RideLength | null {
  if (/half|morning|few hours|short|sunrise|loop/.test(lower)) return "half";
  if (/weekend|2 days|two days|overnight|2-day|two-day/.test(lower)) return "weekend";
  if (/\b[3-9]\b|three|four|five|week|more|multi|long tour/.test(lower)) return "multi";
  if (/full day|one day|1 day|day ride|whole day|one full/.test(lower)) return "one";
  return null;
}

function parseRiders(lower: string): number | null {
  if (/just me|only me|myself|solo/.test(lower)) return 1;
  const numbers = (lower.match(/\d+/g) ?? []).map(Number).filter((value) => value > 0 && value < 500);
  if (numbers.length === 0) return null;
  return Math.max(...numbers);
}

function parseExperience(lower: string): RideExperience | null {
  if (/new|first|beginner|novice|learning/.test(lower)) return "new";
  if (/experienced|tourer|touring|expert|seasoned|pro/.test(lower)) return "experienced";
  if (/mixed|mix|some|average|both/.test(lower)) return "mixed";
  return null;
}

function titleCase(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function lengthLabel(length: RideLength): string {
  return LENGTH_LABELS[length];
}

export function experienceLabel(experience: RideExperience): string {
  return EXPERIENCE_LABELS[experience];
}

export function buildPlan(brief: RideBrief): RidePlan {
  const route = brief.start && brief.length ? ROUTES[brief.start]?.[brief.length] ?? null : null;
  const totalKm = route ? route.legs.reduce((sum, leg) => sum + leg.km, 0) : null;
  const caseCode = caseCodeFor(brief);
  const isGroup = brief.mode === "group";
  const riders = brief.riders ?? 1;
  const crew = isGroup ? { lead: 1, sweep: 1, marshals: Math.max(0, Math.ceil(riders / RIDERS_PER_MARSHAL) - 1) } : null;

  const warnings: string[] = [];
  if (route && brief.experience) {
    const cap = DAILY_KM_CAP[brief.experience];
    route.legs
      .filter((leg) => leg.km > cap)
      .forEach((leg) =>
        warnings.push(
          `Day ${leg.day} is about ${leg.km} km, above the ${cap} km comfort cap for ${EXPERIENCE_LABELS[brief.experience as RideExperience].toLowerCase()}. The ride lead decides whether to split it.`,
        ),
      );
  }
  if (isGroup && brief.experience === "new") {
    warnings.push("First group ride: hold a 20-minute briefing before flag-off and keep a steady pace with regroups at every stop.");
  }
  if (isGroup && riders > 30) {
    warnings.push("More than 30 riders: the ride lead may split the group into two flights with their own lead and sweep.");
  }
  if (!route) {
    warnings.push(`No saved route from ${brief.start ?? "this city"}. The ride lead drafts the route with the rider.`);
  }

  const flagOff = brief.length === "half" ? "6:30 AM (briefing 6:00 AM)" : "6:00 AM (briefing 5:30 AM)";
  const plan: RidePlan = {
    caseCode,
    route,
    startLabel: route?.meetingPoint ?? brief.start ?? "To be fixed",
    lengthLabel: brief.length ? LENGTH_LABELS[brief.length] : "To be fixed",
    totalKm,
    flagOff,
    crew,
    warnings,
    checklist: RIDE_CHECKLIST,
    rideNote: null,
  };
  plan.rideNote = isGroup ? rideNote(brief, plan) : null;
  return plan;
}

function rideNote(brief: RideBrief, plan: RidePlan): string {
  const lines = [
    plan.route?.name ?? `Group ride from ${brief.start}`,
    `${brief.when ?? "Date to be fixed"} · flag-off ${plan.flagOff}`,
    `Meet at ${plan.startLabel}`,
  ];
  if (plan.route) {
    plan.route.legs.forEach((leg) => {
      lines.push(`Day ${leg.day}: ${leg.from} → ${leg.to}, about ${leg.km} km, ${leg.hours}. Stops: ${leg.stops.join(", ")}.`);
    });
  } else {
    lines.push("Route: to be drafted by the ride lead.");
  }
  if (plan.crew) {
    lines.push(
      `Up to ${brief.riders} riders · lead 1, sweep 1${plan.crew.marshals > 0 ? `, marshals ${plan.crew.marshals}` : ""}`,
    );
  }
  lines.push(`Level: ${brief.experience ? EXPERIENCE_LABELS[brief.experience] : "Open"}`);
  lines.push("Carry: DL, RC, insurance, PUC. Full riding gear. Full tank at the start.");
  lines.push("Weather: check the forecast the evening before.");
  return lines.join("\n");
}

function caseCodeFor(brief: RideBrief): string {
  if (brief.mode === "group" && brief.start === "Gurugram" && brief.length === "half") {
    return GOLDEN_CASE_CODE;
  }
  const key = `${brief.mode}-${brief.start}-${brief.length}-${brief.riders}-${brief.when}`;
  let hash = 0;
  for (const character of key) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `RD-${1000 + (hash % 9000)}`;
}

/** The RD-0907 golden path as rider turns, for the demo replay button. */
export const GOLDEN_PATH_TURNS = [
  "A group ride event",
  "Gurugram",
  LENGTH_LABELS.half,
  "6 to 15",
  EXPERIENCE_LABELS.new,
  "This Sunday",
];
