import { computeRoi, DEFAULTS as FOREX_DEFAULTS, dec, inr, num, pct, type RoiSource, type RoiValues, type Step, type StepFormat } from "./roi-model";

/**
 * Travel Suite ROI: what every module is worth each month, what the suite adds on top of the
 * modules, and the return on the whole fee. Every figure traces back to an editable input.
 * Forex reuses the detailed forex calling model; the others have their own drivers below.
 */

export type SuiteUnit = "num" | "pct" | "inr" | "min" | "hrs";
export type DriverKind = "growth" | "cost" | "cx";

export interface SuiteInput {
  id: string;
  label: string;
  value: number;
  unit: SuiteUnit;
  source: RoiSource;
  note: string;
}

export interface Driver {
  id: string;
  name: string;
  kind: DriverKind;
  value: number;
  what: string;
  steps: Step[];
}

export interface SuiteModule {
  id: string;
  name: string;
  href: string;
  agents: string;
  pitch: string;
  /** The module's monthly Vibrium fee, an input id inside the module. */
  feeInput: string;
  inputs: SuiteInput[];
  drivers: (x: Getter) => Driver[];
}

type Getter = (id: string) => number;

const S = (label: string, work: string, value: number, format: StepFormat): Step => ({ label, work, value, format });

/** Shared across modules: the loaded hourly cost of a desk person. */
export const SHARED_INPUTS: SuiteInput[] = [
  { id: "deskCost", label: "Desk person, monthly loaded cost", value: 42000, unit: "inr", source: "bench", note: "₹30,000 salary plus 40% for seat, telephony, supervision, and benefits. Replace with your own CTC." },
  { id: "deskHours", label: "Working hours per person per month", value: 176, unit: "hrs", source: "est", note: "22 days of 8 hours." },
];

const hourly = (x: Getter) => x("shared.deskCost") / Math.max(x("shared.deskHours"), 1);

