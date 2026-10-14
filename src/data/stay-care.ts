/**
 * In-stay care: a guest reports a problem during a hotel stay. Stay Care takes it in chat,
 * Issue Triage sets the category and the response clock, Hotel Liaison raises it with the
 * hotel, and Resolution Guard flags anything the stay desk must approve.
 *
 * The hotel system is not connected, so the message to the hotel is a draft. Nobody here
 * promises a refund, a credit, or a free night. Demo values are listed in
 * context/use-cases/hotel-exploration.md.
 */

export type IssueCategory = "safety" | "room" | "cleanliness" | "noise" | "wifi" | "service" | "billing" | "other";
export type IssueUrgency = "critical" | "high" | "medium" | "low";
export type GuestAsk = "fix" | "room_move" | "credit" | "callback" | "log";
export type FrontDeskStatus = "not_told" | "told" | "told_long_ago";
export type CareStep = "issue" | "where" | "front_desk" | "ask" | "followup" | "rating" | "closed";

export interface IssueBrief {
  text: string | null;
  category: IssueCategory | null;
  hotel: string | null;
  room: string | null;
  frontDesk: FrontDeskStatus | null;
  ask: GuestAsk | null;
}

export interface CareTicket {
  code: string;
  category: IssueCategory;
  urgency: IssueUrgency;
  respondWithin: string;
  escalatedTo: "front desk" | "duty manager";
  /** Why a person on the stay desk must act, or null when the hotel can just fix it. */
  approvalReason: string | null;
  hotelNote: string;
}

export interface CareMessage {
  id: number;
  from: "bot" | "guest";
  text: string;
  /** Snapshot of the ticket when this message was sent. */
  ticket?: CareTicket;
}

export interface CareState {
  step: CareStep;
  brief: IssueBrief;
  messages: CareMessage[];
  chips: string[];
  ticket: CareTicket | null;
  status: "intake" | "open" | "escalated" | "resolved";
  rating: number | null;
  nextId: number;
}

export const DEMO_STAY = "Seabreeze Business Hotel, Andheri, Mumbai";
export const DEMO_ROOM = "1412";
export const GOLDEN_TICKET = "HT-C-3107";
export const EMERGENCY_NUMBER = "112";

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  safety: "Safety",
  room: "Room not working",
  cleanliness: "Cleanliness",
  noise: "Noise",
  wifi: "Wi-Fi",
  service: "Food and service",
  billing: "Billing",
  other: "Other",
};

export const URGENCY_LABELS: Record<IssueUrgency, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const ASK_LABELS: Record<GuestAsk, string> = {
  fix: "Fix it",
  room_move: "Move to another room",
  credit: "Refund or credit",
  callback: "Talk to a person",
  log: "Just log it",
};

export const FRONT_DESK_LABELS: Record<FrontDeskStatus, string> = {
  not_told: "Not told yet",
  told: "Told, nothing happened",
  told_long_ago: "Told over an hour ago",
};

/** Response clock by category. Demo config: each client and hotel sets its own. */
const RESPONSE_CLOCK: Record<IssueCategory, { urgency: IssueUrgency; within: string }> = {
  safety: { urgency: "critical", within: "Now: a person calls" },
  room: { urgency: "high", within: "30 minutes" },
  cleanliness: { urgency: "medium", within: "2 hours" },
  noise: { urgency: "medium", within: "2 hours" },
  wifi: { urgency: "medium", within: "2 hours" },
  service: { urgency: "medium", within: "2 hours" },
  billing: { urgency: "low", within: "Before checkout" },
  other: { urgency: "medium", within: "2 hours" },
};

