/**
 * Travel Suite ROI calculator. Each division takes your volumes (mails, calls, leads, travellers)
 * and shows the flow: what comes in, what the agents handle, the hours and bookings that follow,
 * and what that is worth each month. Every rate behind it is a fine-tune input you can change.
 */

export type LeverUnit = "num" | "pct" | "inr" | "min" | "hrs";
export type Source = "client" | "ai" | "bench" | "vib" | "est";
export type DriverKind = "growth" | "cost" | "cx";

export const SOURCE_LABELS: Record<Source, string> = {
  client: "Your data",
  ai: "Measured on agents",
  bench: "Industry benchmark",
  vib: "Vibrium pricing",
  est: "Estimate",
};

export interface Lever {
  id: string;
  label: string;
  value: number;
  unit: LeverUnit;
  source: Source;
  note: string;
  /** Slider range for the volume levers. */
  min?: number;
  max?: number;
  step?: number;
}

export interface Step {
  label: string;
  work: string;
  value: number;
  format: "num" | "inr" | "dec";
}

export interface Driver {
  id: string;
  name: string;
  kind: DriverKind;
  value: number;
  what: string;
  steps: Step[];
}

/** One link in the chain from your volume to the rupee value: "itna daloge, itna hoga". */
export interface FlowStep {
  label: string;
  value: string;
  detail: string;
  money?: boolean;
}

export interface Division {
  id: string;
  name: string;
  short: string;
  href: string;
  agents: string;
  pitch: string;
  /** The volumes the calculator leads with, shown as sliders. */
  volumes: Lever[];
  /** Rates, costs, and the fee, under Fine-tune. */
  rates: Lever[];
  compute: (x: Getter) => { flow: FlowStep[]; drivers: Driver[]; fee: number; headline: string; hours: number };
}

export type Getter = (id: string) => number;

/* ───────── formatting ───────── */

