/**
 * Forex calling agent ROI model. Client-neutral: every figure is an editable assumption.
 * Ported from the sales team's standalone ROI sheet; every figure comes from INPUTS, so editing one reprices the whole page.
 */

export type RoiUnit = "num" | "pct" | "inr" | "min" | "mo" | "cr" | "x";
export type RoiSource = "ai" | "client" | "bench" | "mkt" | "vib" | "est";

export const SOURCE_LABELS: Record<RoiSource, string> = {
  ai: "Vibrium AI run",
  client: "Your data",
  bench: "Industry benchmark",
  mkt: "Market data",
  vib: "Vibrium commercials",
  est: "Estimate, validate",
};

export const INPUT_GROUPS = [
  "Volume and AI performance",
  "Today, without AI",
  "Value per order",
  "Inbound calls",
  "Vibrium cost",
  "Listed-company valuation",
] as const;

export interface RoiInput {
  id: string;
  label: string;
  value: number;
  unit: RoiUnit;
  source: RoiSource;
  note: string;
  group: number;
}

export const INPUTS: RoiInput[] = [
  { id: "leads", label: "FX leads called per month", value: 10000, unit: "num", source: "client", group: 0, note: "20,000 calling minutes a month at a 2-minute average call is 10,000 leads. Confirm the call count on the Vibrium dashboard." },
  { id: "conn", label: "Connect rate", value: 0.45, unit: "pct", source: "ai", group: 0, note: "Measured on AI calls (Vibrium dashboard). India context: 79% skip unknown business calls (Truecaller × Kantar), so warm leads matter." },
  { id: "succ", label: "Orders booked, of connected calls", value: 0.25, unit: "pct", source: "ai", group: 0, note: "Measured on AI calls (Vibrium dashboard)." },
  { id: "dur", label: "Average AI call duration", value: 2, unit: "min", source: "ai", group: 0, note: "From AI call logs." },
  { id: "cov", label: "Share of leads the team follows up today", value: 0.77, unit: "pct", source: "bench", group: 1, note: "HBR audit of 2,241 companies: 23% never responded to a web lead. Replace with your own follow-up rate." },
  { id: "base", label: "Lead-to-order conversion today", value: 0.12, unit: "pct", source: "bench", group: 1, note: "Travel booking benchmark, low end (Rework, Invoca). Replace with your current FX lead conversion." },
  { id: "cpd", label: "Calls a human agent completes per day", value: 120, unit: "num", source: "est", group: 1, note: "Check your dialer productivity report." },
  { id: "salary", label: "Agent monthly salary", value: 20000, unit: "inr", source: "bench", group: 1, note: "India customer service average ₹19,979/month (Indeed India, early 2026). Replace with your own cost to company." },
  { id: "overhead", label: "Overhead on top of salary", value: 0.4, unit: "pct", source: "est", group: 1, note: "Seat, telephony, supervision, statutory benefits." },
  { id: "attr", label: "Annual agent attrition", value: 0.35, unit: "pct", source: "bench", group: 1, note: "Contact-centre attrition runs 30–45% a year (SQM Group, SHRM)." },
  { id: "repl", label: "Cost to replace one agent", value: 2, unit: "mo", source: "est", group: 1, note: "Hiring, training and ramp, in months of loaded cost." },
  { id: "err", label: "Orders needing rework from agent error", value: 0.03, unit: "pct", source: "est", group: 1, note: "Wrong rate quoted, missing KYC or document, wrong currency. Use your QA team's actual rate." },
  { id: "errCost", label: "Cost of one rework", value: 400, unit: "inr", source: "est", group: 1, note: "Agent call-back time plus re-dispatch." },
  { id: "aov", label: "Average FX order value", value: 76000, unit: "inr", source: "client", group: 2, note: "Typical average digital forex transaction: ₹76,000. Test ₹1.5L for assisted orders." },
  { id: "margin", label: "Revenue margin on FX sold", value: 0.0115, unit: "pct", source: "bench", group: 2, note: "Customer-facing FX markup of 1.15%, with spreads of 0.5–3%." },
  { id: "fulfil", label: "Booked orders that get fulfilled", value: 0.85, unit: "pct", source: "est", group: 2, note: "Replace with your fulfilment data." },
  { id: "drop", label: "Share of FX revenue that reaches EBIT", value: 0.453, unit: "pct", source: "mkt", group: 2, note: "Foreign exchange segment EBIT margin: 45.3%. Replace with your own." },
  { id: "repeat", label: "Repeat FX purchases per customer in 3 years", value: 1, unit: "num", source: "est", group: 2, note: "Used only for the lifetime-value view, never for the headline." },
  { id: "inb", label: "Inbound FX calls per month", value: 0, unit: "num", source: "client", group: 3, note: "Enter your inbound volume to value missed-call recovery." },
  { id: "aband", label: "Inbound calls abandoned today", value: 0.0591, unit: "pct", source: "bench", group: 3, note: "Average abandonment 5.91% (Talkdesk benchmark, 2025–26)." },
  { id: "nocb", label: "Abandoners who never call back", value: 0.34, unit: "pct", source: "bench", group: 3, note: "34% of callers who abandon never contact again (Talkdesk)." },
  { id: "vcost", label: "Vibrium monthly fee for FX calling", value: 80000, unit: "inr", source: "vib", group: 4, note: "Taken from your Vibrium commercials." },
  { id: "setup", label: "One-time setup fee", value: 0, unit: "inr", source: "vib", group: 4, note: "Used for the payback period." },
  { id: "mCost", label: "EV/EBIT multiple on cost savings", value: 10, unit: "x", source: "mkt", group: 5, note: "Listed travel-services companies trade near 10× EV/EBIT." },
  { id: "mGrow", label: "EV/EBIT multiple on revenue growth", value: 12, unit: "x", source: "mkt", group: 5, note: "Sum-of-parts target multiple, which prices in growth." },
  { id: "shares", label: "Shares outstanding", value: 47, unit: "cr", source: "mkt", group: 5, note: "Market cap divided by share price. Replace with your own." },
  { id: "fxEbit", label: "FX segment annual EBIT", value: 1500000000, unit: "inr", source: "mkt", group: 5, note: "Annual EBIT of your forex segment. Replace with your own." },
];

