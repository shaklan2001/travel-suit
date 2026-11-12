/**
 * Travel Suite ROI, built from the process KPI book. Each process carries its KPI variables
 * (a, b, c … BL1, T1, E1, C4) and its Pulse and Signal KPIs (P-01 … P-08, S-01 …), with the
 * formulas exactly as the book writes them. Every process's value is P-07 (direct + unlocked),
 * its return is P-08, and the suite's value and return are the sums of those across the plan.
 */

export type VarUnit = "num" | "inr" | "pct" | "hrs" | "min" | "days" | "sec" | "score" | "pts";
export type Source = "client" | "ai" | "bench" | "vib" | "est";
export type KpiFormat = "num" | "inr" | "pct" | "pp" | "hrs" | "min" | "days" | "sec" | "score" | "nps" | "per100" | "per1000" | "pts";
export type KpiGroup = "pulse" | "signal";
/** Which slot a Pulse KPI fills, so the suite views can read across processes with different codes. */
export type KpiRole = "target" | "cost" | "value" | "roi";

export const SOURCE_LABELS: Record<Source, string> = {
  client: "Client system",
  ai: "AI process run",
  bench: "Industry benchmark",
  vib: "Vibrium pricing",
  est: "Estimate",
};

export interface KpiVar {
  /** The code the formulas use: a, b, … BL1, T1, E1, B1, C4. */
  key: string;
  label: string;
  meaning: string;
  source: Source;
  /** Where the number comes from, as the KPI book names it. */
  system: string;
  unit: VarUnit;
  value: number;
  /** A volume or a sum: it scales with the business size and with the process volume slider. */
  scale?: boolean;
}

export type Get = (key: string) => number;
/** KPI values already computed for the process, by code (P-01 …), plus DIRECT and UNLOCKED. */
export type Done = Record<string, number>;

export interface KpiDef {
  code: string;
  group: KpiGroup;
  name: string;
  /** The formula as the KPI book writes it. */
  formula: string;
  meaning: string;
  format: KpiFormat;
  calc: (v: Get, k: Done) => number;
  role?: KpiRole;
  /** A baseline or benchmark this KPI is read against. */
  compare?: { key: string; better: "up" | "down" };
  /** An outcome funnel: its stages, and the benchmark the end-to-end conversion is read against. */
  funnel?: { stages: string[]; labels: string[]; benchmark?: string };
}

export interface ValuePart {
  name: string;
  formula: string;
  meaning: string;
  calc: (v: Get, k: Done) => number;
}

export interface ProcessRoi {
  id: string;
  name: string;
  short: string;
  /** The suite family it belongs to, which sets its colour. */
  family: FamilyId;
  href: string;
  agents: string;
  pitch: string;
  /** The variable the volume slider drives; every `scale` variable moves with it. */
  volume: { key: string; min: number; max: number; step: number };
  variables: KpiVar[];
  kpis: KpiDef[];
  direct: ValuePart;
  unlocked: ValuePart;
}

/* ───────── formatting ───────── */

const ok = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

export const inr = (v: number | null | undefined): string => {
  if (!ok(v)) return "—";
  const sign = v < 0 ? "−" : "";
  const a = Math.abs(v);
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(a).toLocaleString("en-IN")}`;
};
export const pct = (v: number, dp?: number): string => {
  if (!ok(v)) return "—";
  const p = v * 100;
  return `${p < 0 ? "−" : ""}${Math.abs(p).toFixed(dp ?? (Math.abs(p) >= 100 || Math.abs(p) % 1 < 0.05 ? 0 : 1))}%`;
};
export const num = (v: number): string => {
  if (!ok(v)) return "—";
  const sign = v < 0 ? "−" : "";
  const a = Math.abs(v);
  return `${sign}${a < 10 && a % 1 ? a.toFixed(1) : Math.round(a).toLocaleString("en-IN")}`;
};
const one = (v: number): string => (ok(v) ? `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}` : "—");

export function formatKpi(value: number, format: KpiFormat): string {
  if (!ok(value)) return "—";
  switch (format) {
    case "inr":
      return inr(value);
    case "pct":
      return pct(value);
    case "pp":
      return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)} pp`;
    case "hrs":
      return `${one(value)} h`;
    case "min":
      return `${one(value)} min`;
    case "days":
      return `${one(value)} days`;
    case "sec":
      return `${Math.round(value)} s`;
    case "score":
    case "nps":
    case "per100":
    case "per1000":
      return one(value);
    case "pts":
      return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)} pts`;
    default:
      return num(value);
  }
}

export function formatVar(variable: Pick<KpiVar, "unit">, value: number): string {
  switch (variable.unit) {
    case "inr":
      return inr(value);
    case "pct":
      return pct(value);
    case "hrs":
      return `${one(value)} h`;
    case "min":
      return `${one(value)} min`;
    case "days":
      return `${one(value)} days`;
    case "sec":
      return `${Math.round(value)} s`;
    case "score":
      return one(value);
    case "pts":
      return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)} pts`;
    default:
      return num(value);
  }
}

/** Division that reads as "not available" instead of Infinity when the bottom is zero. */
const div = (a: number, b: number): number => (b ? a / b : Number.NaN);
const fin = (v: number): number => (Number.isFinite(v) ? v : 0);

/* ───────── shared variables ───────── */

/** Variables every process formula reads with the same code. C4 (AI investment) is per process. */
export const SHARED_VARS: KpiVar[] = [
  { key: "C5", label: "Human cost per task", meaning: "Fully-loaded cost of a person handling one escalated task.", source: "est", system: "Client ops", unit: "inr", value: 150 },
  { key: "G9", label: "Confidence on unlocked value", meaning: "Share of unlocked value (revenue, leakage, incidents) counted in the return.", source: "est", system: "Vibrium value model", unit: "pct", value: 0.5 },
];

const v_ = (key: string, label: string, meaning: string, source: Source, system: string, unit: VarUnit, value: number, scale = false): KpiVar => ({ key, label, meaning, source, system, unit, value, scale });
const C4 = (value: number): KpiVar => v_("C4", "AI investment per month", "Vibrium fee for the agents on this process.", "vib", "Vibrium commercial", "inr", value);

const P = (code: string, name: string, formula: string, meaning: string, format: KpiFormat, calc: KpiDef["calc"], extra: Partial<KpiDef> = {}): KpiDef => ({ code, group: "pulse", name, formula, meaning, format, calc, ...extra });
const S = (code: string, name: string, formula: string, meaning: string, format: KpiFormat, calc: KpiDef["calc"], extra: Partial<KpiDef> = {}): KpiDef => ({ code, group: "signal", name, formula, meaning, format, calc, ...extra });

const VALUE = P("P-07", "Total value created (direct + unlocked)", "", "", "inr", (_v, k) => k.DIRECT + k.UNLOCKED, { role: "value" });
const valueKpi = (formula: string, meaning: string): KpiDef => ({ ...VALUE, formula, meaning });
const roiKpi = (): KpiDef =>
  P("P-08", "ROI", "([P-07] − C4) ÷ C4", "(Total value created − AI investment) ÷ AI investment", "pct", (v, k) => div(k["P-07"] - v("C4"), v("C4")), { role: "roi" });
const funnelCalc = (stages: string[]) => (v: Get) => div(v(stages[stages.length - 1]), v(stages[0]));

/* ───────── families (colour) ───────── */

export type FamilyId = "corporate" | "assist" | "planner" | "forex" | "audit" | "hotels" | "airlines";

/** Fixed categorical order, validated on the light surface (adjacent CVD ΔE ≥ 9.1). */
export const FAMILIES: { id: FamilyId; name: string; color: string }[] = [
  { id: "corporate", name: "Corporate desk", color: "#2a78d6" },
  { id: "assist", name: "Travel assistance", color: "#eb6834" },
  { id: "planner", name: "Trip planner", color: "#1baf7a" },
  { id: "forex", name: "Forex", color: "#eda100" },
  { id: "audit", name: "Call audits", color: "#e87ba4" },
  { id: "hotels", name: "Hotels", color: "#008300" },
  { id: "airlines", name: "Airlines", color: "#6250d6" },
];
export const familyColor = (id: FamilyId): string => FAMILIES.find((family) => family.id === id)?.color ?? "#7b8a93";

