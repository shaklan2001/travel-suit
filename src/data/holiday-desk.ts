import { destinationById, INTERNATIONAL_EXTRAS, STYLE_LABELS, STYLE_MULTIPLIER, type Destination, type TravelStyle } from "./destinations";
import { buildPlan, MONTHS, type TripBrief, type TripPlan } from "./trip-planner";

/**
 * Quote desk: leads from the website widget, the flight and stay options for each,
 * and the pricing an expert applies before a quote goes out.
 */

export type LeadStatus = "new" | "quoting" | "quoted" | "follow_up" | "booked";
export type LeadChannel = "website" | "whatsapp" | "app";

export interface HolidayLead {
  code: string;
  names: string;
  phone: string;
  channel: LeadChannel;
  received: string;
  status: LeadStatus;
  brief: TripBrief;
  /** What the traveller said in their own words, from the chat. */
  ask: string;
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  quoting: "Quoting",
  quoted: "Quote sent",
  follow_up: "Follow-up",
  booked: "Booked",
};

export const CHANNEL_LABELS: Record<LeadChannel, string> = {
  website: "Website widget",
  whatsapp: "WhatsApp",
  app: "App",
};

const brief = (partial: Partial<TripBrief> & Pick<TripBrief, "destinationId">): TripBrief => ({
  travellers: null,
  pax: 2,
  origin: "Mumbai",
  month: null,
  days: 6,
  style: "comfort",
  scope: null,
  interest: null,
  ...partial,
});

export const HOLIDAY_LEADS: HolidayLead[] = [
  {
    code: "HL-2611",
    names: "Rahul & Priya Mehta",
    phone: "+91 98•••• 4521",
    channel: "website",
    received: "12 min ago",
    status: "new",
    ask: "Honeymoon in Bali for 6 days in November. Comfortable, not too fancy. Add forex.",
    brief: brief({ travellers: "couple", pax: 2, origin: "Mumbai", month: 11, days: 6, style: "comfort", scope: "international", interest: "beaches", destinationId: "bali" }),
  },
  {
    code: "HL-2619",
    names: "Ananya & Karan Rao",
    phone: "+91 99•••• 1180",
    channel: "website",
    received: "38 min ago",
    status: "new",
    ask: "Switzerland in May for our 10th anniversary. Mountains, trains, and a nice hotel.",
    brief: brief({ travellers: "couple", pax: 2, origin: "Delhi", month: 5, days: 8, style: "luxury", scope: "international", interest: "mountains", destinationId: "switzerland" }),
  },
  {
    code: "HL-2615",
    names: "The Kulkarni family",
    phone: "+91 97•••• 7342",
    channel: "whatsapp",
    received: "1 h ago",
    status: "quoting",
    ask: "Dubai with two kids over the January holidays. Theme parks and the desert safari.",
    brief: brief({ travellers: "family", pax: 4, origin: "Pune", month: 1, days: 5, style: "luxury", scope: "international", interest: "city", destinationId: "dubai" }),
  },
  {
    code: "HL-2598",
    names: "The Sharma family",
    phone: "+91 98•••• 0093",
    channel: "website",
    received: "Yesterday",
    status: "quoted",
    ask: "Kerala for nine days in December with my parents. Houseboat for sure.",
    brief: brief({ travellers: "family", pax: 4, origin: "Delhi", month: 12, days: 9, style: "comfort", scope: "india", interest: "nature", destinationId: "kerala" }),
  },
  {
    code: "HL-2604",
    names: "Vikram + 3 friends",
    phone: "+91 90•••• 6614",
    channel: "app",
    received: "2 days ago",
    status: "follow_up",
    ask: "Phuket and Krabi with friends in March. Beaches and nightlife on a budget.",
    brief: brief({ travellers: "friends", pax: 4, origin: "Bengaluru", month: 3, days: 7, style: "budget", scope: "international", interest: "beaches", destinationId: "thailand" }),
  },
  {
    code: "HL-2590",
    names: "Neha & Arjun Iyer",
    phone: "+91 96•••• 2257",
    channel: "website",
    received: "4 days ago",
    status: "booked",
    ask: "Maldives water villa for five nights in February.",
    brief: brief({ travellers: "couple", pax: 2, origin: "Hyderabad", month: 2, days: 5, style: "luxury", scope: "international", interest: "beaches", destinationId: "maldives" }),
  },
];

export function leadByCode(code: string | null | undefined): HolidayLead | null {
  return HOLIDAY_LEADS.find((lead) => lead.code === code) ?? null;
}