/** First match wins, so safety is checked before everything else. */
const CATEGORY_PATTERNS: [IssueCategory, RegExp][] = [
  ["safety", /unsafe|danger|fire|smoke|harass|theft|stolen|threat|medical|injur|hurt|emergency|gas leak|intruder|doesn'?t lock|won'?t lock|not locking/],
  ["billing", /\bbill\b|billing|charge|charged|invoice|overcharg|deposit|refund/],
  ["room", /\bac\b|a\/c|air ?con|hot water|geyser|no water|power|electric|\blights?\b|\btv\b|\block\b|leak|toilet|flush|shower|heater|\bfan\b|not working|broken/],
  ["cleanliness", /dirty|clean|smell|stain|bed ?bug|cockroach|insect|towel|sheet|hair/],
  ["noise", /noise|noisy|loud|party|construction|music/],
  ["wifi", /wi-?fi|internet|network/],
  ["service", /food|room service|breakfast|restaurant|meal|order|staff|rude|slow service/],
];

const ISSUE_CHIPS = ["AC or room not working", "Room not clean", "Too noisy", "Wrong charge on my bill", "I feel unsafe"];
const FOLLOWUP_CHIPS = ["It's fixed now", "Still not fixed", "Talk to a person"];

export function initialCareState(): CareState {
  return {
    step: "issue",
    brief: { text: null, category: null, hotel: null, room: null, frontDesk: null, ask: null },
    messages: [
      { id: 1, from: "bot", text: "Hi, this is Stay Care from your corporate travel desk. Sorry something isn't right with your stay." },
      { id: 2, from: "bot", text: "What's the problem? Tell me in your own words." },
    ],
    chips: ISSUE_CHIPS,
    ticket: null,
    status: "intake",
    rating: null,
    nextId: 3,
  };
}

/** One guest turn in, the bot's reply out. Pure: the UI animates it. */
export function respondCare(state: CareState, input: string): CareState {
  const text = input.trim();
  if (!text) {
    return state;
  }

  const next: CareState = { ...state, messages: [...state.messages], brief: { ...state.brief } };
  const say = (message: string, ticket?: CareTicket) => {
    next.messages.push({ id: next.nextId, from: "bot", text: message, ticket });
    next.nextId += 1;
  };
  next.messages.push({ id: next.nextId, from: "guest", text });
  next.nextId += 1;
  const lower = text.toLowerCase();

  if (/^(start over|report another issue|new issue)$/i.test(text)) {
    const fresh = initialCareState();
    next.step = fresh.step;
    next.brief = fresh.brief;
    next.chips = fresh.chips;
    next.ticket = null;
    next.status = "intake";
    next.rating = null;
    say("Sure. What's the problem this time?");
    return next;
  }

  switch (next.step) {
    case "issue": {
      const category = categorise(lower);
      next.brief.text = text;
      next.brief.category = category;
      absorbWhere(next.brief, text);
      if (category === "safety") {
        say(`If you are in danger right now, call hotel reception or ${EMERGENCY_NUMBER} first. I'm alerting your stay desk so a person calls you now.`);
      } else {
        say(`Sorry about that. I've noted it as ${CATEGORY_LABELS[category].toLowerCase()}.`);
      }
      return askNext(next, say);
    }
    case "where": {
      const rest = text.replace(/,?\s*room\s*(?:no\.?|number)?\s*\d+/i, "").trim();
      if (!next.brief.hotel && rest && !/^\d+$/.test(rest)) {
        next.brief.hotel = rest;
      }
      absorbWhere(next.brief, text);
      if (!next.brief.room && /^\d{2,5}$/.test(text)) {
        next.brief.room = text;
      }
      return askNext(next, say);
    }
    case "front_desk":
      next.brief.frontDesk = /hour|long|ages|morning|yesterday/.test(lower)
        ? "told_long_ago"
        : /yes|told|called|informed|reported|nothing/.test(lower)
          ? "told"
          : "not_told";
      return askNext(next, say);
    case "ask":
      next.brief.ask = parseAsk(lower);
      if (next.brief.ask === "credit") {
        say("I can't promise a refund or a credit. The stay desk decides that with the hotel, and I'll pass your ask on.");
      }
      return askNext(next, say);
    case "followup": {
      if (/fixed now|it'?s fixed|sorted|resolved|working now|done/.test(lower) && !/not fixed|still/.test(lower)) {
        next.status = "resolved";
        next.step = "rating";
        next.chips = ["5", "4", "3", "2", "1"];
        say("Glad that's sorted. How did we handle it, from 1 to 5?");
        return next;
      }
      if (/person|human|call me|manager|talk/.test(lower)) {
        next.status = "escalated";
        next.brief.ask = next.brief.ask === "log" || next.brief.ask === "fix" ? "callback" : next.brief.ask;
        next.ticket = next.ticket ? { ...next.ticket, escalatedTo: "duty manager", approvalReason: next.ticket.approvalReason ?? "Guest asked to talk to a person." } : null;
        say("Done. Your stay desk will call you back, and I've marked it urgent. I'm promising the call, not an outcome.");
        next.chips = ["It's fixed now"];
        return next;
      }
      next.status = "escalated";
      next.ticket = next.ticket ? { ...next.ticket, escalatedTo: "duty manager", approvalReason: next.ticket.approvalReason ?? "Still not fixed after the hotel was told." } : null;
      say("Sorry it's still not fixed. I've escalated to the hotel's duty manager and to your stay desk. A person will call you within 15 minutes.");
      next.chips = ["It's fixed now", "Talk to a person"];
      return next;
    }
    case "rating": {
      const rating = Number(lower.match(/[1-5]/)?.[0] ?? NaN);
      next.rating = Number.isNaN(rating) ? null : rating;
      next.step = "closed";
      next.chips = ["Report another issue"];
      say(
        next.rating !== null && next.rating <= 2
          ? "Thank you for telling me. I've flagged this to your stay desk so they can follow up with the hotel. The case is closed."
          : "Thank you. The case is closed. Enjoy the rest of your stay.",
      );
      return next;
    }
    case "closed":
      next.chips = ["Report another issue"];
      say("I'm here if anything else comes up during your stay.");
      return next;
  }
}