/* ───────── the nine processes ───────── */

export const PROCESSES_ROI: ProcessRoi[] = [
  {
    id: "corporate",
    name: "Corporate Travel Desk Automation",
    short: "Corporate desk",
    family: "corporate",
    href: "/corporate",
    agents: "Intent Router · Policy Guard · Meera · Anika",
    pitch: "Every travel request read, policy-checked, searched, and booked at the lowest logical fare.",
    volume: { key: "a", min: 200, max: 15000, step: 100 },
    variables: [
      v_("a", "Travel requests received", "Requests, changes, and approvals into the desk.", "ai", "Vibrium run log: request.created", "num", 1500, true),
      v_("b", "Requests processed by AI", "Requests in a read and worked by the agents.", "ai", "Vibrium run log", "num", 1440, true),
      v_("c", "Options sent", "Requests where policy-checked options went to the traveller.", "ai", "Vibrium run log: options.sent", "num", 1300, true),
      v_("d", "Bookings", "Bookings completed.", "client", "Client booking tool / GDS", "num", 1050, true),
      v_("e", "Zero-touch bookings", "Bookings in d completed with no human step.", "ai", "Vibrium run log: resolved_by = ai", "num", 760, true),
      v_("f", "Request → booking TAT", "Per booking: booked time − request time (hours), median.", "ai", "Vibrium run log timestamps", "hrs", 3.5),
      v_("g", "Out-of-policy bookings", "Bookings in d outside the client travel policy.", "client", "Client policy engine", "num", 60, true),
      v_("h", "Approved within SLA", "Bookings in d approved within the approval SLA.", "ai", "Vibrium run log: approval timestamps", "num", 940, true),
      v_("i", "Travel spend", "Σ spend on bookings in d.", "client", "Client booking tool / finance", "inr", 31500000, true),
      v_("j", "Spend at lowest logical fare", "Σ lowest logical fare for the same bookings.", "ai", "Vibrium run log + GDS fare search", "inr", 29925000, true),
      v_("k", "Changes handled by AI", "Changes and cancellations completed by AI.", "ai", "Vibrium run log + GDS", "num", 320, true),
      v_("l", "Escalated to desk", "Requests handed to a travel counsellor.", "ai", "Vibrium run log: handoff.created", "num", 180, true),
      v_("m", "Positive traveller ratings", "Post-interaction ratings ≥ 4/5.", "ai", "Vibrium run log: csat.score", "num", 410, true),
      v_("n", "Traveller ratings received", "All post-interaction ratings.", "ai", "Vibrium run log: csat.score", "num", 460, true),
      v_("BL1", "Baseline request → booking TAT", "Median hours before go-live.", "client", "Client desk history", "hrs", 18),
      v_("BL2", "Baseline policy compliance", "In-policy ÷ bookings before go-live.", "client", "Client policy reports", "pct", 0.88),
      v_("BL3", "Baseline fare leakage", "Spend above lowest logical fare ÷ spend before go-live.", "client", "Client travel MIS", "pct", 0.09),
      v_("T1", "Target zero-touch rate", "Target share of bookings with no human step.", "est", "Client travel plan", "pct", 0.8),
      v_("E1", "Manual cost per booking or change", "Desk effort cost per booking or change.", "est", "Client ops", "inr", 600),
      C4(200000),
    ],
    kpis: [
      P("P-01", "Bookings", "d", "Count of bookings", "num", (v) => v("d")),
      P("P-02", "Zero-touch rate", "e ÷ d", "Zero-touch ÷ bookings", "pct", (v) => div(v("e"), v("d"))),
      P("P-03", "Target achievement", "[P-02] ÷ T1", "Zero-touch rate ÷ target", "pct", (v, k) => div(k["P-02"], v("T1")), { role: "target" }),
      P("P-04", "Policy compliance", "1 − g ÷ d", "In-policy ÷ bookings (vs BL2)", "pct", (v) => 1 - div(v("g"), v("d")), { compare: { key: "BL2", better: "up" } }),
      P("P-05", "Fare leakage", "(i − j) ÷ i", "Spend above lowest logical fare ÷ spend", "pct", (v) => div(v("i") - v("j"), v("i")), { compare: { key: "BL3", better: "down" } }),
      P("P-06", "Cost per booking", "(C4 + l × C5) ÷ d", "(AI investment + escalations × human cost per task) ÷ bookings", "inr", (v) => div(v("C4") + v("l") * v("C5"), v("d")), { role: "cost" }),
      valueKpi("(e + k − l) × E1 + (BL3 − [P-05]) × i × G9", "Direct: zero-touch bookings and changes × manual cost. Unlocked: fare leakage reduced × spend × confidence"),
      roiKpi(),
      S("S-01", "Outcome funnel", "a → b → c → d", "Request → processed → options → booked", "pct", funnelCalc(["a", "b", "c", "d"]), {
        funnel: { stages: ["a", "b", "c", "d"], labels: ["Requests", "Processed", "Options", "Booked"] },
      }),
      S("S-02", "Median request → booking TAT", "MEDIAN(f)", "Hours (vs BL1)", "hrs", (v) => v("f"), { compare: { key: "BL1", better: "down" } }),
      S("S-03", "Approval within SLA", "h ÷ d", "Approved within SLA ÷ bookings", "pct", (v) => div(v("h"), v("d"))),
      S("S-04", "Escalation rate", "l ÷ b", "Escalated ÷ processed", "pct", (v) => div(v("l"), v("b"))),
      S("S-05", "Traveller CSAT", "m ÷ n", "Positive ratings ÷ ratings", "pct", (v) => div(v("m"), v("n"))),
      S("S-06", "Changes handled by AI", "k", "Count of changes / cancellations completed", "num", (v) => v("k")),
    ],
    direct: { name: "Desk effort replaced", formula: "(e + k − l) × E1", meaning: "Zero-touch bookings and changes, less escalations, at the manual cost of each.", calc: (v) => (v("e") + v("k") - v("l")) * v("E1") },
    unlocked: { name: "Fare leakage reduced", formula: "(BL3 − [P-05]) × i × G9", meaning: "Leakage brought down from the baseline, on this month's spend, at the confidence you set.", calc: (v, k) => (v("BL3") - k["P-05"]) * v("i") * v("G9") },
  },
  {
    id: "forex",
    name: "Forex Assistance",
    short: "Forex",
    family: "forex",
    href: "/forex",
    agents: "Forex Desk · Ravi · Rate Desk · Branch Handoff",
    pitch: "Every forex enquiry answered in minutes, quoted from the live rate, and taken through branch KYC.",
    volume: { key: "a", min: 500, max: 60000, step: 500 },
    variables: [
      v_("a", "Forex enquiries", "Enquiries to buy, reload, or send money (calls, WhatsApp, web).", "ai", "Vibrium run log: conversation.created", "num", 10000, true),
      v_("b", "Enquiries engaged", "Enquiries in a where the need was captured.", "ai", "Vibrium run log: conversation.engaged", "num", 6200, true),
      v_("c", "Quotes given", "Engaged enquiries quoted from the live rate.", "ai", "Vibrium run log: quote.sent", "num", 3400, true),
      v_("d", "Orders", "Forex orders placed.", "client", "Client forex order system", "num", 1450, true),
      v_("e", "Forex value sold", "Σ INR value of orders in d.", "client", "Client forex order system", "inr", 110200000, true),
      v_("f", "Forex margin earned", "Σ margin on orders in d.", "client", "Client finance", "inr", 1267300, true),
      v_("g", "Documents right first time", "Orders in d with complete KYC documents at the first visit.", "client", "Client branch KYC records", "num", 1190, true),
      v_("h", "Delivered or loaded on time", "Orders in d delivered or card-loaded on the promised date.", "client", "Client fulfilment", "num", 1330, true),
      v_("j", "Abandoned enquiries recovered", "Enquiries in k that came back and ordered after a follow-up.", "ai", "Vibrium run log: recovery.converted", "num", 520, true),
      v_("k", "Abandoned enquiries", "Enquiries that dropped before an order.", "ai", "Vibrium run log: conversation.abandoned", "num", 2600, true),
      v_("l", "Enquiry → order TAT", "Per order: order time − enquiry time (hours), median.", "ai", "Vibrium run log timestamps", "hrs", 6),
      v_("m", "Escalated to forex desk", "Enquiries handed to a person.", "ai", "Vibrium run log: handoff.created", "num", 640, true),
      v_("n", "Compliance rejections", "Orders in d rejected on compliance (LRS, TCS, KYC).", "client", "Client compliance", "num", 35, true),
      v_("BL1", "Baseline enquiry → order", "Orders ÷ enquiries before go-live.", "client", "Client CRM history", "pct", 0.09),
      v_("B1", "Funnel benchmark", "Benchmark enquiry → order conversion.", "bench", "Vibrium cross-client benchmark (anonymised)", "pct", 0.12),
      v_("T1", "Forex value target", "Target forex value sold in the period.", "est", "Client business plan", "inr", 100000000, true),
      v_("E1", "Desk effort per order", "Forex desk effort cost per order handled.", "est", "Client ops", "inr", 350),
      C4(150000),
    ],
    kpis: [
      P("P-01", "Forex value sold", "e", "Σ INR value", "inr", (v) => v("e")),
      P("P-02", "Forex margin earned", "f", "Σ margin", "inr", (v) => v("f")),
      P("P-03", "Target achievement", "e ÷ T1", "Forex value ÷ target", "pct", (v) => div(v("e"), v("T1")), { role: "target" }),
      P("P-04", "Enquiry → order", "d ÷ a", "Orders ÷ enquiries", "pct", (v) => div(v("d"), v("a")), { compare: { key: "BL1", better: "up" } }),
      P("P-05", "Uplift vs baseline", "((d ÷ a) − BL1) × 100", "Conversion − baseline, in pp", "pp", (v) => (div(v("d"), v("a")) - v("BL1")) * 100),
      P("P-06", "Cost per order", "(C4 + m × C5) ÷ d", "(AI investment + escalations × human cost per task) ÷ orders", "inr", (v) => div(v("C4") + v("m") * v("C5"), v("d")), { role: "cost" }),
      valueKpi("(d − m) × E1 + (d − a × BL1) × (f ÷ d) × G9", "Direct: forex desk effort saved. Unlocked: incremental orders × margin per order × confidence"),
      roiKpi(),
      S("S-01", "Outcome funnel", "a → b → c → d ; gap vs B1", "Enquiry → engaged → quoted → ordered", "pct", funnelCalc(["a", "b", "c", "d"]), {
        funnel: { stages: ["a", "b", "c", "d"], labels: ["Enquiries", "Engaged", "Quoted", "Ordered"], benchmark: "B1" },
      }),
      S("S-02", "First-time-right documents", "g ÷ d", "Complete first time ÷ orders", "pct", (v) => div(v("g"), v("d"))),
      S("S-03", "Abandoned enquiry recovery", "j ÷ k", "Recovered ÷ abandoned", "pct", (v) => div(v("j"), v("k"))),
      S("S-04", "Median enquiry → order TAT", "MEDIAN(l)", "Hours", "hrs", (v) => v("l")),
      S("S-05", "Compliance rejection rate", "n ÷ d", "Rejected ÷ orders", "pct", (v) => div(v("n"), v("d"))),
      S("S-06", "On-time delivery / load", "h ÷ d", "On time ÷ orders", "pct", (v) => div(v("h"), v("d"))),
      S("S-07", "Escalation rate", "m ÷ b", "Escalated ÷ engaged", "pct", (v) => div(v("m"), v("b"))),
    ],
    direct: { name: "Forex desk effort saved", formula: "(d − m) × E1", meaning: "Orders the agents carried without the desk, at the desk's effort cost per order.", calc: (v) => (v("d") - v("m")) * v("E1") },
    unlocked: {
      name: "Incremental orders",
      formula: "(d − a × BL1) × (f ÷ d) × G9",
      meaning: "Orders above what the baseline conversion would have given, at this month's margin per order.",
      calc: (v) => (v("d") - v("a") * v("BL1")) * div(v("f"), v("d")) * v("G9"),
    },
  },
  {
    id: "prebook",
    name: "Travel Assistance — Prebooking",
    short: "Prebooking",
    family: "assist",
    href: "/planner",
    agents: "Travel Assistant · Holiday Advisor · Quote Builder",
    pitch: "Every holiday lead answered in minutes, qualified, quoted, and handed to an expert when it is ready.",
    volume: { key: "a", min: 200, max: 30000, step: 100 },
    variables: [
      v_("a", "Leads", "Holiday leads received (web, app, WhatsApp, calls).", "client", "Client CRM", "num", 4000, true),
      v_("b", "Leads contacted", "Leads in a reached by the agent.", "ai", "Vibrium run log: lead.contacted", "num", 3400, true),
      v_("c", "Leads qualified", "Contacted leads with destination, dates, pax, and budget captured.", "ai", "Vibrium run log: lead.qualified", "num", 1700, true),
      v_("d", "Quotes sent", "Qualified leads that received a priced quote.", "ai", "Vibrium run log: quote.sent", "num", 900, true),
      v_("f", "Bookings", "Leads in a that booked.", "client", "Client booking system", "num", 230, true),
      v_("g", "Booking value", "Σ value of bookings in f.", "client", "Client booking system", "inr", 36800000, true),
      v_("h", "Booking margin", "Σ margin on bookings in f.", "client", "Client finance", "inr", 3312000, true),
      v_("i", "Lead response time", "Per lead: first response − lead time (minutes), median.", "ai", "Vibrium run log timestamps", "min", 4),
      v_("j", "Handed to expert", "Leads handed to a holiday expert.", "ai", "Vibrium run log: handoff.created", "num", 600, true),
      v_("k", "Booked after handoff", "Leads in j that booked.", "client", "Client booking system", "num", 150, true),
      v_("l", "Bookings with an add-on", "Bookings in f with insurance, visa, forex, or transfers added.", "client", "Client booking system", "num", 95, true),
      v_("BL1", "Baseline lead → booking", "Bookings ÷ leads before go-live.", "client", "Client CRM history", "pct", 0.04),
      v_("BL2", "Baseline lead response time", "Median minutes to first response before go-live.", "client", "Client CRM history", "min", 180),
      v_("B1", "Funnel benchmark", "Benchmark lead → booking conversion.", "bench", "Vibrium cross-client benchmark (anonymised)", "pct", 0.07),
      v_("T1", "Booking value target", "Target booking value in the period.", "est", "Client business plan", "inr", 35000000, true),
      v_("E1", "Lead handling cost", "Sales effort cost per lead handled.", "est", "Client ops", "inr", 120),
      C4(150000),
    ],
    kpis: [
      P("P-01", "Booking value", "g", "Σ booking value", "inr", (v) => v("g")),
      P("P-02", "Booking margin", "h", "Σ margin", "inr", (v) => v("h")),
      P("P-03", "Target achievement", "g ÷ T1", "Booking value ÷ target", "pct", (v) => div(v("g"), v("T1")), { role: "target" }),
      P("P-04", "Lead → booking", "f ÷ a", "Bookings ÷ leads", "pct", (v) => div(v("f"), v("a")), { compare: { key: "BL1", better: "up" } }),
      P("P-05", "Uplift vs baseline", "((f ÷ a) − BL1) × 100", "Conversion − baseline, in pp", "pp", (v) => (div(v("f"), v("a")) - v("BL1")) * 100),
      P("P-06", "Cost per booking", "(C4 + j × C5) ÷ f", "(AI investment + handoffs × human cost per task) ÷ bookings", "inr", (v) => div(v("C4") + v("j") * v("C5"), v("f")), { role: "cost" }),
      valueKpi("(a − j) × E1 + (f − a × BL1) × (h ÷ f) × G9", "Direct: lead handling effort saved. Unlocked: incremental bookings × margin per booking × confidence"),
      roiKpi(),
      S("S-01", "Outcome funnel", "a → b → c → d → f ; gap vs B1", "Lead → contacted → qualified → quoted → booked", "pct", funnelCalc(["a", "b", "c", "d", "f"]), {
        funnel: { stages: ["a", "b", "c", "d", "f"], labels: ["Leads", "Contacted", "Qualified", "Quoted", "Booked"], benchmark: "B1" },
      }),
      S("S-02", "Median lead response time", "MEDIAN(i)", "Minutes (vs BL2)", "min", (v) => v("i"), { compare: { key: "BL2", better: "down" } }),
      S("S-03", "Quote → booking", "f ÷ d", "Bookings ÷ quotes", "pct", (v) => div(v("f"), v("d"))),
      S("S-04", "Add-on attach rate", "l ÷ f", "Bookings with add-on ÷ bookings", "pct", (v) => div(v("l"), v("f"))),
      S("S-05", "Handoff conversion", "k ÷ j", "Booked ÷ handed to expert", "pct", (v) => div(v("k"), v("j"))),
    ],
    direct: { name: "Lead handling effort saved", formula: "(a − j) × E1", meaning: "Leads the agents worked end to end, at the sales effort cost per lead.", calc: (v) => (v("a") - v("j")) * v("E1") },
    unlocked: {
      name: "Incremental bookings",
      formula: "(f − a × BL1) × (h ÷ f) × G9",
      meaning: "Bookings above the baseline conversion, at this month's margin per booking.",
      calc: (v) => (v("f") - v("a") * v("BL1")) * div(v("h"), v("f")) * v("G9"),
    },
  },
  {
    id: "during",
    name: "Travel Assistance — During Travel",
    short: "During travel",
    family: "assist",
    href: "/care",
    agents: "Ravi in-tour calls · Schedule Watch · Stay Care",
    pitch: "Every traveller's question answered on the trip, and every disruption handled before they call.",
    volume: { key: "a", min: 200, max: 30000, step: 100 },
    variables: [
      v_("a", "Travellers on trip", "Travellers with an active trip in the period.", "client", "Client booking system", "num", 3000, true),
      v_("b", "In-trip queries", "Queries / requests raised during the trip.", "ai", "Vibrium run log", "num", 4200, true),
      v_("c", "Resolved by AI", "Queries in b resolved without human intervention.", "ai", "Vibrium run log: resolved_by = ai", "num", 3150, true),
      v_("d", "Escalated to ops", "Queries handed to the operations team.", "ai", "Vibrium run log: handoff.created", "num", 1050, true),
      v_("e", "Disruptions detected", "Flight delays / cancellations / hotel issues affecting travellers.", "ai", "Vibrium run log + GDS / supplier feeds", "num", 260, true),
      v_("f", "Disruptions handled proactively", "Disruptions in e where the traveller was notified and offered options within 30 minutes.", "ai", "Vibrium run log timestamps", "num", 205, true),
      v_("g", "Response time", "Per query: first response − query time (minutes), median.", "ai", "Vibrium run log timestamps", "min", 2),
      v_("h", "Service recovery cost", "Σ compensation / goodwill paid.", "client", "Client finance", "inr", 420000, true),
      v_("i", "In-trip upsell value", "Σ value of excursions / upgrades sold during trip.", "client", "Client booking system", "inr", 960000, true),
      v_("j", "Complaints during trip", "Formal complaints raised during the trip.", "client", "Client CRM", "num", 54, true),
      v_("k", "Positive traveller ratings", "Post-interaction ratings ≥ 4/5.", "ai", "Vibrium run log: csat.score", "num", 1380, true),
      v_("l", "Traveller ratings received", "All post-interaction ratings.", "ai", "Vibrium run log: csat.score", "num", 1560, true),
      v_("BL1", "Baseline complaints per 100 travellers", "Before go-live.", "client", "Client CRM history", "score", 3.1),
      v_("T1", "Target traveller CSAT", "Target positive rating share.", "est", "Client CX plan", "pct", 0.9),
      v_("E1", "Manual cost per query", "Ops effort cost per query.", "est", "Client ops", "inr", 180),
      v_("E2", "Margin on in-trip upsell", "Share of upsell value counted as value.", "est", "Client finance", "pct", 0.15),
      C4(120000),
    ],
    kpis: [
      P("P-01", "Traveller CSAT", "k ÷ l", "Positive ratings ÷ ratings", "pct", (v) => div(v("k"), v("l"))),
      P("P-02", "Target achievement", "[P-01] ÷ T1", "CSAT ÷ target", "pct", (v, k) => div(k["P-01"], v("T1")), { role: "target" }),
      P("P-03", "Complaints per 100 travellers", "j ÷ a × 100", "vs BL1", "per100", (v) => div(v("j"), v("a")) * 100, { compare: { key: "BL1", better: "down" } }),
      P("P-04", "In-trip revenue", "i", "Σ upsell value", "inr", (v) => v("i")),
      P("P-05", "Service recovery cost per traveller", "h ÷ a", "Compensation ÷ travellers", "inr", (v) => div(v("h"), v("a"))),
      P("P-06", "Cost per query resolved", "(C4 + d × C5) ÷ c", "(AI investment + escalations × human cost per task) ÷ resolved", "inr", (v) => div(v("C4") + v("d") * v("C5"), v("c")), { role: "cost" }),
      valueKpi("c × E1 + i × E2 × G9", "Direct: queries resolved × manual cost. Unlocked: in-trip upsell × margin × confidence"),
      roiKpi(),
      S("S-01", "AI resolution rate", "c ÷ b", "Resolved by AI ÷ queries", "pct", (v) => div(v("c"), v("b"))),
      S("S-02", "Proactive disruption handling", "f ÷ e", "Handled within 30 min ÷ disruptions", "pct", (v) => div(v("f"), v("e"))),
      S("S-03", "Median response time", "MEDIAN(g)", "Minutes", "min", (v) => v("g")),
      S("S-04", "Escalation rate", "d ÷ b", "Escalated ÷ queries", "pct", (v) => div(v("d"), v("b"))),
      S("S-05", "Queries per traveller", "b ÷ a", "Queries ÷ travellers", "score", (v) => div(v("b"), v("a"))),
    ],
    direct: { name: "Queries resolved by agents", formula: "c × E1", meaning: "Queries closed without ops, at the manual cost per query.", calc: (v) => v("c") * v("E1") },
    unlocked: { name: "In-trip upsell", formula: "i × E2 × G9", meaning: "Excursions and upgrades sold on the trip, at your margin.", calc: (v) => v("i") * v("E2") * v("G9") },
  },
  {
    id: "post",
    name: "Travel Assistance — Post Travel",
    short: "Post travel",
    family: "assist",
    href: "/care",
    agents: "Ravi completion calls · Feedback & NPS · Refund Tracker",
    pitch: "Every returning traveller asked for feedback, every refund chased, every detractor called back.",
    volume: { key: "a", min: 200, max: 30000, step: 100 },
    variables: [
      v_("a", "Travellers returned", "Travellers who completed a trip in the period.", "client", "Client booking system", "num", 2800, true),
      v_("b", "Feedback collected", "Travellers in a who gave feedback / NPS to AI.", "ai", "Vibrium run log: feedback.captured", "num", 1650, true),
      v_("c", "Promoters", "Feedback scores 9–10.", "ai", "Vibrium run log: nps.score", "num", 990, true),
      v_("d", "Detractors", "Feedback scores 0–6.", "ai", "Vibrium run log: nps.score", "num", 210, true),
      v_("e", "Refunds / claims raised", "Refund or claim requests after travel.", "client", "Client CRM / finance", "num", 140, true),
      v_("f", "Refunds within SLA", "Claims in e processed within SLA.", "client", "Client finance", "num", 126, true),
      v_("g", "Refund TAT", "Per claim: processed date − raised date (days), median.", "client", "Client finance", "days", 5),
      v_("h", "Repeat bookings", "Travellers in i who booked again within 12 months.", "client", "Client booking system", "num", 95, true),
      v_("i", "Travellers nudged", "Travellers in a sent repeat-booking or referral nudges.", "ai", "Vibrium run log: nudge.sent", "num", 2400, true),
      v_("j", "Referrals generated", "Referral leads shared by travellers.", "ai", "Vibrium run log: referral.created", "num", 180, true),
      v_("k", "Referral bookings", "Referrals in j that booked.", "client", "Client booking system", "num", 36, true),
      v_("l", "Repeat and referral booking value", "Σ value of bookings in h and k.", "client", "Client booking system", "inr", 8515000, true),
      v_("m", "Detractors recovered", "Detractors called back within 48h with issue resolved.", "ai", "Vibrium run log", "num", 150, true),
      v_("n", "Escalated to CX team", "Cases handed to a human.", "ai", "Vibrium run log: handoff.created", "num", 120, true),
      v_("BL1", "Baseline repeat rate", "Repeat bookings ÷ travellers before go-live.", "client", "Client booking history", "pct", 0.025),
      v_("T1", "Target NPS", "Target NPS.", "est", "Client CX plan", "score", 45),
      v_("E1", "Booking margin", "Share of booking value counted as value.", "est", "Client finance", "pct", 0.09),
      v_("E2", "Manual cost per feedback / claim", "CX effort cost per case.", "est", "Client ops", "inr", 150),
      C4(100000),
    ],
    kpis: [
      P("P-01", "NPS", "(c − d) ÷ b × 100", "% promoters − % detractors", "nps", (v) => div(v("c") - v("d"), v("b")) * 100),
      P("P-02", "Target achievement", "[P-01] ÷ T1", "NPS ÷ target", "pct", (v, k) => div(k["P-01"], v("T1")), { role: "target" }),
      P("P-03", "Repeat booking rate", "h ÷ i", "Repeat bookers ÷ nudged", "pct", (v) => div(v("h"), v("i")), { compare: { key: "BL1", better: "up" } }),
      P("P-04", "Uplift vs baseline", "([P-03] − BL1) × 100", "Repeat rate − baseline, in pp", "pp", (v, k) => (k["P-03"] - v("BL1")) * 100),
      P("P-05", "Repeat and referral revenue", "l", "Σ value", "inr", (v) => v("l")),
      P("P-06", "Cost per feedback captured", "(C4 + n × C5) ÷ b", "(AI investment + escalations × human cost per task) ÷ feedback", "inr", (v) => div(v("C4") + v("n") * v("C5"), v("b")), { role: "cost" }),
      valueKpi("(b + e − n) × E2 + l × E1 × G9", "Direct: CX effort saved. Unlocked: repeat and referral revenue × margin × confidence"),
      roiKpi(),
      S("S-01", "Feedback capture rate", "b ÷ a", "Feedback ÷ travellers", "pct", (v) => div(v("b"), v("a"))),
      S("S-02", "Refunds within SLA", "f ÷ e", "Within SLA ÷ claims", "pct", (v) => div(v("f"), v("e"))),
      S("S-03", "Median refund TAT", "MEDIAN(g)", "Days", "days", (v) => v("g")),
      S("S-04", "Detractor recovery", "m ÷ d", "Recovered ÷ detractors", "pct", (v) => div(v("m"), v("d"))),
      S("S-05", "Referral conversion", "k ÷ j", "Referral bookings ÷ referrals", "pct", (v) => div(v("k"), v("j"))),
    ],
    direct: { name: "CX effort saved", formula: "(b + e − n) × E2", meaning: "Feedback and claims the agents handled, less escalations, at the CX cost per case.", calc: (v) => (v("b") + v("e") - v("n")) * v("E2") },
    unlocked: { name: "Repeat and referral revenue", formula: "l × E1 × G9", meaning: "Bookings from nudges and referrals, at your booking margin.", calc: (v) => v("l") * v("E1") * v("G9") },
  },
  {
    id: "airlines",
    name: "Airlines — Customer Service / Reservation Support",
    short: "Airlines",
    family: "airlines",
    href: "/reservations",
    agents: "Reservation voice agent · PNR · Schedule Watch · Refund worker",
    pitch: "Calls, chats, and messages contained by the agent: bookings, changes, refunds, and ancillaries.",
    volume: { key: "a", min: 2000, max: 300000, step: 1000 },
    variables: [
      v_("a", "Customer contacts", "Calls / chats / messages received.", "client", "Client contact-centre platform", "num", 40000, true),
      v_("b", "Handled by AI", "Contacts in a handled by the AI agent.", "ai", "Vibrium run log", "num", 30000, true),
      v_("c", "Contained by AI", "Contacts in b resolved without a human agent.", "ai", "Vibrium run log: resolved_by = ai", "num", 21000, true),
      v_("d", "Escalated to agent", "Contacts in b transferred to a human agent.", "ai", "Vibrium run log: handoff.created", "num", 9000, true),
      v_("e", "Bookings made by AI", "New bookings completed by AI.", "client", "Client PSS (passenger service system)", "num", 1200, true),
      v_("f", "Booking value via AI", "Σ fare value of bookings in e.", "client", "Client PSS", "inr", 11400000, true),
      v_("g", "Changes / cancellations processed", "Date changes, cancellations and name corrections completed by AI.", "ai", "Vibrium run log + PSS", "num", 5200, true),
      v_("h", "Refunds initiated", "Refunds initiated by AI.", "ai", "Vibrium run log + PSS", "num", 1800, true),
      v_("i", "Average handle time", "Per AI contact: duration (seconds), average.", "ai", "Vibrium run log", "sec", 210),
      v_("j", "Repeat contacts", "Customers contacting again within 24h on the same issue.", "client", "Client contact-centre platform", "num", 1900, true),
      v_("k", "Positive customer ratings", "Post-interaction ratings ≥ 4/5.", "ai", "Vibrium run log: csat.score", "num", 8900, true),
      v_("l", "Customer ratings received", "All post-interaction ratings.", "ai", "Vibrium run log: csat.score", "num", 10500, true),
      v_("m", "Ancillary value sold", "Σ seat, baggage, meal and upgrade value sold by AI.", "client", "Client PSS", "inr", 1800000, true),
      v_("BL1", "Baseline containment", "IVR / bot containment before go-live.", "client", "Client contact-centre history", "pct", 0.3),
      v_("T1", "Target containment", "Target containment rate.", "est", "Client CX plan", "pct", 0.75),
      v_("E1", "Agent cost per contact", "Fully-loaded agent cost per contact.", "est", "Client contact-centre MIS", "inr", 90),
      v_("E2", "Margin on bookings and ancillaries", "Share of fare / ancillary value counted as value.", "est", "Client finance", "pct", 0.05),
      v_("B1", "Contact-centre benchmark", "Benchmark containment rate.", "bench", "Vibrium cross-client benchmark (anonymised)", "pct", 0.65),
      C4(400000),
    ],
    kpis: [
      P("P-01", "Containment rate", "c ÷ b", "Contained ÷ handled by AI", "pct", (v) => div(v("c"), v("b")), { compare: { key: "B1", better: "up" } }),
      P("P-02", "Target achievement", "[P-01] ÷ T1", "Containment ÷ target", "pct", (v, k) => div(k["P-01"], v("T1")), { role: "target" }),
      P("P-03", "Uplift vs baseline", "([P-01] − BL1) × 100", "Containment − baseline, in pp", "pp", (v, k) => (k["P-01"] - v("BL1")) * 100),
      P("P-04", "Revenue via AI", "f + m", "Booking value + ancillary value", "inr", (v) => v("f") + v("m")),
      P("P-05", "Cost per contact", "(C4 + d × C5) ÷ b", "(AI investment + escalations × human cost per task) ÷ contacts handled", "inr", (v) => div(v("C4") + v("d") * v("C5"), v("b")), { role: "cost" }),
      P("P-06", "Customer CSAT", "k ÷ l", "Positive ratings ÷ ratings", "pct", (v) => div(v("k"), v("l"))),
      valueKpi("c × E1 + (f + m) × E2 × G9", "Direct: contacts contained × agent cost. Unlocked: revenue via AI × margin × confidence"),
      roiKpi(),
      S("S-01", "AI coverage", "b ÷ a", "Handled by AI ÷ contacts", "pct", (v) => div(v("b"), v("a"))),
      S("S-02", "Average handle time", "AVERAGE(i)", "Seconds", "sec", (v) => v("i")),
      S("S-03", "Repeat contact rate", "j ÷ c", "Repeat ÷ contained", "pct", (v) => div(v("j"), v("c"))),
      S("S-04", "Escalation rate", "d ÷ b", "Escalated ÷ handled", "pct", (v) => div(v("d"), v("b"))),
      S("S-05", "Self-service changes", "g", "Count of changes / cancellations by AI", "num", (v) => v("g")),
      S("S-06", "Ancillary value per booking", "m ÷ e", "Ancillary value ÷ AI bookings", "inr", (v) => div(v("m"), v("e"))),
    ],
    direct: { name: "Contacts contained", formula: "c × E1", meaning: "Contacts closed by the agent, at the agent cost per contact.", calc: (v) => v("c") * v("E1") },
    unlocked: { name: "Revenue via AI", formula: "(f + m) × E2 × G9", meaning: "Fares and ancillaries the agent sold, at your margin.", calc: (v) => (v("f") + v("m")) * v("E2") * v("G9") },
  },
  {
    id: "hotels",
    name: "TOFU, Hotel Exploration and Booking",
    short: "Hotels",
    family: "hotels",
    href: "/reservations",
    agents: "Stay Scout · Budget Guard · Booking Handoff",
    pitch: "Discovery conversations that capture the lead, shortlist the stay, and close the booking.",
    volume: { key: "a", min: 1000, max: 100000, step: 500 },
    variables: [
      v_("a", "Conversations started", "Discovery conversations started (web, app, WhatsApp).", "ai", "Vibrium run log: conversation.created", "num", 12000, true),
      v_("b", "Conversations engaged", "Conversations where preferences (destination, dates, budget) were shared.", "ai", "Vibrium run log: conversation.engaged", "num", 7800, true),
      v_("c", "Hotel options shown", "Conversations with hotel options presented.", "ai", "Vibrium run log: options.sent", "num", 6100, true),
      v_("d", "Booking intents", "Conversations where the user selected / held a hotel.", "ai", "Vibrium run log: intent.book", "num", 1250, true),
      v_("e", "Hotel bookings", "Bookings completed.", "client", "Client booking engine", "num", 610, true),
      v_("f", "Room nights", "Σ room nights on bookings in e.", "client", "Client booking engine", "num", 1580, true),
      v_("g", "Booking value", "Σ value of bookings in e.", "client", "Client booking engine", "inr", 12640000, true),
      v_("h", "Booking margin", "Σ commission / margin on bookings in e.", "client", "Client finance", "inr", 1516800, true),
      v_("i", "Leads captured", "Conversations where contact details were captured.", "ai", "Vibrium run log: lead.captured", "num", 3600, true),
      v_("j", "Leads converted later", "Leads in i that booked within 30 days.", "client", "Client CRM / booking engine", "num", 290, true),
      v_("k", "Cancellations", "Bookings in e cancelled.", "client", "Client booking engine", "num", 55, true),
      v_("l", "Escalated to human", "Conversations handed to an agent.", "ai", "Vibrium run log: handoff.created", "num", 700, true),
      v_("BL1", "Baseline visit → booking", "Website / app conversion before go-live.", "client", "Client web analytics", "pct", 0.025),
      v_("T1", "Booking target", "Target bookings.", "est", "Client business plan", "num", 650, true),
      v_("E1", "Cost per lead (paid acquisition)", "Marketing cost to acquire one lead.", "est", "Client marketing", "inr", 120),
      v_("B1", "Funnel benchmark", "Benchmark discovery → booking conversion.", "bench", "Vibrium cross-client benchmark (anonymised)", "pct", 0.04),
      C4(150000),
    ],
    kpis: [
      P("P-01", "Booking value", "g", "Σ booking value", "inr", (v) => v("g")),
      P("P-02", "Booking margin", "h", "Σ margin", "inr", (v) => v("h")),
      P("P-03", "Target achievement", "e ÷ T1", "Bookings ÷ target", "pct", (v) => div(v("e"), v("T1")), { role: "target" }),
      P("P-04", "Conversation → booking", "e ÷ a", "Bookings ÷ conversations", "pct", (v) => div(v("e"), v("a")), { compare: { key: "BL1", better: "up" } }),
      P("P-05", "Uplift vs baseline", "((e ÷ a) − BL1) × 100", "Conversion − baseline, in pp", "pp", (v) => (div(v("e"), v("a")) - v("BL1")) * 100),
      P("P-06", "Cost per booking", "(C4 + l × C5) ÷ e", "(AI investment + escalations × human cost per task) ÷ bookings", "inr", (v) => div(v("C4") + v("l") * v("C5"), v("e")), { role: "cost" }),
      valueKpi("i × E1 + (e − a × BL1) × (h ÷ e) × G9", "Direct: leads captured × acquisition cost. Unlocked: incremental bookings × margin per booking × confidence"),
      roiKpi(),
      S("S-01", "Outcome funnel", "a → b → c → d → e ; gap vs B1", "Started → engaged → options → intent → booked", "pct", funnelCalc(["a", "b", "c", "d", "e"]), {
        funnel: { stages: ["a", "b", "c", "d", "e"], labels: ["Started", "Engaged", "Options", "Intent", "Booked"], benchmark: "B1" },
      }),
      S("S-02", "Lead capture rate", "i ÷ a", "Leads ÷ conversations", "pct", (v) => div(v("i"), v("a"))),
      S("S-03", "Lead conversion", "j ÷ i", "Converted ÷ leads", "pct", (v) => div(v("j"), v("i"))),
      S("S-04", "Room nights per booking", "f ÷ e", "Room nights ÷ bookings", "score", (v) => div(v("f"), v("e"))),
      S("S-05", "Cancellation rate", "k ÷ e", "Cancelled ÷ bookings", "pct", (v) => div(v("k"), v("e"))),
      S("S-06", "Escalation rate", "l ÷ b", "Escalated ÷ engaged", "pct", (v) => div(v("l"), v("b"))),
    ],
    direct: { name: "Leads captured", formula: "i × E1", meaning: "Leads the conversation captured, at what a paid lead would have cost.", calc: (v) => v("i") * v("E1") },
    unlocked: {
      name: "Incremental bookings",
      formula: "(e − a × BL1) × (h ÷ e) × G9",
      meaning: "Bookings above the baseline site conversion, at this month's margin per booking.",
      calc: (v) => (v("e") - v("a") * v("BL1")) * div(v("h"), v("e")) * v("G9"),
    },
  },
  {
    id: "trip",
    name: "Trip Planner",
    short: "Trip planner",
    family: "planner",
    href: "/planner",
    agents: "Destination Matcher · Itinerary Builder · Estimate Engine",
    pitch: "Plans that turn into trips, rides, and purchases, with the community and dealers in the loop.",
    volume: { key: "a", min: 500, max: 80000, step: 500 },
    variables: [
      v_("a", "Users starting a trip plan", "Users who started planning a trip / ride with the agent.", "ai", "Vibrium run log: plan.started", "num", 9000, true),
      v_("b", "Itineraries generated", "Complete itineraries generated.", "ai", "Vibrium run log: itinerary.created", "num", 6800, true),
      v_("c", "Itineraries saved or shared", "Itineraries in b saved, downloaded or shared.", "ai", "Vibrium run log", "num", 3100, true),
      v_("d", "Trips registered / booked", "Itineraries converted into a registered ride or booking (rides, rentals, stays).", "client", "Client booking / community platform", "num", 540, true),
      v_("e", "Revenue influenced", "Σ value of bookings, rentals, gear and accessories linked to planned trips.", "client", "Client commerce / booking system", "inr", 16200000, true),
      v_("f", "Margin on revenue influenced", "Σ margin on e.", "client", "Client finance", "inr", 1296000, true),
      v_("g", "Community members engaged", "Users who joined a ride group / community event from a plan.", "ai", "Vibrium run log + community platform", "num", 1300, true),
      v_("h", "Repeat planners", "Users planning ≥2 trips in the trailing 12 months.", "ai", "Vibrium run log", "num", 1450, true),
      v_("i", "Itineraries edited manually", "Itineraries needing manual correction by the user or team.", "ai", "Vibrium run log: itinerary.edited", "num", 820, true),
      v_("j", "Positive planner ratings", "Post-interaction ratings ≥ 4/5.", "ai", "Vibrium run log: csat.score", "num", 2300, true),
      v_("k", "Planner ratings received", "All post-interaction ratings.", "ai", "Vibrium run log: csat.score", "num", 2700, true),
      v_("m", "Leads passed to dealers", "Planners passed to dealers for test ride / purchase.", "client", "Client CRM / DMS", "num", 400, true),
      v_("n", "Purchases from leads", "Leads in m that purchased a motorcycle.", "client", "Client DMS", "num", 28, true),
      v_("o", "Escalated to human", "Conversations handed off.", "ai", "Vibrium run log: handoff.created", "num", 380, true),
      v_("BL1", "Baseline plan → trip", "Trips ÷ plans before go-live (or non-AI planner).", "client", "Client platform history", "pct", 0.04),
      v_("T1", "Target trips", "Target trips registered / booked.", "est", "Client business plan", "num", 600, true),
      v_("E1", "Manual planning cost per itinerary", "Effort cost of a manually built itinerary.", "est", "Client ops", "inr", 120),
      v_("E2", "Margin per motorcycle sale", "Value counted per motorcycle sold.", "est", "Client finance", "inr", 12000),
      C4(250000),
    ],
    kpis: [
      P("P-01", "Revenue influenced", "e", "Σ revenue linked to planned trips", "inr", (v) => v("e")),
      P("P-02", "Target achievement", "d ÷ T1", "Trips ÷ target", "pct", (v) => div(v("d"), v("T1")), { role: "target" }),
      P("P-03", "Plan → trip", "d ÷ a", "Trips ÷ users starting a plan", "pct", (v) => div(v("d"), v("a")), { compare: { key: "BL1", better: "up" } }),
      P("P-04", "Uplift vs baseline", "((d ÷ a) − BL1) × 100", "Conversion − baseline, in pp", "pp", (v) => (div(v("d"), v("a")) - v("BL1")) * 100),
      P("P-05", "Lead → purchase", "n ÷ m", "Purchases ÷ dealer leads", "pct", (v) => div(v("n"), v("m"))),
      P("P-06", "Cost per trip", "(C4 + o × C5) ÷ d", "(AI investment + escalations × human cost per task) ÷ trips", "inr", (v) => div(v("C4") + v("o") * v("C5"), v("d")), { role: "cost" }),
      valueKpi("b × E1 + (f + n × E2) × G9", "Direct: itineraries generated × manual cost. Unlocked: (trip margin + motorcycle sales × margin) × confidence"),
      roiKpi(),
      S("S-01", "Outcome funnel", "a → b → c → d", "Started → generated → saved / shared → booked", "pct", funnelCalc(["a", "b", "c", "d"]), {
        funnel: { stages: ["a", "b", "c", "d"], labels: ["Started", "Generated", "Saved / shared", "Booked"] },
      }),
      S("S-02", "Save / share rate", "c ÷ b", "Saved or shared ÷ generated", "pct", (v) => div(v("c"), v("b"))),
      S("S-03", "Community engagement", "g ÷ a", "Joined community ÷ planners", "pct", (v) => div(v("g"), v("a"))),
      S("S-04", "Repeat usage", "h ÷ a", "Repeat planners ÷ planners", "pct", (v) => div(v("h"), v("a"))),
      S("S-05", "Planner CSAT", "j ÷ k", "Positive ratings ÷ ratings", "pct", (v) => div(v("j"), v("k"))),
      S("S-06", "Manual edit rate", "i ÷ b", "Edited ÷ generated", "pct", (v) => div(v("i"), v("b"))),
    ],
    direct: { name: "Itineraries generated", formula: "b × E1", meaning: "Complete itineraries the agent built, at the cost of building one by hand.", calc: (v) => v("b") * v("E1") },
    unlocked: { name: "Trip margin and sales", formula: "(f + n × E2) × G9", meaning: "Margin on planned trips plus purchases from dealer leads.", calc: (v) => (v("f") + v("n") * v("E2")) * v("G9") },
  },
  {
    id: "audit",
    name: "Call Audits",
    short: "Call audits",
    family: "audit",
    href: "/audit",
    agents: "Recording Intake · QC Evaluator · Coaching Notes",
    pitch: "Every call scored on your form, not a sample, with breaches caught and coaching from the misses.",
    volume: { key: "a", min: 500, max: 100000, step: 500 },
    variables: [
      v_("a", "Calls in period", "Customer / sales calls handled by human agents.", "client", "Client telephony / contact-centre platform", "num", 8000, true),
      v_("b", "Calls audited by AI", "Calls in a audited by AI.", "ai", "Vibrium run log: audit.completed", "num", 8000, true),
      v_("c", "Calls audited manually", "Calls audited by QA team in the period.", "client", "Client QA records", "num", 160, true),
      v_("d", "Audit score", "Per audited call: quality score (0–100) on the client scorecard, average.", "ai", "Vibrium run log: audit.score", "score", 78),
      v_("e", "Calls with compliance breaches", "Calls in b flagged for breaches (disclosure missed, mis-selling, abusive language).", "ai", "Vibrium run log: audit.breach", "num", 480, true),
      v_("f", "Breaches confirmed by QA", "Flags in e confirmed on QA review.", "client", "Client QA records", "num", 410, true),
      v_("g", "Calls flagged for coaching", "Calls in b flagged as coaching opportunities.", "ai", "Vibrium run log: audit.coaching_flag", "num", 1100, true),
      v_("h", "Agents coached", "Agents receiving coaching from flagged calls.", "client", "Client QA / training records", "num", 85),
      v_("i", "Agents in scope", "Agents whose calls are audited.", "client", "Client HRMS / contact-centre roster", "num", 120),
      v_("j", "Agent score change", "Per coached agent: average score 30 days after − 30 days before coaching.", "ai", "Vibrium run log", "pts", 6),
      v_("k", "Conversions on audited calls", "Audited sales calls that converted.", "client", "Client CRM", "num", 1150, true),
      v_("l", "Customer complaints", "Complaints linked to calls in a.", "client", "Client CRM", "num", 22, true),
      v_("BL1", "Baseline audit coverage", "Manually audited ÷ calls before go-live.", "client", "Client QA history", "pct", 0.02),
      v_("BL2", "Baseline breach rate", "Breaches ÷ audited calls before go-live.", "client", "Client QA history", "pct", 0.09),
      v_("T1", "Target quality score", "Target average audit score.", "est", "Client QA policy", "score", 85),
      v_("E1", "Cost per manual audit", "QA effort cost per manually audited call.", "est", "Client QA ops", "inr", 250),
      v_("E2", "Cost per compliance incident", "Average refund / penalty / remediation cost per breach.", "est", "Client compliance / finance", "inr", 4000),
      C4(80000),
    ],
    kpis: [
      P("P-01", "Audit coverage", "b ÷ a", "Audited by AI ÷ calls (vs BL1)", "pct", (v) => div(v("b"), v("a")), { compare: { key: "BL1", better: "up" } }),
      P("P-02", "Average quality score", "AVERAGE(d)", "Average score on audited calls", "score", (v) => v("d")),
      P("P-03", "Target achievement", "[P-02] ÷ T1", "Average score ÷ target", "pct", (v, k) => div(k["P-02"], v("T1")), { role: "target" }),
      P("P-04", "Breach rate", "e ÷ b", "Breaches ÷ audited calls (vs BL2)", "pct", (v) => div(v("e"), v("b")), { compare: { key: "BL2", better: "down" } }),
      P("P-05", "Complaints per 1,000 calls", "l ÷ a × 1000", "Complaints ÷ calls × 1,000", "per1000", (v) => div(v("l"), v("a")) * 1000),
      P("P-06", "Cost per call audited", "C4 ÷ b", "AI investment ÷ calls audited", "inr", (v) => div(v("C4"), v("b")), { role: "cost" }),
      valueKpi("c × E1 + (BL2 − [P-04]) × a × E2 × G9", "Direct: manual audit effort replaced. Unlocked: breaches avoided × incident cost × confidence"),
      roiKpi(),
      S("S-01", "Breach precision", "f ÷ e", "Confirmed ÷ flagged", "pct", (v) => div(v("f"), v("e"))),
      S("S-02", "Coaching coverage", "h ÷ i", "Agents coached ÷ agents in scope", "pct", (v) => div(v("h"), v("i"))),
      S("S-03", "Score improvement after coaching", "AVERAGE(j)", "Average change in agent score", "pts", (v) => v("j")),
      S("S-04", "Coaching flag rate", "g ÷ b", "Flagged for coaching ÷ audited", "pct", (v) => div(v("g"), v("b"))),
      S("S-05", "Conversion on audited calls", "k ÷ b", "Converted ÷ audited sales calls", "pct", (v) => div(v("k"), v("b"))),
    ],
    direct: { name: "Manual audit effort replaced", formula: "c × E1", meaning: "The manual audits the QA team no longer has to do, at the cost of each.", calc: (v) => v("c") * v("E1") },
    unlocked: {
      name: "Breaches avoided",
      formula: "(BL2 − [P-04]) × a × E2 × G9",
      meaning: "The fall in breach rate from the baseline, across every call, at the cost of an incident.",
      calc: (v, k) => (v("BL2") - k["P-04"]) * v("a") * v("E2") * v("G9"),
    },
  },
];