export type RoiValues = Record<string, number>;

export const DEFAULTS: RoiValues = Object.fromEntries(INPUTS.map((input) => [input.id, input.value]));
export const INPUT_BY_ID: Record<string, RoiInput> = Object.fromEntries(INPUTS.map((input) => [input.id, input]));

export const AOV_PRESETS = [
  { value: 76000, label: "₹76k, typical digital" },
  { value: 150000, label: "₹1.5L, to validate" },
] as const;

export const WORKING_DAYS = 22;

export interface RoiResult {
  m: number;
  mf: number;
  ebitOrder: number;
  ltv: number;
  aiRate: number;
  worked: number;
  unworked: number;
  aiOrdW: number;
  baseOrd: number;
  extra: number;
  uplift: number;
  leakOrd: number;
  leak: number;
  missed: number;
  lost: number;
  cxOrd: number;
  cx: number;
  loaded: number;
  cap: number;
  fte: number;
  manpower: number;
  attrLeavers: number;
  attrCost: number;
  errN: number;
  errCost: number;
  aiOrdAll: number;
  costHumanOrder: number | null;
  costAIOrder: number | null;
  revTotal: number;
  costTotal: number;
  benefit: number;
  net: number;
  roi: number | null;
  payback: number | null;
  ebitGrow: number;
  ebitCost: number;
  ebit: number;
  evGrow: number;
  evCost: number;
  ev: number;
  perShare: number | null;
  ofFx: number | null;
  ordGained: number;
}