function askNext(next: CareState, say: (text: string, ticket?: CareTicket) => void): CareState {
  const { brief } = next;
  if (!brief.hotel || !brief.room) {
    next.step = "where";
    next.chips = [`${DEMO_STAY}, room ${DEMO_ROOM}`];
    say(brief.hotel ? "Which room are you in?" : brief.room ? "Which hotel are you staying at?" : "Which hotel and room are you in?");
    return next;
  }
  if (brief.category !== "safety" && !brief.frontDesk) {
    next.step = "front_desk";
    next.chips = ["Not yet", "Yes, nothing has happened", "Yes, over an hour ago"];
    say("Have you told the hotel's front desk yet?");
    return next;
  }
  if (brief.category !== "safety" && !brief.ask) {
    next.step = "ask";
    next.chips =
      brief.category === "billing"
        ? ["Correct the bill", "Explain the charge", "Talk to a person"]
        : ["Fix it in my room", "Move me to another room", "Just log it", "Talk to a person"];
    say("What would help most right now?");
    return next;
  }

  next.ticket = buildTicket(brief);
  next.status = "open";
  next.step = "followup";
  next.chips = FOLLOWUP_CHIPS;
  const whyDutyManager =
    brief.category === "safety" ? " because it's a safety issue" : brief.frontDesk === "told_long_ago" ? " because the front desk has already had it for over an hour" : "";
  say(`Logged as ${next.ticket.code}. Hotel Liaison has written to the hotel's ${next.ticket.escalatedTo}${whyDutyManager}.`, next.ticket);
  if (next.ticket.approvalReason && brief.category !== "safety") {
    say(`${next.ticket.approvalReason} I'll tell you as soon as they decide.`);
  }
  say(
    brief.category === "safety"
      ? "Stay where you feel safe. A person from your stay desk is calling you now."
      : brief.category === "billing"
        ? "Hotel Liaison asks the hotel to correct or explain the charge before you check out. Tell me here if anything changes."
        : `I'll check back with you within ${next.ticket.respondWithin.toLowerCase()}. Tell me here if anything changes.`,
  );
  return next;
}