export const MODULES: SuiteModule[] = [
  {
    id: "corporate",
    name: "Corporate desk",
    href: "/corporate",
    agents: "Intent Router · Policy Guard · Meera · Anika",
    pitch: "Every travel mail read, policy-checked, searched, and answered with a draft quote.",
    feeInput: "fee",
    inputs: [
      { id: "mails", label: "Travel mails per month", value: 6000, unit: "num", source: "client", note: "Requests, changes, approvals, and FYIs into the desk mailbox." },
      { id: "minutes", label: "Minutes saved per mail", value: 6, unit: "min", source: "ai", note: "Reading, policy check, search, and drafting that agents now do." },
      { id: "bookings", label: "Corporate bookings per month", value: 900, unit: "num", source: "client", note: "Tickets and hotels the desk books." },
      { id: "won", label: "Extra bookings won by faster quotes", value: 0.03, unit: "pct", source: "est", note: "A quote in minutes instead of hours keeps the traveller from booking direct." },
      { id: "serviceFee", label: "Service fee earned per booking", value: 450, unit: "inr", source: "client", note: "Your corporate service or management fee." },
      { id: "fee", label: "Vibrium fee, per month", value: 60000, unit: "inr", source: "vib", note: "Corporate desk agents." },
    ],
    drivers: (x) => {
      const hours = (x("corporate.mails") * x("corporate.minutes")) / 60;
      const saving = hours * hourly(x);
      const extra = x("corporate.bookings") * x("corporate.won");
      return [
        {
          id: "time",
          name: "Desk time saved",
          kind: "cost",
          value: saving,
          what: "Hours counsellors no longer spend reading, checking policy, searching, and drafting replies.",
          steps: [
            S("Hours saved", `${num(x("corporate.mails"))} mails × ${x("corporate.minutes")} min ÷ 60`, hours, "num"),
            S("Desk cost per hour", `${inr(x("shared.deskCost"))} ÷ ${x("shared.deskHours")} h`, hourly(x), "inr"),
            S("Desk time saved", `${num(hours)} h × ${inr(hourly(x))}`, saving, "inr"),
          ],
        },
        {
          id: "won",
          name: "Bookings kept",
          kind: "growth",
          value: extra * x("corporate.serviceFee"),
          what: "Faster quotes mean fewer travellers book direct while they wait.",
          steps: [
            S("Extra bookings", `${num(x("corporate.bookings"))} × ${pct(x("corporate.won"))}`, extra, "num"),
            S("Bookings kept", `${num(extra)} × ${inr(x("corporate.serviceFee"))} service fee`, extra * x("corporate.serviceFee"), "inr"),
          ],
        },
      ];
    },
  },
  {
    id: "forex",
    name: "Forex",
    href: "/forex",
    agents: "Forex Desk · Ravi · Rate Desk · Branch Handoff",
    pitch: "Every forex lead called in minutes, quoted from the live rate, and booked into a branch.",
    feeInput: "vcost",
    inputs: [],
    drivers: () => [],
  },
  {
    id: "planner",
    name: "Trip planner",
    href: "/planner",
    agents: "Trip Planner · Quote Builder · Trip Document Designer",
    pitch: "A planner on your website that turns visitors into priced, designed holiday quotes.",
    feeInput: "fee",
    inputs: [
      { id: "visitors", label: "Website visitors per month", value: 88600, unit: "num", source: "client", note: "From your web analytics." },
      { id: "open", label: "Visitors who open the planner", value: 0.054, unit: "pct", source: "ai", note: "Measured on the widget." },
      { id: "chat", label: "Opens that start a chat", value: 0.5, unit: "pct", source: "ai", note: "Measured on the widget." },
      { id: "lead", label: "Chats that ask for a quote", value: 0.22, unit: "pct", source: "ai", note: "Measured on the widget." },
      { id: "book", label: "Quote requests that book", value: 0.21, unit: "pct", source: "ai", note: "Tracked on the quote desk." },
      { id: "value", label: "Average holiday booking value", value: 191000, unit: "inr", source: "client", note: "Your average package value." },
      { id: "margin", label: "Margin on a holiday package", value: 0.09, unit: "pct", source: "bench", note: "Typical package margin. Replace with your own." },
      { id: "incremental", label: "Bookings that would not have happened", value: 0.4, unit: "pct", source: "est", note: "Visitors who would have left the site without the planner." },
      { id: "quoteMinutes", label: "Minutes saved per quote", value: 40, unit: "min", source: "ai", note: "Quote Builder drafts the price; the designer lays out the PDF." },
      { id: "fee", label: "Vibrium fee, per month", value: 120000, unit: "inr", source: "vib", note: "Widget, quote desk, and documents." },
    ],
    drivers: (x) => {
      const leads = x("planner.visitors") * x("planner.open") * x("planner.chat") * x("planner.lead");
      const bookings = leads * x("planner.book");
      const margin = bookings * x("planner.value") * x("planner.margin");
      const incremental = margin * x("planner.incremental");
      const hours = (leads * x("planner.quoteMinutes")) / 60;
      return [
        {
          id: "revenue",
          name: "New holiday bookings",
          kind: "growth",
          value: incremental,
          what: "Bookings from visitors who would have left the site, valued at your package margin.",
          steps: [
            S("Quote requests", `${num(x("planner.visitors"))} × ${pct(x("planner.open"), 1)} × ${pct(x("planner.chat"))} × ${pct(x("planner.lead"))}`, leads, "num"),
            S("Bookings", `${num(leads)} × ${pct(x("planner.book"))}`, bookings, "num"),
            S("Margin on them", `${num(bookings)} × ${inr(x("planner.value"))} × ${pct(x("planner.margin"))}`, margin, "inr"),
            S("New holiday bookings", `${inr(margin)} × ${pct(x("planner.incremental"))} incremental`, incremental, "inr"),
          ],
        },
        {
          id: "quotes",
          name: "Quote time saved",
          kind: "cost",
          value: hours * hourly(x),
          what: "Experts review a drafted price and a designed PDF instead of building both by hand.",
          steps: [
            S("Hours saved", `${num(leads)} quotes × ${x("planner.quoteMinutes")} min ÷ 60`, hours, "num"),
            S("Quote time saved", `${num(hours)} h × ${inr(hourly(x))}`, hours * hourly(x), "inr"),
          ],
        },
      ];
    },
  },
  {
    id: "care",
    name: "Tour care",
    href: "/prebook",
    agents: "Ravi · pre-tour, in-tour, and completion calls",
    pitch: "Every traveller called before, during, and after the trip, without a call centre.",
    feeInput: "fee",
    inputs: [
      { id: "travellers", label: "Travellers on tour per month", value: 3000, unit: "num", source: "client", note: "Group and customised departures." },
      { id: "calls", label: "Care calls per traveller", value: 3, unit: "num", source: "est", note: "Pre-tour, day 2, and completion." },
      { id: "minutes", label: "Minutes per call, with wrap-up", value: 6, unit: "min", source: "bench", note: "Manual dial, talk, and CRM notes." },
      { id: "rebook", label: "Travellers who book again after a care call", value: 0.015, unit: "pct", source: "est", note: "Completion call offers a future trip." },
      { id: "value", label: "Average repeat booking value", value: 60000, unit: "inr", source: "client", note: "Domestic tour average." },
      { id: "margin", label: "Margin on a repeat booking", value: 0.09, unit: "pct", source: "bench", note: "Package margin." },
      { id: "fee", label: "Vibrium fee, per month", value: 70000, unit: "inr", source: "vib", note: "Care voice agents." },
    ],
    drivers: (x) => {
      const hours = (x("care.travellers") * x("care.calls") * x("care.minutes")) / 60;
      const rebook = x("care.travellers") * x("care.rebook");
      return [
        {
          id: "calls",
          name: "Calls handled by agents",
          kind: "cost",
          value: hours * hourly(x),
          what: "Care calls your team would otherwise dial by hand.",
          steps: [
            S("Call hours", `${num(x("care.travellers"))} × ${x("care.calls")} calls × ${x("care.minutes")} min ÷ 60`, hours, "num"),
            S("Calls handled by agents", `${num(hours)} h × ${inr(hourly(x))}`, hours * hourly(x), "inr"),
          ],
        },
        {
          id: "repeat",
          name: "Repeat bookings",
          kind: "growth",
          value: rebook * x("care.value") * x("care.margin"),
          what: "The completion call takes NPS and offers the next trip while the memory is fresh.",
          steps: [
            S("Repeat bookings", `${num(x("care.travellers"))} × ${pct(x("care.rebook"), 1)}`, rebook, "num"),
            S("Margin on them", `${num(rebook)} × ${inr(x("care.value"))} × ${pct(x("care.margin"))}`, rebook * x("care.value") * x("care.margin"), "inr"),
          ],
        },
      ];
    },
  },
  {
    id: "airlines",
    name: "Airlines",
    href: "/airlines",
    agents: "Schedule Watch · PNR Reader · Refund Guard",
    pitch: "Schedule changes caught, options drafted, and refund rules checked on every PNR.",
    feeInput: "fee",
    inputs: [
      { id: "changes", label: "Schedule changes per month", value: 1200, unit: "num", source: "client", note: "From carrier queues." },
      { id: "minutes", label: "Minutes to handle one by hand", value: 15, unit: "min", source: "bench", note: "Read the PNR, find options, inform the traveller." },
      { id: "adm", label: "Changes that end in an airline debit memo", value: 0.01, unit: "pct", source: "est", note: "Wrong reissue or a missed waiver." },
      { id: "admCost", label: "Average debit memo", value: 6000, unit: "inr", source: "bench", note: "Fare difference plus admin fee." },
      { id: "fee", label: "Vibrium fee, per month", value: 40000, unit: "inr", source: "vib", note: "Airline agents." },
    ],
    drivers: (x) => {
      const hours = (x("airlines.changes") * x("airlines.minutes")) / 60;
      const adms = x("airlines.changes") * x("airlines.adm");
      return [
        { id: "time", name: "Desk time saved", kind: "cost", value: hours * hourly(x), what: "Schedule changes worked by agents, not by the desk.", steps: [S("Hours", `${num(x("airlines.changes"))} × ${x("airlines.minutes")} min ÷ 60`, hours, "num"), S("Desk time saved", `${num(hours)} h × ${inr(hourly(x))}`, hours * hourly(x), "inr")] },
        { id: "adm", name: "Debit memos avoided", kind: "cost", value: adms * x("airlines.admCost"), what: "Refund Guard checks the carrier's waiver before anything is reissued.", steps: [S("Debit memos today", `${num(x("airlines.changes"))} × ${pct(x("airlines.adm"))}`, adms, "dec"), S("Debit memos avoided", `${dec(adms)} × ${inr(x("airlines.admCost"))}`, adms * x("airlines.admCost"), "inr")] },
      ];
    },
  },
  {
    id: "hotels",
    name: "Hotels",
    href: "/hotels",
    agents: "Stay Care · Hotel Liaison · Resolution Guard",
    pitch: "In-stay problems triaged in chat and raised with the hotel against a clock.",
    feeInput: "fee",
    inputs: [
      { id: "issues", label: "In-stay issues per month", value: 800, unit: "num", source: "client", note: "AC, housekeeping, billing, and room moves." },
      { id: "minutes", label: "Minutes saved per issue", value: 20, unit: "min", source: "ai", note: "Triage, hotel follow-up, and closing the loop." },
      { id: "escalate", label: "Issues that end in compensation today", value: 0.1, unit: "pct", source: "est", note: "Refunds, credits, or free nights." },
      { id: "avoided", label: "Of those, avoided by a fast fix", value: 0.5, unit: "pct", source: "est", note: "Fixed inside the hotel's clock." },
      { id: "comp", label: "Average compensation", value: 3000, unit: "inr", source: "est", note: "Per escalated issue." },
      { id: "fee", label: "Vibrium fee, per month", value: 40000, unit: "inr", source: "vib", note: "Stay care agents." },
    ],
    drivers: (x) => {
      const hours = (x("hotels.issues") * x("hotels.minutes")) / 60;
      const avoided = x("hotels.issues") * x("hotels.escalate") * x("hotels.avoided");
      return [
        { id: "time", name: "Desk time saved", kind: "cost", value: hours * hourly(x), what: "Issues triaged and chased by agents.", steps: [S("Hours", `${num(x("hotels.issues"))} × ${x("hotels.minutes")} min ÷ 60`, hours, "num"), S("Desk time saved", `${num(hours)} h × ${inr(hourly(x))}`, hours * hourly(x), "inr")] },
        { id: "comp", name: "Compensation avoided", kind: "cx", value: avoided * x("hotels.comp"), what: "Problems fixed before the guest asks for money back.", steps: [S("Escalations avoided", `${num(x("hotels.issues"))} × ${pct(x("hotels.escalate"))} × ${pct(x("hotels.avoided"))}`, avoided, "num"), S("Compensation avoided", `${num(avoided)} × ${inr(x("hotels.comp"))}`, avoided * x("hotels.comp"), "inr")] },
      ];
    },
  },
  {
    id: "audit",
    name: "Call audit",
    href: "/audit",
    agents: "Recording Intake · QC Evaluator · Coaching Notes",
    pitch: "Every sales call scored on your form, not a 2% sample, with coaching from the misses.",
    feeInput: "fee",
    inputs: [
      { id: "calls", label: "Sales calls per month", value: 8000, unit: "num", source: "client", note: "Recorded calls across lines." },
      { id: "sample", label: "Share audited by hand today", value: 0.02, unit: "pct", source: "bench", note: "Manual QA typically reviews about 2% (Call Centre Helper)." },
      { id: "reviewMinutes", label: "Minutes per manual review", value: 12, unit: "min", source: "bench", note: "Listen, score, and write feedback." },
      { id: "uplift", label: "Conversion uplift from coaching", value: 0.005, unit: "pct", source: "est", note: "Half a point more sales from calls coached on the misses." },
      { id: "marginPerSale", label: "Margin per sale", value: 1500, unit: "inr", source: "client", note: "Blended across forex and holidays." },
      { id: "fee", label: "Vibrium fee, per month", value: 50000, unit: "inr", source: "vib", note: "Audit agents." },
    ],
    drivers: (x) => {
      const hours = (x("audit.calls") * x("audit.sample") * x("audit.reviewMinutes")) / 60;
      const extra = x("audit.calls") * x("audit.uplift");
      return [
        { id: "qa", name: "QA time saved", kind: "cost", value: hours * hourly(x), what: "The manual sample your QA team no longer listens to.", steps: [S("QA hours today", `${num(x("audit.calls"))} × ${pct(x("audit.sample"))} × ${x("audit.reviewMinutes")} min ÷ 60`, hours, "num"), S("QA time saved", `${num(hours)} h × ${inr(hourly(x))}`, hours * hourly(x), "inr")] },
        { id: "coach", name: "Sales from coaching", kind: "growth", value: extra * x("audit.marginPerSale"), what: "Every call scored means every counsellor coached on their real misses.", steps: [S("Extra sales", `${num(x("audit.calls"))} × ${pct(x("audit.uplift"), 1)}`, extra, "num"), S("Sales from coaching", `${num(extra)} × ${inr(x("audit.marginPerSale"))}`, extra * x("audit.marginPerSale"), "inr")] },
      ];
    },
  },
];