export function computeRoi(x: RoiValues): RoiResult {
  const m = x.aov * x.margin;
  const mf = m * x.fulfil;
  const ebitOrder = mf * x.drop;
  const ltv = mf * (1 + x.repeat);
  const aiRate = x.conn * x.succ;
  const worked = x.leads * x.cov;
  const unworked = x.leads - worked;
  const aiOrdW = worked * aiRate;
  const baseOrd = worked * x.base;
  const extra = aiOrdW - baseOrd;
  const uplift = extra * mf;
  const leakOrd = unworked * aiRate;
  const leak = leakOrd * mf;
  const missed = x.inb * x.aband;
  const lost = missed * x.nocb;
  const cxOrd = lost * x.succ;
  const cx = cxOrd * mf;
  const loaded = x.salary * (1 + x.overhead);
  const cap = x.cpd * WORKING_DAYS;
  const fte = cap ? worked / cap : 0;
  const manpower = fte * loaded;
  const attrLeavers = (fte * x.attr) / 12;
  const attrCost = attrLeavers * x.repl * loaded;
  const errN = baseOrd * x.err;
  const errCost = errN * x.errCost;
  const aiOrdAll = x.leads * aiRate;
  const costHumanOrder = cap && x.base ? loaded / (cap * x.base) : null;
  const costAIOrder = aiOrdAll ? x.vcost / aiOrdAll : null;
  const revTotal = uplift + leak + cx;
  const costTotal = manpower + attrCost + errCost;
  const benefit = revTotal + costTotal;
  const net = benefit - x.vcost;
  const roi = x.vcost ? benefit / x.vcost : null;
  const payback = x.setup > 0 && net > 0 ? x.setup / net : null;
  const ebitGrow = revTotal * 12 * x.drop;
  const ebitCost = (costTotal - x.vcost) * 12;
  const ebit = ebitGrow + ebitCost;
  const evGrow = ebitGrow * x.mGrow;
  const evCost = ebitCost * x.mCost;
  const ev = evGrow + evCost;
  const perShare = x.shares ? ev / (x.shares * 1e7) : null;
  const ofFx = x.fxEbit ? ebit / x.fxEbit : null;
  return {
    m, mf, ebitOrder, ltv, aiRate, worked, unworked, aiOrdW, baseOrd, extra, uplift, leakOrd, leak,
    missed, lost, cxOrd, cx, loaded, cap, fte, manpower, attrLeavers, attrCost, errN, errCost, aiOrdAll,
    costHumanOrder, costAIOrder, revTotal, costTotal, benefit, net, roi, payback, ebitGrow, ebitCost, ebit,
    evGrow, evCost, ev, perShare, ofFx, ordGained: extra + leakOrd + cxOrd,
  };
}

/* ───────── formatting ───────── */