/* ───────── values ───────── */

export type SuiteValues = Record<string, number>;

const varId = (processId: string, key: string) => `${processId}.${key}`;

export const DEFAULTS: SuiteValues = Object.fromEntries([
  ...SHARED_VARS.map((variable) => [varId("shared", variable.key), variable.value]),
  ...PROCESSES_ROI.flatMap((process) => process.variables.map((variable) => [varId(process.id, variable.key), variable.value])),
]);

export function varById(id: string): KpiVar | null {
  const [scope, key] = id.split(".");
  if (scope === "shared") return SHARED_VARS.find((variable) => variable.key === key) ?? null;
  return PROCESSES_ROI.find((process) => process.id === scope)?.variables.find((variable) => variable.key === key) ?? null;
}

/** Reads a process variable, falling back to the shared ones (C5, G9). */
export function getter(x: SuiteValues, processId: string): Get {
  return (key) => {
    const own = x[varId(processId, key)] ?? DEFAULTS[varId(processId, key)];
    if (own !== undefined) return own;
    return x[varId("shared", key)] ?? DEFAULTS[varId("shared", key)] ?? 0;
  };
}

/* ───────── formula working ───────── */

const TOKEN = /\[P-\d{2}\]|\b(?:BL|T|E|B|C|G)\d+\b|\b[a-o]\b/g;