/** Value that only exists because the modules share one lead and one traveller record. */
export const SUITE_INPUTS: SuiteInput[] = [
  { id: "attach", label: "Holidays that add forex through the suite", value: 0.25, unit: "pct", source: "est", note: "The planner offers forex and the forex desk calls; a separate tool never sees the holiday." },
  { id: "forexMargin", label: "Margin per forex add-on", value: 1500, unit: "inr", source: "bench", note: "About ₹1.3L of forex per holiday at 1.15%." },
  { id: "insurance", label: "Holidays that add travel insurance", value: 0.3, unit: "pct", source: "est", note: "Offered in the quote and the PDF." },
  { id: "insuranceMargin", label: "Margin per insurance policy", value: 450, unit: "inr", source: "bench", note: "Typical commission." },
  { id: "bundle", label: "Bundle discount on fees, 4 or more modules", value: 0.15, unit: "pct", source: "vib", note: "One contract, one platform." },
];

/* ───────── values ───────── */

export type SuiteValues = Record<string, number>;

export const SUITE_DEFAULTS: SuiteValues = Object.fromEntries([
  ...SHARED_INPUTS.map((input) => [`shared.${input.id}`, input.value]),
  ...MODULES.flatMap((module) => module.inputs.map((input) => [`${module.id}.${input.id}`, input.value])),
  ...SUITE_INPUTS.map((input) => [`suite.${input.id}`, input.value]),
]);