export const inr = (v: number | null | undefined): string => {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v < 0 ? "−" : "";
  const a = Math.abs(v);
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(a).toLocaleString("en-IN")}`;
};
export const pct = (v: number | null | undefined, dp?: number): string => {
  if (v == null || !Number.isFinite(v)) return "—";
  const digits = dp ?? (Math.abs(v * 100) % 1 ? 1 : 0);
  return `${(v * 100).toFixed(digits)}%`;
};
export const num = (v: number | null | undefined): string => {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  return (v < 0 ? "−" : "") + (a < 10 && a % 1 ? a.toFixed(1) : Math.round(a).toLocaleString("en-IN"));
};
export const dec = (v: number | null | undefined): string => (v == null || !Number.isFinite(v) ? "—" : v.toFixed(2));
export const times = (v: number | null | undefined): string => (v == null || !Number.isFinite(v) ? "—" : `${v.toFixed(1)}×`);

export type StepFormat = "num" | "inr" | "dec";
const FORMATTERS: Record<StepFormat, (v: number) => string> = { num, inr, dec };
export const formatStep = (value: number, format: StepFormat): string => FORMATTERS[format](value);

export function formatInput(id: string, x: RoiValues): string {
  const { unit } = INPUT_BY_ID[id];
  const v = x[id];
  if (unit === "pct") return pct(v, (v * 100) % 1 ? 2 : 0);
  if (unit === "inr") return inr(v);
  if (unit === "x") return `${v}×`;
  if (unit === "min") return `${v} min`;
  if (unit === "mo") return `${v} months`;
  if (unit === "cr") return `${v} Cr`;
  return num(v);
}

/* ───────── value heads ───────── */

export interface Step {
  label: string;
  work: string;
  value: number;
  format: StepFormat;
}
const S = (label: string, work: string, value: number, format: StepFormat): Step => ({ label, work, value, format });

export type HeadKind = "growth" | "cx" | "cost";

export interface ValueHead {
  id: string;
  name: string;
  kind: HeadKind;
  bucket: string;
  value: (r: RoiResult) => number;
  uses: string[];
  what: string;
  steps: (x: RoiValues, r: RoiResult) => Step[];
  read?: (x: RoiValues, r: RoiResult) => string;
}

export const HEADS: ValueHead[] = [
  {
    id: "uplift", name: "Conversion uplift", kind: "growth", bucket: "Revenue growth", value: (r) => r.uplift,
    uses: ["leads", "cov", "conn", "succ", "base", "aov", "margin", "fulfil"],
    what: "More orders from the leads your team already works today, because the AI calls every lead within minutes and pitches consistently.",
    steps: (x, r) => [
      S("Leads the team works today", `${num(x.leads)} × ${pct(x.cov)}`, r.worked, "num"),
      S("Orders with AI on those leads", `${num(r.worked)} × ${pct(x.conn)} connect × ${pct(x.succ)} booked`, r.aiOrdW, "num"),
      S("Orders today on the same leads", `${num(r.worked)} × ${pct(x.base)}`, r.baseOrd, "num"),
      S("Extra orders", `${num(r.aiOrdW)} − ${num(r.baseOrd)}`, r.extra, "num"),
      S("Conversion uplift", `${num(r.extra)} × ${inr(r.mf)} fulfilled revenue per order`, r.uplift, "inr"),
    ],
    read: (x, r) =>
      r.extra < 0
        ? `At today's numbers the AI converts ${pct(r.aiRate, 2)} of leads, just under the ${pct(x.base)} travel benchmark, so this head is negative. The benchmark is low-confidence and not FX-specific: replace it with your real human conversion, and track AI conversion weekly. The value of this agent today sits in coverage and cost, not in beating humans on each lead.`
        : `The AI converts ${pct(r.aiRate, 2)} of leads against ${pct(x.base)} today.`,
  },
  {
    id: "leak", name: "Leakage recovery", kind: "growth", bucket: "Revenue growth", value: (r) => r.leak,
    uses: ["leads", "cov", "conn", "succ", "aov", "margin", "fulfil"],
    what: "Orders from leads nobody calls today. the forex purchase cycle has shrunk to 4–7 days before travel, so a lead not called quickly buys elsewhere.",
    steps: (x, r) => [
      S("Leads not worked today", `${num(x.leads)} × (1 − ${pct(x.cov)})`, r.unworked, "num"),
      S("Orders from them with AI", `${num(r.unworked)} × ${pct(x.conn)} × ${pct(x.succ)}`, r.leakOrd, "num"),
      S("Leakage recovery", `${num(r.leakOrd)} × ${inr(r.mf)}`, r.leak, "inr"),
    ],
  },
  {
    id: "cx", name: "Customer experience", kind: "cx", bucket: "Revenue growth", value: (r) => r.cx,
    uses: ["inb", "aband", "nocb", "succ", "aov", "margin", "fulfil"],
    what: "Inbound callers who hang up in the queue today and never call back. The AI answers every call at once, at any hour, so none of them are lost.",
    steps: (x, r) => [
      S("Inbound calls abandoned today", `${num(x.inb)} × ${pct(x.aband, 2)}`, r.missed, "num"),
      S("Of those, never call back", `${num(r.missed)} × ${pct(x.nocb)}`, r.lost, "num"),
      S("Orders AI recovers", `${num(r.lost)} × ${pct(x.succ)} booked`, r.cxOrd, "num"),
      S("Missed-call recovery", `${num(r.cxOrd)} × ${inr(r.mf)}`, r.cx, "inr"),
    ],
    read: (x) => (x.inb ? "" : "This head shows ₹0 until you enter inbound FX call volume. Enter it in Assumptions."),
  },
  {
    id: "prod", name: "Productivity", kind: "cost", bucket: "Cost saving", value: (r) => r.manpower,
    uses: ["leads", "cov", "cpd", "salary", "overhead"],
    what: "Agent effort you no longer need to spend calling this volume. Those agents can move to assisted selling at branches or high-value orders.",
    steps: (x, r) => [
      S("Calls the team makes today", `${num(x.leads)} × ${pct(x.cov)}`, r.worked, "num"),
      S("Agent capacity per month", `${num(x.cpd)} calls × ${WORKING_DAYS} days`, r.cap, "num"),
      S("Agents needed today", `${num(r.worked)} ÷ ${num(r.cap)}`, r.fte, "dec"),
      S("Loaded cost per agent", `${inr(x.salary)} × (1 + ${pct(x.overhead)})`, r.loaded, "inr"),
      S("Productivity saving", `${dec(r.fte)} agents × ${inr(r.loaded)}`, r.manpower, "inr"),
    ],
  },
  {
    id: "avoid", name: "Cost avoidance", kind: "cost", bucket: "Cost saving", value: (r) => r.attrCost + r.errCost,
    uses: ["attr", "repl", "err", "errCost", "salary", "overhead"],
    what: "Costs that disappear with the agents: replacing people who leave, and fixing orders that went wrong because of human error.",
    steps: (x, r) => [
      S("Agents leaving per month", `${dec(r.fte)} × ${pct(x.attr)} ÷ 12`, r.attrLeavers, "dec"),
      S("Attrition cost avoided", `${dec(r.attrLeavers)} × ${x.repl} months × ${inr(r.loaded)}`, r.attrCost, "inr"),
      S("Orders reworked today", `${num(r.baseOrd)} × ${pct(x.err)}`, r.errN, "num"),
      S("Error cost avoided", `${num(r.errN)} × ${inr(x.errCost)}`, r.errCost, "inr"),
      S("Cost avoidance", `${inr(r.attrCost)} + ${inr(r.errCost)}`, r.attrCost + r.errCost, "inr"),
    ],
  },
];