/** Puts the numbers into a formula: "(C4 + l × C5) ÷ d" → "(₹2.00 L + 180 × ₹150) ÷ 1,050". */
export function working(formula: string, process: ProcessRoi, v: Get, k: Done): string {
  const kpiFormat = (code: string) => process.kpis.find((kpi) => kpi.code === code)?.format ?? "num";
  return formula.replace(TOKEN, (token) => {
    if (token.startsWith("[")) {
      const code = token.slice(1, -1);
      return formatKpi(k[code], kpiFormat(code));
    }
    const variable = process.variables.find((item) => item.key === token) ?? SHARED_VARS.find((item) => item.key === token);
    return variable ? formatVar(variable, v(token)) : token;
  });
}

/* ───────── results ───────── */

export interface KpiResult {
  def: KpiDef;
  value: number;
  working: string;
}

export interface ProcessResult {
  process: ProcessRoi;
  enabled: boolean;
  kpis: KpiResult[];
  get: Get;
  done: Done;
  direct: number;
  unlocked: number;
  /** P-07. */
  value: number;
  /** C4. */
  investment: number;
  net: number;
  /** P-08. */
  roi: number | null;
}

export interface SuiteResult {
  processes: ProcessResult[];
  direct: number;
  unlocked: number;
  value: number;
  investment: number;
  net: number;
  /** (Σ P-07 − Σ C4) ÷ Σ C4 across the processes in the plan. */
  roi: number | null;
  paybackDays: number;
}