export interface ModuleResult {
  module: SuiteModule;
  enabled: boolean;
  drivers: Driver[];
  value: number;
  fee: number;
  net: number;
  roi: number | null;
}

export interface SuiteResult {
  modules: ModuleResult[];
  value: number;
  feeList: number;
  discount: number;
  fee: number;
  suiteDrivers: Driver[];
  suiteValue: number;
  net: number;
  roi: number | null;
  payback: number;
}

/** Forex drivers come from the detailed forex model, so both pages always agree. */
function forexDrivers(forex: RoiValues): Driver[] {
  const r = computeRoi(forex);
  return [
    { id: "uplift", name: "Conversion uplift", kind: "growth", value: r.uplift, what: "More orders from leads the team already works.", steps: [S("Extra orders", "AI orders − today's orders", r.extra, "num"), S("Conversion uplift", `${num(r.extra)} × ${inr(r.mf)} per order`, r.uplift, "inr")] },
    { id: "leak", name: "Leakage recovery", kind: "growth", value: r.leak, what: "Orders from leads nobody calls today.", steps: [S("Orders recovered", "Unworked leads × connect × booked", r.leakOrd, "num"), S("Leakage recovery", `${num(r.leakOrd)} × ${inr(r.mf)}`, r.leak, "inr")] },
    { id: "cx", name: "Missed calls answered", kind: "cx", value: r.cx, what: "Inbound callers who would have hung up.", steps: [S("Missed-call recovery", `${num(r.cxOrd)} orders × ${inr(r.mf)}`, r.cx, "inr")] },
    { id: "prod", name: "Productivity", kind: "cost", value: r.manpower, what: "Agent effort no longer spent dialling.", steps: [S("Agents freed", `${num(r.worked)} calls ÷ ${num(r.cap)} per agent`, r.fte, "dec"), S("Productivity", `${dec(r.fte)} × ${inr(r.loaded)}`, r.manpower, "inr")] },
    { id: "avoid", name: "Cost avoidance", kind: "cost", value: r.attrCost + r.errCost, what: "Attrition and rework that go away.", steps: [S("Cost avoidance", `${inr(r.attrCost)} attrition + ${inr(r.errCost)} rework`, r.attrCost + r.errCost, "inr")] },
  ];
}