/* ───────── sources ───────── */

export const SOURCES: { title: string; url: string }[] = [
  { title: "Business Standard: retail forex margins of 3–5% at some banks", url: "https://www.business-standard.com/amp/finance/personal-finance/buying-forex-compare-exchange-price-offered-by-seller-with-interbank-rate-125042301291_1.html" },
  { title: "HBR audit of 2,241 companies: 23% never responded to web leads", url: "https://stealthagents.com/research/sales-follow-up-statistics-2026" },
  { title: "InsideSales ResponseAudit: 38-hour average response; 77% of leads never called", url: "https://www.insidesales.com/?p=4618" },
  { title: "Travel booking conversion benchmark (Rework)", url: "https://resources.rework.com/vi/libraries/travel-tour-growth/booking-conversion-metrics" },
  { title: "India customer service salary (Indeed India via StealthAgents)", url: "https://stealthagents.com/research/average-cost-of-hiring-a-customer-service-rep-2026" },
  { title: "Contact-centre attrition 30–45% (SQM, SHRM via Hyring)", url: "https://hyring.com/blog/ai-recruiting-for-bpo-contact-center-hiring/" },
  { title: "Abandonment 5.91%; 34% never call back (Talkdesk via StealthAgents)", url: "https://stealthagents.com/research/customer-support-abandonment-rate-statistics-2026" },
  { title: "Manual QA covers ≤2% of interactions (Call Centre Helper)", url: "https://www.callcentrehelper.com/poll-percentage-of-the-interactions-evaluated-for-quality-purposes-94585.htm" },
  { title: "79% of Indians skip unknown business calls (Truecaller × Kantar)", url: "https://thecsrjournal.in/79-of-indians-skip-unfamiliar-business-calls-amid-rising-spam-concerns/" },
  { title: "RBI penalty on an authorised dealer over LRS reporting, Mar 2025", url: "https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=60037" },
  { title: "Treacy & Company: organic revenue growth drives shareholder value", url: "https://cutimes-resources.cutimes.com/free/w_trea02/" },
  { title: "McKinsey on sustained margin increases and shareholder return (via Validea)", url: "https://blog.validea.com/when-better-profit-margins-arent-better/" },
];