export function computeProcess(process: ProcessRoi, x: SuiteValues, enabled = true): ProcessResult {
  const get = getter(x, process.id);
  const done: Done = {};
  // Every KPI before P-07 is computed first, so the value parts can read P-04, P-05 and so on.
  const before = process.kpis.filter((kpi) => kpi.group === "pulse" && kpi.code < "P-07");
  for (const kpi of before) done[kpi.code] = kpi.calc(get, done);
  done.DIRECT = fin(process.direct.calc(get, done));
  done.UNLOCKED = fin(process.unlocked.calc(get, done));
  const kpis = process.kpis.map((def): KpiResult => {
    const value = done[def.code] ?? def.calc(get, done);
    done[def.code] = value;
    return { def, value, working: def.funnel ? "" : working(def.formula, process, get, done) };
  });
  const value = done.DIRECT + done.UNLOCKED;
  const investment = get("C4");
  return {
    process,
    enabled,
    kpis,
    get,
    done,
    direct: done.DIRECT,
    unlocked: done.UNLOCKED,
    value,
    investment,
    net: value - investment,
    roi: investment ? (value - investment) / investment : null,
  };
}

export function computeSuite(x: SuiteValues, enabled: Record<string, boolean>): SuiteResult {
  const processes = PROCESSES_ROI.map((process) => computeProcess(process, x, enabled[process.id] !== false));
  const on = processes.filter((item) => item.enabled);
  const sum = (pick: (item: ProcessResult) => number) => on.reduce((total, item) => total + pick(item), 0);
  const value = sum((item) => item.value);
  const investment = sum((item) => item.investment);
  return {
    processes,
    direct: sum((item) => item.direct),
    unlocked: sum((item) => item.unlocked),
    value,
    investment,
    net: value - investment,
    roi: investment ? (value - investment) / investment : null,
    paybackDays: value > 0 ? (investment / value) * 30 : 0,
  };
}