export function computeSuite(x: SuiteValues, enabled: Record<string, boolean>, forex: RoiValues = FOREX_DEFAULTS): SuiteResult {
  const get: Getter = (id) => x[id] ?? SUITE_DEFAULTS[id] ?? 0;
  const modules = MODULES.map((module): ModuleResult => {
    const drivers = module.id === "forex" ? forexDrivers(forex) : module.drivers(get);
    const fee = module.id === "forex" ? forex.vcost : get(`${module.id}.${module.feeInput}`);
    const value = drivers.reduce((sum, driver) => sum + driver.value, 0);
    return { module, enabled: enabled[module.id] !== false, drivers, value, fee, net: value - fee, roi: fee ? value / fee : null };
  });
  const on = modules.filter((module) => module.enabled);

  const plannerOn = on.some((module) => module.module.id === "planner");
  const forexOn = on.some((module) => module.module.id === "forex");
  const holidays = plannerOn
    ? get("planner.visitors") * get("planner.open") * get("planner.chat") * get("planner.lead") * get("planner.book")
    : 0;
  const forexAttach = forexOn ? holidays * get("suite.attach") * get("suite.forexMargin") : 0;
  const insurance = holidays * get("suite.insurance") * get("suite.insuranceMargin");
  const suiteDrivers: Driver[] = plannerOn
    ? [
        {
          id: "forex-attach",
          name: "Forex on every holiday",
          kind: "growth",
          value: forexAttach,
          what: forexOn ? "A holiday booked in the planner goes straight to the forex desk. A standalone tool would never see it." : "Turn on the Forex module to sell forex on the holidays the planner books.",
          steps: [S("Holidays booked", "Trip planner bookings", holidays, "num"), S("Forex on every holiday", `${num(holidays)} × ${pct(get("suite.attach"))} × ${inr(get("suite.forexMargin"))}`, forexAttach, "inr")],
        },
        {
          id: "insurance",
          name: "Insurance in the quote",
          kind: "growth",
          value: insurance,
          what: "Insurance offered in the quote desk and the trip PDF.",
          steps: [S("Insurance in the quote", `${num(holidays)} × ${pct(get("suite.insurance"))} × ${inr(get("suite.insuranceMargin"))}`, insurance, "inr")],
        },
      ]
    : [];
  const suiteValue = suiteDrivers.reduce((sum, driver) => sum + driver.value, 0);

  const value = on.reduce((sum, module) => sum + module.value, 0) + suiteValue;
  const feeList = on.reduce((sum, module) => sum + module.fee, 0);
  const discount = on.length >= 4 ? feeList * get("suite.bundle") : 0;
  const fee = feeList - discount;
  const net = value - fee;
  return {
    modules,
    value,
    feeList,
    discount,
    fee,
    suiteDrivers,
    suiteValue,
    net,
    roi: fee ? value / fee : null,
    payback: value > 0 ? (fee / value) * 30 : 0,
  };
}

export function inputById(id: string): SuiteInput | null {
  const [scope, key] = id.split(".");
  if (scope === "shared") return SHARED_INPUTS.find((input) => input.id === key) ?? null;
  if (scope === "suite") return SUITE_INPUTS.find((input) => input.id === key) ?? null;
  return MODULES.find((module) => module.id === scope)?.inputs.find((input) => input.id === key) ?? null;
}

export function formatSuiteInput(input: SuiteInput, value: number): string {
  if (input.unit === "pct") return pct(value, (value * 100) % 1 ? 1 : 0);
  if (input.unit === "inr") return inr(value);
  if (input.unit === "min") return `${value} min`;
  if (input.unit === "hrs") return `${value} h`;
  return num(value);
}