export function leadTitle(lead: HolidayLead): string {
  const destination = destinationById(lead.brief.destinationId ?? "");
  const month = lead.brief.month ? MONTHS[lead.brief.month - 1].slice(0, 3) : "Flexible";
  return `${destination?.name ?? "Holiday"} · ${lead.brief.days} days · ${month}`;
}

/* ───────── flights ───────── */

export interface FlightOption {
  id: string;
  airline: string;
  flightNo: string;
  depart: string;
  arrive: string;
  duration: string;
  stops: number;
  via: string | null;
  /** Return fare per person. */
  fare: number;
  baggage: string;
  tag: "Cheapest" | "Fastest" | "Best value" | null;
}

const AIRLINES: Record<string, [string, string][]> = {
  domestic: [["IndiGo", "6E"], ["Air India", "AI"], ["Akasa Air", "QP"]],
  bali: [["Singapore Airlines", "SQ"], ["IndiGo", "6E"], ["Malaysia Airlines", "MH"]],
  dubai: [["Emirates", "EK"], ["IndiGo", "6E"], ["Air India", "AI"]],
  thailand: [["Thai Airways", "TG"], ["IndiGo", "6E"], ["AirAsia", "FD"]],
  singapore: [["Singapore Airlines", "SQ"], ["IndiGo", "6E"], ["Air India", "AI"]],
  switzerland: [["Swiss", "LX"], ["Emirates", "EK"], ["Air India", "AI"]],
  maldives: [["IndiGo", "6E"], ["Air India", "AI"], ["SriLankan", "UL"]],
  vietnam: [["VietJet", "VJ"], ["IndiGo", "6E"], ["Singapore Airlines", "SQ"]],
};

const HUBS: Record<string, string> = { bali: "Singapore", switzerland: "Dubai", maldives: "Colombo", vietnam: "Singapore", thailand: "Bangkok" };

/** Direct block time in hours from an Indian metro. */
const BLOCK_HOURS: Record<string, number> = {
  kashmir: 3, kerala: 2.2, goa: 1.3, rajasthan: 1.8, himachal: 2.4, andaman: 3,
  bali: 8.5, dubai: 3.3, thailand: 4.3, singapore: 5.5, switzerland: 9.5, maldives: 3.3, vietnam: 5.5,
};