/** The KPI that fills a role (target, cost, value, roi) for a process, whichever code it has. */
export const kpiByRole = (result: ProcessResult, role: KpiRole): KpiResult | undefined => result.kpis.find((kpi) => kpi.def.role === role);

/* ───────── year curve ───────── */

/** Share of the full monthly value reached in each of the first months, while agents go live. */
const RAMP = [0.35, 0.65, 0.85];

export interface YearPoint {
  month: number;
  earned: number;
  paid: number;
}

/** Cumulative value created against cumulative AI investment, month by month through the first year. */
export function yearCurve(r: SuiteResult): YearPoint[] {
  let earned = 0;
  let paid = 0;
  return Array.from({ length: 12 }, (_, index) => {
    earned += r.value * (RAMP[index] ?? 1);
    paid += r.investment;
    return { month: index + 1, earned, paid };
  });
}

/* ───────── sizing ───────── */

export const SIZE_PRESETS = [
  { id: "growing", label: "Growing", detail: "One city, a few desks", factor: 0.5 },
  { id: "established", label: "Established", detail: "Multi-city agency", factor: 1 },
  { id: "enterprise", label: "Enterprise", detail: "National network", factor: 2.5 },
] as const;

const roundFor = (variable: KpiVar, value: number) => (variable.unit === "num" ? Math.round(value) : variable.unit === "inr" ? Math.round(value) : value);

/** Scales every volume and sum from the defaults; rates, medians, baselines and C4 stay as they are. */
export function applySize(values: SuiteValues, factor: number): SuiteValues {
  const next = { ...values };
  for (const process of PROCESSES_ROI) {
    for (const variable of process.variables) {
      if (variable.scale) next[varId(process.id, variable.key)] = roundFor(variable, variable.value * factor);
    }
  }
  return next;
}

/** Moves a process's volume variable and every volume and sum that hangs off it, in proportion. */
export function setVolume(values: SuiteValues, process: ProcessRoi, next: number): SuiteValues {
  const id = varId(process.id, process.volume.key);
  const before = values[id] ?? DEFAULTS[id];
  const out = { ...values, [id]: next };
  if (!before || before <= 0) return out;
  const ratio = next / before;
  for (const variable of process.variables) {
    if (!variable.scale || variable.key === process.volume.key) continue;
    const key = varId(process.id, variable.key);
    out[key] = roundFor(variable, (values[key] ?? variable.value) * ratio);
  }
  return out;
}