export function buildTicket(brief: IssueBrief): CareTicket {
  const category = brief.category ?? "other";
  const clock = RESPONSE_CLOCK[category];
  const longAgo = brief.frontDesk === "told_long_ago";
  const urgency: IssueUrgency = longAgo && clock.urgency === "medium" ? "high" : clock.urgency;
  const escalatedTo = category === "safety" || longAgo ? "duty manager" : "front desk";

  const approvalReason =
    category === "safety"
      ? "Safety goes straight to a person on your stay desk."
      : brief.ask === "room_move"
        ? "A room move needs a free room at the hotel and your stay desk's approval."
        : brief.ask === "credit"
          ? "A refund or credit is decided by your stay desk with the hotel."
          : brief.ask === "callback"
            ? "You asked for a person, so your stay desk will call you."
            : null;

  const code = ticketCode(brief);
  const hotelNote = [
    `To: ${escalatedTo === "duty manager" ? "Duty manager" : "Front desk"}, ${brief.hotel ?? "the hotel"}`,
    `Case ${code} · ${CATEGORY_LABELS[category]} · ${URGENCY_LABELS[urgency]} urgency`,
    `Guest in room ${brief.room ?? "unknown"} reports: "${brief.text ?? ""}"`,
    `Front desk already told: ${brief.frontDesk ? FRONT_DESK_LABELS[brief.frontDesk] : "Not asked (safety)"}`,
    `Guest asks: ${brief.ask ? ASK_LABELS[brief.ask] : "A person to call now"}`,
    `Please reply with an ETA within ${clock.within.toLowerCase()}.`,
    "From: Corporate travel desk",
  ].join("\n");

  return { code, category, urgency, respondWithin: clock.within, escalatedTo, approvalReason, hotelNote };
}

function categorise(lower: string): IssueCategory {
  return CATEGORY_PATTERNS.find(([, pattern]) => pattern.test(lower))?.[0] ?? "other";
}

function absorbWhere(brief: IssueBrief, text: string) {
  const room = text.match(/room\s*(?:no\.?|number)?\s*(\d{2,5})/i)?.[1] ?? null;
  if (room && !brief.room) {
    brief.room = room;
  }
  const hotel = text.match(/((?:[A-Z][\w&'-]*\s)*(?:Hotel|Inn|Suites|Resort|Residency)(?:\s[A-Z][\w&'-]*)*)/)?.[1];
  if (hotel && !brief.hotel) {
    brief.hotel = hotel.trim();
  }
}

function parseAsk(lower: string): GuestAsk {
  if (/move|another room|change (the |my )?room|shift/.test(lower)) return "room_move";
  if (/refund|credit|compensat|discount|free night|money back|waive/.test(lower)) return "credit";
  if (/person|human|call me|manager|talk/.test(lower)) return "callback";
  if (/just log|log it|note it|nothing/.test(lower)) return "log";
  return "fix";
}

function ticketCode(brief: IssueBrief): string {
  if (brief.room === DEMO_ROOM && brief.category === "room") {
    return GOLDEN_TICKET;
  }
  const key = `${brief.category}-${brief.hotel}-${brief.room}-${brief.text}`;
  let hash = 0;
  for (const character of key) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `HT-C-${3200 + (hash % 6000)}`;
}

/** The HT-C-3107 golden path as guest turns, for the demo replay button. */
export const GOLDEN_CARE_TURNS = [
  "The AC in my room is not working and it's really hot",
  `${DEMO_STAY}, room ${DEMO_ROOM}`,
  "Yes, over an hour ago",
  "Move me to another room",
];