export const inr = (v: number | null | undefined): string => {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v < 0 ? "−" : "";
  const a = Math.abs(v);
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(a).toLocaleString("en-IN")}`;
};
export const pct = (v: number, dp?: number): string => `${(v * 100).toFixed(dp ?? (Math.abs(v * 100) % 1 ? 1 : 0))}%`;
export const num = (v: number): string => (Math.abs(v) < 10 && v % 1 ? v.toFixed(1) : Math.round(v).toLocaleString("en-IN"));
export const dec = (v: number): string => v.toFixed(2);
export const times = (v: number | null): string => (v == null || !Number.isFinite(v) ? "—" : `${v.toFixed(1)}×`);
export const formatStep = (value: number, format: Step["format"]): string => (format === "inr" ? inr(value) : format === "dec" ? dec(value) : num(value));

export function formatLever(lever: Lever, value: number): string {
  if (lever.unit === "pct") return pct(value, (value * 100) % 1 ? 1 : 0);
  if (lever.unit === "inr") return inr(value);
  if (lever.unit === "min") return `${value} min`;
  if (lever.unit === "hrs") return `${value} h`;
  return num(value);
}

const S = (label: string, work: string, value: number, format: Step["format"]): Step => ({ label, work, value, format });
const vol = (id: string, label: string, value: number, min: number, max: number, step: number, note: string, unit: LeverUnit = "num", source: Source = "client"): Lever => ({ id, label, value, unit, source, note, min, max, step });

/* ───────── shared and suite inputs ───────── */

export const SHARED: Lever[] = [
  { id: "deskCost", label: "Desk person, monthly loaded cost", value: 42000, unit: "inr", source: "bench", note: "₹30,000 salary plus 40% for seat, telephony, supervision, and benefits." },
  { id: "deskHours", label: "Working hours per person per month", value: 176, unit: "hrs", source: "est", note: "22 days of 8 hours." },
];

export const SUITE: Lever[] = [
  { id: "attach", label: "Holidays that add forex through the suite", value: 0.25, unit: "pct", source: "est", note: "The planner offers forex and the forex desk calls. A separate tool never sees the holiday." },
  { id: "forexMargin", label: "Margin per forex add-on", value: 1500, unit: "inr", source: "bench", note: "About ₹1.3 L of forex per holiday at 1.15%." },
  { id: "insurance", label: "Holidays that add travel insurance", value: 0.3, unit: "pct", source: "est", note: "Offered in the quote and the trip PDF." },
  { id: "insuranceMargin", label: "Margin per insurance policy", value: 450, unit: "inr", source: "bench", note: "Typical commission." },
  { id: "bundle", label: "Bundle discount, 4 or more divisions", value: 0.15, unit: "pct", source: "vib", note: "One contract, one platform." },
];

const hourly = (x: Getter) => x("shared.deskCost") / Math.max(x("shared.deskHours"), 1);
const fte = (hours: number, x: Getter) => hours / Math.max(x("shared.deskHours"), 1);

/* ───────── divisions ───────── */

export const DIVISIONS: Division[] = [
  {
    id: "corporate",
    name: "Corporate travel",
    short: "Corporate",
    href: "/corporate",
    agents: "Intent Router · Policy Guard · Meera · Anika",
    pitch: "Every travel mail read, policy-checked, searched, and answered with a draft quote.",
    volumes: [
      vol("mails", "Travel mails per month", 6000, 500, 30000, 500, "Requests, changes, approvals, and FYIs into the desk mailbox."),
      vol("bookings", "Corporate bookings per month", 900, 100, 6000, 50, "Tickets and hotels the desk books."),
    ],
    rates: [
      { id: "auto", label: "Mails the agents finish without a person", value: 0.85, unit: "pct", source: "ai", note: "The rest reach a counsellor with the work done." },
      { id: "minutes", label: "Minutes saved per mail", value: 6, unit: "min", source: "ai", note: "Reading, policy check, search, and drafting." },
      { id: "won", label: "Extra bookings won by faster quotes", value: 0.03, unit: "pct", source: "est", note: "A quote in minutes keeps travellers from booking direct." },
      { id: "serviceFee", label: "Service fee earned per booking", value: 450, unit: "inr", source: "client", note: "Your corporate management fee." },
      { id: "fee", label: "Vibrium fee per month", value: 60000, unit: "inr", source: "vib", note: "Corporate desk agents." },
    ],
    compute: (x) => {
      const mails = x("corporate.mails");
      const auto = mails * x("corporate.auto");
      const hours = (mails * x("corporate.minutes")) / 60;
      const saving = hours * hourly(x);
      const extra = x("corporate.bookings") * x("corporate.won");
      const kept = extra * x("corporate.serviceFee");
      return {
        fee: x("corporate.fee"),
        hours,
        headline: `${num(mails)} mails a month`,
        flow: [
          { label: "Mails in", value: num(mails), detail: "every month" },
          { label: "Finished by agents", value: num(auto), detail: `${pct(x("corporate.auto"))} with no person` },
          { label: "Hours saved", value: num(hours), detail: `${num(fte(hours, x))} counsellors freed` },
          { label: "Bookings kept", value: num(extra), detail: "won by faster quotes" },
          { label: "Worth", value: inr(saving + kept), detail: "per month", money: true },
        ],
        drivers: [
          {
            id: "time",
            name: "Desk time saved",
            kind: "cost",
            value: saving,
            what: "Hours counsellors no longer spend reading, checking policy, searching, and drafting.",
            steps: [
              S("Hours saved", `${num(mails)} mails × ${x("corporate.minutes")} min ÷ 60`, hours, "num"),
              S("Desk cost per hour", `${inr(x("shared.deskCost"))} ÷ ${x("shared.deskHours")} h`, hourly(x), "inr"),
              S("Desk time saved", `${num(hours)} h × ${inr(hourly(x))}`, saving, "inr"),
            ],
          },
          {
            id: "won",
            name: "Bookings kept",
            kind: "growth",
            value: kept,
            what: "Faster quotes mean fewer travellers book direct while they wait.",
            steps: [
              S("Extra bookings", `${num(x("corporate.bookings"))} × ${pct(x("corporate.won"))}`, extra, "num"),
              S("Bookings kept", `${num(extra)} × ${inr(x("corporate.serviceFee"))}`, kept, "inr"),
            ],
          },
        ],
      };
    },
  },
  {
    id: "domestic",
    name: "Domestic holidays",
    short: "Domestic",
    href: "/prebook",
    agents: "Ravi · pre-tour, in-tour, and completion calls",
    pitch: "Every traveller called before, during, and after the tour, without a call centre.",
    volumes: [
      vol("travellers", "Travellers on tour per month", 3000, 200, 20000, 100, "Group and customised departures."),
      vol("calls", "Care calls per traveller", 3, 1, 5, 1, "Pre-tour, day 2, and completion."),
    ],
    rates: [
      { id: "connect", label: "Calls that connect", value: 0.8, unit: "pct", source: "ai", note: "With one automatic retry." },
      { id: "minutes", label: "Minutes per call by hand, with notes", value: 6, unit: "min", source: "bench", note: "Dial, talk, and CRM notes." },
      { id: "rebook", label: "Travellers who book again after a care call", value: 0.015, unit: "pct", source: "est", note: "The completion call offers the next trip." },
      { id: "value", label: "Average repeat booking value", value: 60000, unit: "inr", source: "client", note: "Domestic tour average." },
      { id: "margin", label: "Margin on a repeat booking", value: 0.09, unit: "pct", source: "bench", note: "Package margin." },
      { id: "fee", label: "Vibrium fee per month", value: 70000, unit: "inr", source: "vib", note: "Care voice agents." },
    ],
    compute: (x) => {
      const calls = x("domestic.travellers") * x("domestic.calls");
      const connected = calls * x("domestic.connect");
      const hours = (calls * x("domestic.minutes")) / 60;
      const saving = hours * hourly(x);
      const rebook = x("domestic.travellers") * x("domestic.rebook");
      const repeat = rebook * x("domestic.value") * x("domestic.margin");
      return {
        fee: x("domestic.fee"),
        hours,
        headline: `${num(calls)} care calls a month`,
        flow: [
          { label: "Travellers", value: num(x("domestic.travellers")), detail: "on tour this month" },
          { label: "Calls placed", value: num(calls), detail: `${x("domestic.calls")} per traveller` },
          { label: "Connected", value: num(connected), detail: `${pct(x("domestic.connect"))} answer` },
          { label: "Hours saved", value: num(hours), detail: `${num(fte(hours, x))} callers freed` },
          { label: "Repeat bookings", value: num(rebook), detail: "from completion calls" },
          { label: "Worth", value: inr(saving + repeat), detail: "per month", money: true },
        ],
        drivers: [
          {
            id: "calls",
            name: "Calls handled by agents",
            kind: "cost",
            value: saving,
            what: "Care calls your team would otherwise dial by hand.",
            steps: [
              S("Call hours", `${num(calls)} calls × ${x("domestic.minutes")} min ÷ 60`, hours, "num"),
              S("Calls handled by agents", `${num(hours)} h × ${inr(hourly(x))}`, saving, "inr"),
            ],
          },
          {
            id: "repeat",
            name: "Repeat bookings",
            kind: "growth",
            value: repeat,
            what: "The completion call takes NPS and offers the next trip while the memory is fresh.",
            steps: [
              S("Repeat bookings", `${num(x("domestic.travellers"))} × ${pct(x("domestic.rebook"), 1)}`, rebook, "num"),
              S("Margin on them", `${num(rebook)} × ${inr(x("domestic.value"))} × ${pct(x("domestic.margin"))}`, repeat, "inr"),
            ],
          },
        ],
      };
    },
  },
  {
    id: "international",
    name: "International holidays",
    short: "International",
    href: "/planner",
    agents: "Trip Planner · Quote Builder · Trip Document Designer",
    pitch: "A planner on your website that turns visitors into priced, designed holiday quotes.",
    volumes: [
      vol("visitors", "Website visitors per month", 88600, 5000, 500000, 5000, "From your web analytics."),
      vol("value", "Average holiday booking value", 191000, 30000, 600000, 5000, "Your average package value.", "inr"),
    ],
    rates: [
      { id: "open", label: "Visitors who open the planner", value: 0.054, unit: "pct", source: "ai", note: "Measured on the widget." },
      { id: "chat", label: "Opens that start a chat", value: 0.5, unit: "pct", source: "ai", note: "Measured on the widget." },
      { id: "lead", label: "Chats that ask for a quote", value: 0.22, unit: "pct", source: "ai", note: "Measured on the widget." },
      { id: "book", label: "Quote requests that book", value: 0.21, unit: "pct", source: "ai", note: "Tracked on the quote desk." },
      { id: "margin", label: "Margin on a holiday package", value: 0.09, unit: "pct", source: "bench", note: "Replace with your own." },
      { id: "incremental", label: "Bookings that would not have happened", value: 0.4, unit: "pct", source: "est", note: "Visitors who would have left without the planner." },
      { id: "quoteMinutes", label: "Minutes saved per quote", value: 40, unit: "min", source: "ai", note: "Drafted price and a designed PDF." },
      { id: "fee", label: "Vibrium fee per month", value: 120000, unit: "inr", source: "vib", note: "Widget, quote desk, and documents." },
    ],
    compute: (x) => {
      const chats = x("international.visitors") * x("international.open") * x("international.chat");
      const leads = chats * x("international.lead");
      const bookings = leads * x("international.book");
      const margin = bookings * x("international.value") * x("international.margin");
      const incremental = margin * x("international.incremental");
      const hours = (leads * x("international.quoteMinutes")) / 60;
      const quotes = hours * hourly(x);
      return {
        fee: x("international.fee"),
        hours,
        headline: `${num(x("international.visitors"))} visitors a month`,
        flow: [
          { label: "Visitors", value: num(x("international.visitors")), detail: "on your website" },
          { label: "Chats", value: num(chats), detail: "planned with the agent" },
          { label: "Quote requests", value: num(leads), detail: "qualified leads" },
          { label: "Bookings", value: num(bookings), detail: `at ${inr(x("international.value"))} each` },
          { label: "Worth", value: inr(incremental + quotes), detail: "per month", money: true },
        ],
        drivers: [
          {
            id: "revenue",
            name: "New holiday bookings",
            kind: "growth",
            value: incremental,
            what: "Bookings from visitors who would have left the site, valued at your package margin.",
            steps: [
              S("Quote requests", `${num(chats)} chats × ${pct(x("international.lead"))}`, leads, "num"),
              S("Bookings", `${num(leads)} × ${pct(x("international.book"))}`, bookings, "num"),
              S("Margin on them", `${num(bookings)} × ${inr(x("international.value"))} × ${pct(x("international.margin"))}`, margin, "inr"),
              S("New holiday bookings", `${inr(margin)} × ${pct(x("international.incremental"))} incremental`, incremental, "inr"),
            ],
          },
          {
            id: "quotes",
            name: "Quote time saved",
            kind: "cost",
            value: quotes,
            what: "Experts review a drafted price and a designed PDF instead of building both by hand.",
            steps: [
              S("Hours saved", `${num(leads)} quotes × ${x("international.quoteMinutes")} min ÷ 60`, hours, "num"),
              S("Quote time saved", `${num(hours)} h × ${inr(hourly(x))}`, quotes, "inr"),
            ],
          },
        ],
      };
    },
  },
  {
    id: "forex",
    name: "Forex",
    short: "Forex",
    href: "/forex",
    agents: "Forex Desk · Ravi · Rate Desk · Branch Handoff",
    pitch: "Every forex lead called in minutes, quoted from the live rate, and booked into a branch.",
    volumes: [
      vol("leads", "Forex leads per month", 10000, 500, 60000, 500, "Calls, WhatsApps, and web forms to buy, reload, or send money."),
      vol("aov", "Average forex order value", 76000, 20000, 300000, 1000, "Typical digital order; assisted orders are often larger.", "inr"),
    ],
    rates: [
      { id: "connect", label: "Leads the agent connects with", value: 0.45, unit: "pct", source: "ai", note: "Called within minutes of the enquiry." },
      { id: "succ", label: "Connected leads that order", value: 0.25, unit: "pct", source: "ai", note: "Measured on agent calls." },
      { id: "cov", label: "Leads your team calls back today", value: 0.77, unit: "pct", source: "bench", note: "23% of leads are never called back (HBR audit)." },
      { id: "base", label: "Lead-to-order conversion today", value: 0.12, unit: "pct", source: "bench", note: "Travel booking benchmark. Replace with your own." },
      { id: "margin", label: "Margin on forex sold", value: 0.0115, unit: "pct", source: "bench", note: "Customer-facing markup; spreads run 0.5–3%." },
      { id: "fulfil", label: "Orders that get fulfilled", value: 0.85, unit: "pct", source: "est", note: "After branch KYC." },
      { id: "cpd", label: "Calls a person completes per day", value: 120, unit: "num", source: "est", note: "From your dialer reports." },
      { id: "fee", label: "Vibrium fee per month", value: 80000, unit: "inr", source: "vib", note: "Forex calling agents." },
    ],
    compute: (x) => {
      const leads = x("forex.leads");
      const connected = leads * x("forex.connect");
      const orders = connected * x("forex.succ");
      const today = leads * x("forex.cov") * x("forex.base");
      const extra = orders - today;
      const perOrder = x("forex.aov") * x("forex.margin") * x("forex.fulfil");
      const revenue = extra * perOrder;
      const callers = (leads * x("forex.cov")) / Math.max(x("forex.cpd") * 22, 1);
      const productivity = callers * x("shared.deskCost");
      return {
        fee: x("forex.fee"),
        hours: callers * x("shared.deskHours"),
        headline: `${num(leads)} leads a month`,
        flow: [
          { label: "Leads", value: num(leads), detail: "every one called in minutes" },
          { label: "Connected", value: num(connected), detail: `${pct(x("forex.connect"))} pick up` },
          { label: "Orders", value: num(orders), detail: `vs ${num(today)} today` },
          { label: "Extra orders", value: num(extra), detail: `${inr(perOrder)} margin each` },
          { label: "Callers freed", value: num(callers), detail: "for branch and high-value sales" },
          { label: "Worth", value: inr(revenue + productivity), detail: "per month", money: true },
        ],
        drivers: [
          {
            id: "orders",
            name: "Extra forex orders",
            kind: "growth",
            value: revenue,
            what: "Every lead is called within minutes, including the ones nobody calls back today.",
            steps: [
              S("Orders with agents", `${num(leads)} × ${pct(x("forex.connect"))} × ${pct(x("forex.succ"))}`, orders, "num"),
              S("Orders today", `${num(leads)} × ${pct(x("forex.cov"))} called × ${pct(x("forex.base"))}`, today, "num"),
              S("Margin per order", `${inr(x("forex.aov"))} × ${pct(x("forex.margin"), 2)} × ${pct(x("forex.fulfil"))}`, perOrder, "inr"),
              S("Extra forex orders", `${num(extra)} × ${inr(perOrder)}`, revenue, "inr"),
            ],
          },
          {
            id: "callers",
            name: "Calling time saved",
            kind: "cost",
            value: productivity,
            what: "The callers this volume needs today, free for branch and high-value sales.",
            steps: [
              S("Callers needed today", `${num(leads * x("forex.cov"))} calls ÷ (${x("forex.cpd")} × 22 days)`, callers, "dec"),
              S("Calling time saved", `${dec(callers)} × ${inr(x("shared.deskCost"))}`, productivity, "inr"),
            ],
          },
        ],
      };
    },
  },
  {
    id: "qc",
    name: "Call quality (CQC)",
    short: "Call QC",
    href: "/audit",
    agents: "Recording Intake · QC Evaluator · Coaching Notes",
    pitch: "Every sales call scored on your form, not a 2% sample, with coaching from the misses.",
    volumes: [vol("calls", "Recorded sales calls per month", 8000, 500, 80000, 500, "Across forex, holidays, and the corporate desk.")],
    rates: [
      { id: "sample", label: "Share audited by hand today", value: 0.02, unit: "pct", source: "bench", note: "Manual QA reviews about 2% (Call Centre Helper)." },
      { id: "reviewMinutes", label: "Minutes per manual review", value: 12, unit: "min", source: "bench", note: "Listen, score, and write feedback." },
      { id: "uplift", label: "Conversion uplift from coaching", value: 0.005, unit: "pct", source: "est", note: "Half a point more sales from coached calls." },
      { id: "marginPerSale", label: "Margin per sale", value: 1500, unit: "inr", source: "client", note: "Blended across lines." },
      { id: "fee", label: "Vibrium fee per month", value: 50000, unit: "inr", source: "vib", note: "Audit agents." },
    ],
    compute: (x) => {
      const calls = x("qc.calls");
      const manual = calls * x("qc.sample");
      const hours = (manual * x("qc.reviewMinutes")) / 60;
      const qa = hours * hourly(x);
      const extra = calls * x("qc.uplift");
      const coached = extra * x("qc.marginPerSale");
      return {
        fee: x("qc.fee"),
        hours,
        headline: `${num(calls)} calls scored a month`,
        flow: [
          { label: "Calls recorded", value: num(calls), detail: "every month" },
          { label: "Scored by agents", value: num(calls), detail: `vs ${num(manual)} by hand today` },
          { label: "QA hours saved", value: num(hours), detail: "no manual listening" },
          { label: "Extra sales", value: num(extra), detail: "from coaching on the misses" },
          { label: "Worth", value: inr(qa + coached), detail: "per month", money: true },
        ],
        drivers: [
          {
            id: "qa",
            name: "QA time saved",
            kind: "cost",
            value: qa,
            what: "The manual sample your QA team no longer listens to.",
            steps: [
              S("QA hours today", `${num(manual)} calls × ${x("qc.reviewMinutes")} min ÷ 60`, hours, "num"),
              S("QA time saved", `${num(hours)} h × ${inr(hourly(x))}`, qa, "inr"),
            ],
          },
          {
            id: "coach",
            name: "Sales from coaching",
            kind: "growth",
            value: coached,
            what: "Every call scored means every counsellor coached on their real misses.",
            steps: [
              S("Extra sales", `${num(calls)} × ${pct(x("qc.uplift"), 1)}`, extra, "num"),
              S("Sales from coaching", `${num(extra)} × ${inr(x("qc.marginPerSale"))}`, coached, "inr"),
            ],
          },
        ],
      };
    },
  },
  {
    id: "service",
    name: "Airline and hotel desk",
    short: "Service desk",
    href: "/airlines",
    agents: "Schedule Watch · Stay Care · Hotel Liaison",
    pitch: "Schedule changes and in-stay problems handled by agents, against a clock.",
    volumes: [
      vol("changes", "Airline schedule changes per month", 1200, 100, 10000, 100, "From carrier queues."),
      vol("issues", "In-stay hotel issues per month", 800, 50, 8000, 50, "AC, housekeeping, billing, and room moves."),
    ],
    rates: [
      { id: "changeMinutes", label: "Minutes per schedule change by hand", value: 15, unit: "min", source: "bench", note: "Read the PNR, find options, inform the traveller." },
      { id: "adm", label: "Changes that end in an airline debit memo", value: 0.01, unit: "pct", source: "est", note: "Wrong reissue or a missed waiver." },
      { id: "admCost", label: "Average debit memo", value: 6000, unit: "inr", source: "bench", note: "Fare difference plus admin fee." },
      { id: "issueMinutes", label: "Minutes saved per hotel issue", value: 20, unit: "min", source: "ai", note: "Triage, hotel follow-up, and closing the loop." },
      { id: "escalate", label: "Hotel issues that end in compensation", value: 0.1, unit: "pct", source: "est", note: "Refunds, credits, or free nights." },
      { id: "avoided", label: "Of those, avoided by a fast fix", value: 0.5, unit: "pct", source: "est", note: "Fixed inside the hotel's clock." },
      { id: "comp", label: "Average compensation", value: 3000, unit: "inr", source: "est", note: "Per escalated issue." },
      { id: "fee", label: "Vibrium fee per month", value: 80000, unit: "inr", source: "vib", note: "Airline and stay-care agents." },
    ],
    compute: (x) => {
      const hours = (x("service.changes") * x("service.changeMinutes") + x("service.issues") * x("service.issueMinutes")) / 60;
      const time = hours * hourly(x);
      const adms = x("service.changes") * x("service.adm");
      const admSaved = adms * x("service.admCost");
      const avoided = x("service.issues") * x("service.escalate") * x("service.avoided");
      const comp = avoided * x("service.comp");
      return {
        fee: x("service.fee"),
        hours,
        headline: `${num(x("service.changes") + x("service.issues"))} cases a month`,
        flow: [
          { label: "Cases in", value: num(x("service.changes") + x("service.issues")), detail: `${num(x("service.changes"))} flights · ${num(x("service.issues"))} stays` },
          { label: "Hours saved", value: num(hours), detail: `${num(fte(hours, x))} people freed` },
          { label: "Debit memos avoided", value: num(adms), detail: "waiver checked first" },
          { label: "Payouts avoided", value: num(avoided), detail: "fixed inside the clock" },
          { label: "Worth", value: inr(time + admSaved + comp), detail: "per month", money: true },
        ],
        drivers: [
          {
            id: "time",
            name: "Desk time saved",
            kind: "cost",
            value: time,
            what: "Schedule changes and hotel issues worked by agents, not the desk.",
            steps: [
              S("Hours", `(${num(x("service.changes"))} × ${x("service.changeMinutes")} + ${num(x("service.issues"))} × ${x("service.issueMinutes")}) min ÷ 60`, hours, "num"),
              S("Desk time saved", `${num(hours)} h × ${inr(hourly(x))}`, time, "inr"),
            ],
          },
          {
            id: "adm",
            name: "Debit memos avoided",
            kind: "cost",
            value: admSaved,
            what: "A waiver is confirmed before a reissue goes out.",
            steps: [S("Debit memos avoided", `${num(x("service.changes"))} × ${pct(x("service.adm"))} × ${inr(x("service.admCost"))}`, admSaved, "inr")],
          },
          {
            id: "comp",
            name: "Compensation avoided",
            kind: "cx",
            value: comp,
            what: "Hotel problems fixed before the guest asks for money back.",
            steps: [
              S("Payouts avoided", `${num(x("service.issues"))} × ${pct(x("service.escalate"))} × ${pct(x("service.avoided"))}`, avoided, "num"),
              S("Compensation avoided", `${num(avoided)} × ${inr(x("service.comp"))}`, comp, "inr"),
            ],
          },
        ],
      };
    },
  },
];

/* ───────── values and totals ───────── */

export type SuiteValues = Record<string, number>;

export const DEFAULTS: SuiteValues = Object.fromEntries([
  ...SHARED.map((lever) => [`shared.${lever.id}`, lever.value]),
  ...DIVISIONS.flatMap((division) => [...division.volumes, ...division.rates].map((lever) => [`${division.id}.${lever.id}`, lever.value])),
  ...SUITE.map((lever) => [`suite.${lever.id}`, lever.value]),
]);

export function leverById(id: string): Lever | null {
  const [scope, key] = id.split(".");
  if (scope === "shared") return SHARED.find((lever) => lever.id === key) ?? null;
  if (scope === "suite") return SUITE.find((lever) => lever.id === key) ?? null;
  const division = DIVISIONS.find((item) => item.id === scope);
  return [...(division?.volumes ?? []), ...(division?.rates ?? [])].find((lever) => lever.id === key) ?? null;
}

export interface DivisionResult {
  division: Division;
  enabled: boolean;
  flow: FlowStep[];
  drivers: Driver[];
  headline: string;
  hours: number;
  value: number;
  fee: number;
  net: number;
  roi: number | null;
}

export interface SuiteResult {
  divisions: DivisionResult[];
  suiteDrivers: Driver[];
  suiteValue: number;
  value: number;
  feeList: number;
  discount: number;
  fee: number;
  net: number;
  roi: number | null;
  paybackDays: number;
  hoursSaved: number;
}

export function computeSuite(x: SuiteValues, enabled: Record<string, boolean>): SuiteResult {
  const get: Getter = (id) => x[id] ?? DEFAULTS[id] ?? 0;
  const divisions = DIVISIONS.map((division): DivisionResult => {
    const out = division.compute(get);
    const value = out.drivers.reduce((sum, driver) => sum + driver.value, 0);
    return { division, enabled: enabled[division.id] !== false, ...out, value, net: value - out.fee, roi: out.fee ? value / out.fee : null };
  });
  const on = divisions.filter((item) => item.enabled);
  const isOn = (id: string) => on.some((item) => item.division.id === id);

  const holidays = isOn("international")
    ? get("international.visitors") * get("international.open") * get("international.chat") * get("international.lead") * get("international.book")
    : 0;
  const forexAttach = isOn("forex") ? holidays * get("suite.attach") * get("suite.forexMargin") : 0;
  const insurance = holidays * get("suite.insurance") * get("suite.insuranceMargin");
  const suiteDrivers: Driver[] = holidays
    ? [
        {
          id: "forex-attach",
          name: "Forex on every holiday",
          kind: "growth",
          value: forexAttach,
          what: isOn("forex") ? "A holiday booked in the planner goes straight to the forex desk." : "Turn on Forex to sell forex on the holidays the planner books.",
          steps: [S("Forex on every holiday", `${num(holidays)} holidays × ${pct(get("suite.attach"))} × ${inr(get("suite.forexMargin"))}`, forexAttach, "inr")],
        },
        {
          id: "insurance",
          name: "Insurance in the quote",
          kind: "growth",
          value: insurance,
          what: "Insurance offered in the quote desk and the trip PDF.",
          steps: [S("Insurance in the quote", `${num(holidays)} holidays × ${pct(get("suite.insurance"))} × ${inr(get("suite.insuranceMargin"))}`, insurance, "inr")],
        },
      ]
    : [];
  const suiteValue = suiteDrivers.reduce((sum, driver) => sum + driver.value, 0);
  const value = on.reduce((sum, item) => sum + item.value, 0) + suiteValue;
  const feeList = on.reduce((sum, item) => sum + item.fee, 0);
  const discount = on.length >= 4 ? feeList * get("suite.bundle") : 0;
  const fee = feeList - discount;
  const hoursSaved = on.reduce((sum, item) => sum + item.hours, 0);
  return {
    divisions,
    suiteDrivers,
    suiteValue,
    value,
    feeList,
    discount,
    fee,
    net: value - fee,
    roi: fee ? value / fee : null,
    paybackDays: value > 0 ? (fee / value) * 30 : 0,
    hoursSaved,
  };
}

/* ───────── charts ───────── */

/** Each division's colour, in fixed categorical order (validated: adjacent CVD ΔE ≥ 9.1). */
export const DIVISION_COLORS: Record<string, string> = {
  corporate: "#2a78d6",
  domestic: "#eb6834",
  international: "#1baf7a",
  forex: "#eda100",
  qc: "#e87ba4",
  service: "#6250d6",
};

/** Share of the full monthly value reached in each of the first months, while agents go live. */
const RAMP = [0.35, 0.65, 0.85];

export interface YearPoint {
  month: number;
  earned: number;
  paid: number;
}

/** Cumulative value earned against cumulative fee paid, month by month through the first year. */
export function yearCurve(r: SuiteResult): YearPoint[] {
  let earned = 0;
  let paid = 0;
  return Array.from({ length: 12 }, (_, index) => {
    earned += r.value * (RAMP[index] ?? 1);
    paid += r.fee;
    return { month: index + 1, earned, paid };
  });
}

export interface BeforeAfter {
  label: string;
  today: number;
  after: number;
  note: string;
}

/** What changes on the floor, today against with the agents, for the divisions in the plan. */
export function beforeAfter(x: SuiteValues, r: SuiteResult): BeforeAfter[] {
  const get: Getter = (id) => x[id] ?? DEFAULTS[id] ?? 0;
  const isOn = (id: string) => r.divisions.some((item) => item.division.id === id && item.enabled);
  const rows: BeforeAfter[] = [];
  if (isOn("forex")) {
    const leads = get("forex.leads");
    rows.push({ label: "Forex leads called back", today: leads * get("forex.cov"), after: leads, note: "every lead, within minutes" });
    rows.push({
      label: "Forex orders a month",
      today: leads * get("forex.cov") * get("forex.base"),
      after: leads * get("forex.connect") * get("forex.succ"),
      note: "from the same leads",
    });
  }
  if (isOn("corporate")) rows.push({ label: "Mails finished without a person", today: 0, after: get("corporate.mails") * get("corporate.auto"), note: "read, checked, and drafted" });
  if (isOn("domestic")) rows.push({ label: "Travellers called during the tour", today: get("domestic.travellers") * 0.2, after: get("domestic.travellers"), note: "today about 1 in 5 gets a call" });
  if (isOn("qc")) rows.push({ label: "Sales calls quality-checked", today: get("qc.calls") * get("qc.sample"), after: get("qc.calls"), note: "100% instead of a sample" });
  return rows.slice(0, 4);
}

export const SIZE_PRESETS = [
  { id: "growing", label: "Growing", detail: "One city, a few desks", factor: 0.5 },
  { id: "established", label: "Established", detail: "Multi-city agency", factor: 1 },
  { id: "enterprise", label: "Enterprise", detail: "National network", factor: 2.5 },
] as const;

/** Scales every division's volumes from the defaults; rates and fees stay as they are. */
export function applySize(values: SuiteValues, factor: number): SuiteValues {
  const next = { ...values };
  for (const division of DIVISIONS) {
    for (const lever of division.volumes) {
      if (lever.unit !== "num" || (lever.max ?? 0) <= 10) continue;
      const step = lever.step ?? 1;
      next[`${division.id}.${lever.id}`] = Math.max(lever.min ?? 0, Math.round((lever.value * factor) / step) * step);
    }
  }
  return next;
}