function seed(text: string): number {
  let hash = 0;
  for (const character of text) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

function clock(minutes: number): string {
  const day = Math.floor(minutes / 1440);
  const m = ((minutes % 1440) + 1440) % 1440;
  const label = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return day > 0 ? `${label} +${day}` : label;
}

function roundFare(value: number): number {
  return Math.round(value / 100) * 100;
}

export function flightOptions(lead: HolidayLead): FlightOption[] {
  const destination = destinationById(lead.brief.destinationId ?? "");
  if (!destination) return [];
  const carriers = AIRLINES[destination.id] ?? AIRLINES.domestic;
  const block = BLOCK_HOURS[destination.id] ?? 3;
  const [low, high] = destination.cost.flight;
  const base = seed(lead.code);
  const hub = HUBS[destination.id] ?? "Delhi";

  const shapes = [
    { stops: destination.region === "international" && block > 6 ? 1 : 0, extra: block > 6 ? 2.5 : 0, fare: low + (high - low) * 0.45, departAt: 9 * 60 + 35 },
    { stops: 1, extra: 4.2, fare: low * 1.02, departAt: 22 * 60 + 50 },
    { stops: 0, extra: 0, fare: low + (high - low) * 0.8, departAt: 6 * 60 + 10 },
  ];

  const options = shapes.map((shape, index) => {
    const [airline, code] = carriers[index % carriers.length];
    const minutes = Math.round((block + shape.extra) * 60);
    const depart = shape.departAt + ((base >> index) % 4) * 15;
    return {
      id: `${lead.code}-F${index + 1}`,
      airline,
      flightNo: `${code} ${100 + ((base >> (index * 3)) % 800)}`,
      depart: clock(depart),
      arrive: clock(depart + minutes),
      duration: `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`,
      stops: shape.stops,
      via: shape.stops > 0 ? hub : null,
      fare: roundFare(shape.fare),
      baggage: destination.region === "international" ? "30 kg + 7 kg cabin" : "15 kg + 7 kg cabin",
      tag: null as FlightOption["tag"],
      minutes,
    };
  });

  const cheapest = options.reduce((best, option) => (option.fare < best.fare ? option : best));
  const fastest = options.reduce((best, option) => (option.minutes < best.minutes ? option : best));
  cheapest.tag = "Cheapest";
  if (fastest !== cheapest) fastest.tag = "Fastest";
  const rest = options.find((option) => option.tag === null);
  if (rest) rest.tag = "Best value";
  return options.map(({ minutes: _minutes, ...option }) => option);
}

/* ───────── stays ───────── */

export interface StayOption {
  id: string;
  name: string;
  area: string;
  stars: number;
  rating: number;
  board: string;
  /** Per room per night. */
  rate: number;
  reason: string;
  style: TravelStyle;
}

const AREAS: Record<string, [string, string][]> = {
  kashmir: [["Dal Lake, Srinagar", "Lakeside"], ["Gulmarg", "Meadow"], ["Pahalgam", "Riverside"]],
  kerala: [["Munnar", "Tea Hills"], ["Alleppey", "Backwater"], ["Fort Kochi", "Heritage"]],
  goa: [["Candolim", "Beach"], ["South Goa", "Palm Grove"], ["Panjim", "Old Quarter"]],
  rajasthan: [["Udaipur", "Lake Palace"], ["Jaipur", "Haveli"], ["Jodhpur", "Fort View"]],
  himachal: [["Old Manali", "Pine"], ["Shimla", "Ridge"], ["Dharamshala", "Valley"]],
  andaman: [["Havelock Island", "Beach"], ["Neil Island", "Coral"], ["Port Blair", "Harbour"]],
  bali: [["Seminyak", "Beach"], ["Ubud", "Rainforest"], ["Nusa Dua", "Lagoon"]],
  dubai: [["Downtown", "Skyline"], ["Dubai Marina", "Marina"], ["Jumeirah Beach", "Beach"]],
  thailand: [["Patong, Phuket", "Beach"], ["Ao Nang, Krabi", "Cliffside"], ["Sukhumvit, Bangkok", "City"]],
  singapore: [["Marina Bay", "Bayfront"], ["Orchard Road", "City"], ["Sentosa", "Island"]],
  switzerland: [["Lucerne", "Lakeside"], ["Interlaken", "Alpine"], ["Zermatt", "Chalet"]],
  maldives: [["Baa Atoll", "Water Villa"], ["South Ari Atoll", "Reef"], ["North Malé Atoll", "Island"]],
  vietnam: [["Hoi An", "Riverside"], ["Hanoi Old Quarter", "Heritage"], ["Ha Long Bay", "Bay"]],
};

const TIER_WORDS: Record<TravelStyle, string[]> = {
  budget: ["Inn", "Stay", "Residency"],
  comfort: ["Resort", "Boutique Hotel", "Suites"],
  luxury: ["Resort & Spa", "Grand Retreat", "Private Villas"],
};
const STARS: Record<TravelStyle, number> = { budget: 3, comfort: 4, luxury: 5 };

export function stayOptions(lead: HolidayLead): StayOption[] {
  const destination = destinationById(lead.brief.destinationId ?? "");
  if (!destination) return [];
  const style = lead.brief.style ?? "comfort";
  const areas = AREAS[destination.id] ?? [[destination.gateway, "City"]];
  const base = seed(lead.code + "stay");
  const factors = [1, 0.86, 1.22];
  const boards = ["Breakfast", "Breakfast", "Half board"];
  const reasons = [
    `Best fit for a ${lead.brief.travellers ?? "group"} trip in ${areas[0][0].split(",")[0]}`,
    "Lowest rate for the same star class",
    "Upgrade: bigger room and dinner included",
  ];

  return factors.map((factor, index) => {
    const [area, theme] = areas[index % areas.length];
    return {
      id: `${lead.code}-H${index + 1}`,
      name: `${theme} ${TIER_WORDS[style][index]}`,
      area,
      stars: index === 2 && style !== "luxury" ? STARS[style] + 1 : STARS[style],
      rating: Math.round((4.2 + ((base >> index) % 6) / 10) * 10) / 10,
      board: boards[index],
      rate: Math.round((destination.cost.stay[style] * factor) / 100) * 100,
      reason: reasons[index],
      style,
    };
  });
}

/* ───────── pricing ───────── */

export interface QuoteChoices {
  flightId: string;
  stayId: string;
  sightseeing: boolean;
  visa: boolean;
  insurance: boolean;
  forex: boolean;
  markupPct: number;
}

export interface QuoteLine {
  label: string;
  detail: string;
  cost: number;
}

export interface PricedQuote {
  lines: QuoteLine[];
  cost: number;
  markup: number;
  subtotal: number;
  gst: number;
  total: number;
  perPerson: number;
  marginPct: number;
  flight: FlightOption | null;
  stay: StayOption | null;
}

/** GST on a holiday package in India, charged on the package value. */
export const PACKAGE_GST = 0.05;
export const QUOTE_VALID_DAYS = 3;
const INSURANCE_PER_PAX = 1200;

export function defaultChoices(lead: HolidayLead): QuoteChoices {
  const flights = flightOptions(lead);
  const stays = stayOptions(lead);
  const international = destinationById(lead.brief.destinationId ?? "")?.region === "international";
  return {
    flightId: flights.find((flight) => flight.tag === "Best value")?.id ?? flights[0]?.id ?? "",
    stayId: stays[0]?.id ?? "",
    sightseeing: true,
    visa: international,
    insurance: international,
    forex: international,
    markupPct: 12,
  };
}

export function priceQuote(lead: HolidayLead, choices: QuoteChoices): PricedQuote {
  const destination = destinationById(lead.brief.destinationId ?? "") as Destination;
  const pax = lead.brief.pax ?? 2;
  const days = lead.brief.days ?? 6;
  const nights = Math.max(days - 1, 1);
  const rooms = Math.ceil(pax / 2);
  const style = lead.brief.style ?? "comfort";
  const flight = flightOptions(lead).find((option) => option.id === choices.flightId) ?? null;
  const stay = stayOptions(lead).find((option) => option.id === choices.stayId) ?? null;

  const lines: QuoteLine[] = [];
  if (flight) lines.push({ label: "Return flights", detail: `${flight.airline} · ${pax} × ${inr(flight.fare)}`, cost: flight.fare * pax });
  if (stay) lines.push({ label: "Stay", detail: `${stay.name}, ${stay.area} · ${nights} nights × ${rooms} room${rooms > 1 ? "s" : ""}`, cost: stay.rate * nights * rooms });
  if (choices.sightseeing) {
    lines.push({
      label: "Transfers and sightseeing",
      detail: `Private transfers and the plan's day tours · ${STYLE_LABELS[style]}`,
      cost: Math.round((pax * days * destination.cost.local * STYLE_MULTIPLIER[style]) / 100) * 100,
    });
  }
  if (choices.visa && destination.region === "international") {
    lines.push({ label: "Visa assistance", detail: `${pax} traveller${pax > 1 ? "s" : ""}, fees included`, cost: pax * INTERNATIONAL_EXTRAS[0] });
  }
  if (choices.insurance) lines.push({ label: "Travel insurance", detail: `${pax} × ${inr(INSURANCE_PER_PAX)}`, cost: pax * INSURANCE_PER_PAX });

  const cost = lines.reduce((sum, line) => sum + line.cost, 0);
  const markup = Math.round((cost * choices.markupPct) / 100 / 100) * 100;
  const subtotal = cost + markup;
  const gst = Math.round((subtotal * PACKAGE_GST) / 10) * 10;
  const total = subtotal + gst;
  return {
    lines,
    cost,
    markup,
    subtotal,
    gst,
    total,
    perPerson: Math.round(total / pax / 10) * 10,
    marginPct: subtotal ? markup / subtotal : 0,
    flight,
    stay,
  };
}

export function leadPlan(lead: HolidayLead): TripPlan {
  return buildPlan(lead.brief);
}

export function inr(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** Encodes the expert's choices so the documents studio can open the same quote. */
export function choicesToQuery(lead: HolidayLead, choices: QuoteChoices): string {
  const params = new URLSearchParams({
    lead: lead.code,
    f: choices.flightId,
    h: choices.stayId,
    m: String(choices.markupPct),
    o: [choices.sightseeing ? "s" : "", choices.visa ? "v" : "", choices.insurance ? "i" : "", choices.forex ? "x" : ""].join(""),
  });
  return params.toString();
}

export function choicesFromQuery(lead: HolidayLead, params: URLSearchParams): QuoteChoices {
  const fallback = defaultChoices(lead);
  const options = params.get("o");
  const markup = Number(params.get("m"));
  return {
    flightId: params.get("f") || fallback.flightId,
    stayId: params.get("h") || fallback.stayId,
    sightseeing: options ? options.includes("s") : fallback.sightseeing,
    visa: options ? options.includes("v") : fallback.visa,
    insurance: options ? options.includes("i") : fallback.insurance,
    forex: options ? options.includes("x") : fallback.forex,
    markupPct: Number.isFinite(markup) && params.get("m") ? markup : fallback.markupPct,
  };
}
