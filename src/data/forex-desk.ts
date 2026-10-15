import { FOREX_RULES } from "./forex-rules";

/**
 * Forex lead desk: each enquiry with what the customer asked, what the agents captured,
 * the live quote, and where it sits in the journey from enquiry to branch KYC.
 */

export type ForexStage = "answered" | "need" | "quoted" | "advance" | "branch" | "done";
export type ForexChannel = "Call" | "WhatsApp" | "Web form";

export const STAGE_LABELS: Record<ForexStage, string> = {
  answered: "Answered by the bot",
  need: "Need captured",
  quoted: "Quote sent",
  advance: "Advance paid",
  branch: "Branch visit booked",
  done: "Handed over",
};

export const JOURNEY: { stage: ForexStage | "enquiry"; label: string; agent: string }[] = [
  { stage: "enquiry", label: "Enquiry", agent: "Forex Desk" },
  { stage: "need", label: "Need captured", agent: "Ravi" },
  { stage: "quoted", label: "Live quote", agent: "Rate Desk" },
  { stage: "advance", label: "Advance", agent: "Ravi" },
  { stage: "branch", label: "Branch KYC", agent: "Branch Handoff" },
  { stage: "done", label: "Handed over", agent: "Branch counter" },
];

const STAGE_ORDER: ForexStage[] = ["answered", "need", "quoted", "advance", "branch", "done"];
export function stageIndex(stage: ForexStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export interface ChatLine {
  from: "customer" | "bot" | "ravi";
  text: string;
}

export interface ForexLead {
  code: string;
  name: string;
  phone: string;
  channel: ForexChannel;
  received: string;
  stage: ForexStage;
  product: "Buy" | "Reload" | "Remittance" | "Question";
  currency: string;
  amount: number;
  mode: string;
  destination: string;
  travelDate: string | null;
  purpose: string;
  city: string;
  student: boolean;
  /** Amount already sent abroad this financial year, in INR. */
  ytdInr: number;
  ask: string;
  conversation: ChatLine[];
  branch: { name: string; slot: string; documents: string[] } | null;
}

/** Card, cash, and wire sell rates per unit, as the Rate Desk returned them this morning. */
export const LIVE_RATES: Record<string, { card: number; cash: number; wire: number }> = {
  USD: { card: 88.42, cash: 88.95, wire: 88.31 },
  EUR: { card: 103.18, cash: 103.86, wire: 102.97 },
  GBP: { card: 118.64, cash: 119.4, wire: 118.39 },
  CAD: { card: 64.11, cash: 64.58, wire: 63.97 },
};
export const RATE_TIME = "11:42 today";

const DOCS = ["Passport", "PAN card", "Visa or a confirmed ticket"];

export const FOREX_LEADS: ForexLead[] = [
  {
    code: "FX-1880",
    name: "Aditya Menon",
    phone: "+91 98•••• 3310",
    channel: "WhatsApp",
    received: "18 min ago",
    stage: "need",
    product: "Buy",
    currency: "USD",
    amount: 1500,
    mode: "Card",
    destination: "Bangkok",
    travelDate: "19 Oct",
    purpose: "Holiday",
    city: "Mumbai",
    student: false,
    ytdInr: 0,
    ask: "Need a USD forex card for Bangkok, flying on the 19th. What's your rate?",
    conversation: [
      { from: "customer", text: "Need a USD forex card for Bangkok, flying on the 19th. What's your rate?" },
      { from: "bot", text: "Happy to help. A card is safer than cash and works at ATMs in Thailand. Shall I get Ravi to put together a quote?" },
      { from: "customer", text: "Yes please." },
      { from: "ravi", text: "How much would you like to load, and which city will you collect it in?" },
      { from: "customer", text: "1,500 dollars. Mumbai, near Andheri." },
    ],
    branch: null,
  },
  {
    code: "FX-1894",
    name: "Sneha Kapoor",
    phone: "+91 99•••• 7712",
    channel: "Call",
    received: "42 min ago",
    stage: "need",
    product: "Remittance",
    currency: "CAD",
    amount: 18000,
    mode: "Wire transfer",
    destination: "Toronto",
    travelDate: null,
    purpose: "University tuition",
    city: "Pune",
    student: true,
    ytdInr: 650000,
    ask: "I need to pay my daughter's second-semester fees to her university in Toronto.",
    conversation: [
      { from: "customer", text: "I need to pay my daughter's second-semester fees to her university in Toronto." },
      { from: "ravi", text: "Of course. How much is the fee, and have you sent money abroad earlier this financial year?" },
      { from: "customer", text: "18,000 Canadian dollars. We sent about 6.5 lakh in June for the first semester." },
      { from: "ravi", text: "Thank you. Tuition for a student is exempt from TCS, so there is no extra tax on this transfer." },
    ],
    branch: null,
  },
  {
    code: "FX-1897",
    name: "Rohan Desai",
    phone: "+91 97•••• 5508",
    channel: "Web form",
    received: "1 h ago",
    stage: "quoted",
    product: "Buy",
    currency: "EUR",
    amount: 2000,
    mode: "Card + cash",
    destination: "Paris",
    travelDate: "2 Nov",
    purpose: "Holiday",
    city: "Delhi",
    student: false,
    ytdInr: 0,
    ask: "Euros for Paris in November. Some cash for the first day, the rest on a card.",
    conversation: [
      { from: "customer", text: "Euros for Paris in November. Some cash for the first day, the rest on a card." },
      { from: "ravi", text: "I'd suggest €300 in cash and €1,700 on the card. Shall I send you the quote?" },
      { from: "customer", text: "Yes, send it on WhatsApp." },
      { from: "ravi", text: "Sent. If you'd like to lock today's rate, I can share a payment link for a small advance." },
    ],
    branch: null,
  },
  {
    code: "FX-1902",
    name: "Meera Iyer",
    phone: "+91 96•••• 2044",
    channel: "Call",
    received: "Yesterday",
    stage: "advance",
    product: "Buy",
    currency: "GBP",
    amount: 1200,
    mode: "Card",
    destination: "London",
    travelDate: "14 Oct",
    purpose: "Business",
    city: "Mumbai",
    student: false,
    ytdInr: 0,
    ask: "GBP card for a work trip to London next week.",
    conversation: [
      { from: "customer", text: "GBP card for a work trip to London next week." },
      { from: "ravi", text: "Your quote is on WhatsApp. Would you like to lock the rate with an advance?" },
      { from: "customer", text: "Yes, I paid just now." },
      { from: "ravi", text: "Received, thank you. The rate is held for 48 hours. I've booked Andheri for Saturday, 11 am." },
    ],
    branch: { name: "Andheri West branch", slot: "Saturday, 11:00 am", documents: DOCS },
  },
  {
    code: "FX-1905",
    name: "Kabir Shah",
    phone: "+91 90•••• 8861",
    channel: "WhatsApp",
    received: "2 days ago",
    stage: "branch",
    product: "Reload",
    currency: "USD",
    amount: 2500,
    mode: "Card reload",
    destination: "New York",
    travelDate: "22 Oct",
    purpose: "Holiday",
    city: "Mumbai",
    student: false,
    ytdInr: 210000,
    ask: "Reload my existing card with 2,500 USD for New York.",
    conversation: [
      { from: "customer", text: "Reload my existing card with 2,500 USD for New York." },
      { from: "ravi", text: "Done. Your quote is on WhatsApp. Powai branch can do it today at 5 pm. Does that work?" },
      { from: "customer", text: "Perfect." },
    ],
    branch: { name: "Powai branch", slot: "Today, 5:00 pm", documents: ["Passport", "Your existing forex card"] },
  },
  {
    code: "FX-1909",
    name: "Website visitor",
    phone: "—",
    channel: "Web form",
    received: "3 h ago",
    stage: "answered",
    product: "Question",
    currency: "USD",
    amount: 0,
    mode: "—",
    destination: "—",
    travelDate: null,
    purpose: "Documents for a forex card",
    city: "—",
    student: false,
    ytdInr: 0,
    ask: "What documents do I need for a forex card?",
    conversation: [
      { from: "customer", text: "What documents do I need for a forex card?" },
      { from: "bot", text: "Your passport, PAN card, and a visa or confirmed ticket. KYC is done in person at the branch. Would you like a quote?" },
      { from: "customer", text: "Not right now, thanks." },
      { from: "bot", text: "No problem. Message us any time." },
    ],
    branch: null,
  },
];

/* ───────── quote ───────── */

export interface ForexQuote {
  rate: number;
  rateLabel: string;
  inrValue: number;
  gst: number;
  tcs: number;
  tcsNote: string;
  total: number;
  advance: number;
}

/** GST on currency conversion, on the gross INR value, by the standard slabs. */
function conversionGst(value: number): number {
  let taxable: number;
  if (value <= 100000) taxable = Math.max(value * 0.01, 250);
  else if (value <= 1000000) taxable = 1000 + (value - 100000) * 0.005;
  else taxable = Math.min(5500 + (value - 1000000) * 0.001, 60000);
  return Math.round(taxable * 0.18);
}

export function quoteFor(lead: ForexLead): ForexQuote | null {
  const rates = LIVE_RATES[lead.currency];
  if (!rates || lead.amount <= 0) return null;
  const kind = lead.product === "Remittance" ? "wire" : lead.mode.toLowerCase().includes("cash") && !lead.mode.toLowerCase().includes("card") ? "cash" : "card";
  const rate = rates[kind];
  const inrValue = Math.round(lead.amount * rate);
  const gst = conversionGst(inrValue);
  const exempt = lead.student && /tuition|education/i.test(lead.purpose) && FOREX_RULES.tcsStudentsExempt;
  const over = Math.max(lead.ytdInr + inrValue - FOREX_RULES.tcsThresholdInr, 0);
  const tcs = exempt ? 0 : Math.round(Math.min(over, inrValue) * (FOREX_RULES.tcsRatePercent / 100));
  const tcsNote = exempt
    ? "Tuition for a student: exempt"
    : over > 0
      ? `${FOREX_RULES.tcsRatePercent}% on the amount above ${FOREX_RULES.tcsThresholdLabel} this year`
      : `Under ${FOREX_RULES.tcsThresholdLabel} this year: nil`;
  const total = inrValue + gst + tcs;
  return {
    rate,
    rateLabel: `${kind === "wire" ? "Wire" : kind === "cash" ? "Cash" : "Card"} rate · ${RATE_TIME}`,
    inrValue,
    gst,
    tcs,
    tcsNote,
    total,
    advance: Math.max(Math.round((total * 0.1) / 100) * 100, 2000),
  };
}

export function rupees(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function foreign(lead: ForexLead): string {
  const symbol: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CAD: "C$" };
  return `${symbol[lead.currency] ?? ""}${lead.amount.toLocaleString("en-IN")}`;
}
