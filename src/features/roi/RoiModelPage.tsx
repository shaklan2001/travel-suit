"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AOV_PRESETS,
  DEFAULTS,
  HEADS,
  INPUTS,
  INPUT_BY_ID,
  INPUT_GROUPS,
  SOURCES,
  SOURCE_LABELS,
  computeRoi,
  formatInput,
  formatStep,
  inr,
  num,
  pct,
  times,
  type RoiResult,
  type RoiSource,
  type RoiValues,
  type Step,
  type ValueHead,
} from "../../data/roi-model";

const STORAGE_KEY = "vts.roi.forex.v1";

type TabId = "overview" | "drivers" | "valuation" | "kpi" | "assumptions" | "sources";
type DriverId = (typeof HEADS)[number]["id"] | "unit";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "drivers", label: "Value drivers" },
  { id: "valuation", label: "Valuation" },
  { id: "kpi", label: "KPIs" },
  { id: "assumptions", label: "Assumptions" },
  { id: "sources", label: "Sources" },
];

function loadSaved(): RoiValues {
  const values = { ...DEFAULTS };
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as RoiValues | null;
    if (saved) for (const id of Object.keys(DEFAULTS)) if (Number.isFinite(saved[id])) values[id] = saved[id];
  } catch {
    // No saved edits; defaults apply.
  }
  return values;
}

function SourceTag({ source }: { source: RoiSource }) {
  return (
    <span className={`roi-tag ${source}`}>
      <i aria-hidden="true" />
      {SOURCE_LABELS[source]}
    </span>
  );
}

function StepsTable({ steps }: { steps: Step[] }) {
  return (
    <div className="table-wrap">
      <table className="roi-steps">
        <thead>
          <tr>
            <th>Step</th>
            <th>Working</th>
            <th className="r">Value</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, index) => (
            <tr key={step.label} className={index === steps.length - 1 ? "total" : undefined}>
              <td>{step.label}</td>
              <td className="work">{step.work}</td>
              <td className={step.value < 0 ? "r neg" : "r"}>{formatStep(step.value, step.format)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Value heads and every assumption as CSV, so the numbers open straight in Excel. */
function buildCsv(x: RoiValues, r: RoiResult): string {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [
    ["Forex calling agent ROI"],
    [],
    ["Value heads (per month)", "Value (INR)", "Per year (INR)"],
    ...HEADS.map((head): (string | number)[] => [head.name, Math.round(head.value(r)), Math.round(head.value(r) * 12)]),
    ["Vibrium fee", -x.vcost, -x.vcost * 12],
    ["Net value", Math.round(r.net), Math.round(r.net * 12)],
    ["Return on fee", r.roi == null ? "" : r.roi.toFixed(2)],
    ["Enterprise value created", Math.round(r.ev)],
    [],
    ["Assumption", "Value", "Unit", "Source", "Note"],
    ...INPUTS.map((input): (string | number)[] => [input.label, x[input.id], input.unit, SOURCE_LABELS[input.source], input.note]),
  ];
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

function downloadCsv(x: RoiValues, r: RoiResult) {
  const blob = new Blob([`﻿${buildCsv(x, r)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "forex-agent-roi.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/** Forex calling agent ROI: every figure on the page is driven by the Assumptions tab. */
export function RoiModelPage() {
  const [x, setX] = useState<RoiValues>(DEFAULTS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [driver, setDriver] = useState<DriverId>("uplift");
  const [focusId, setFocusId] = useState<string | null>(null);
  const r = useMemo(() => computeRoi(x), [x]);

  useEffect(() => {
    setX(loadSaved());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(x));
    } catch {
      // Edits last for this visit only.
    }
  }, [x, isLoaded]);

  useEffect(() => {
    if (tab !== "assumptions" || !focusId) return;
    const field = document.getElementById(`roi-f-${focusId}`);
    field?.scrollIntoView({ block: "center" });
    field?.focus();
    setFocusId(null);
  }, [tab, focusId]);

  const setValue = (id: string, value: number) => setX((current) => ({ ...current, [id]: value }));
  const go: Go = (next, options) => {
    setTab(next);
    if (options?.driver) setDriver(options.driver);
    setFocusId(options?.field ?? null);
    if (!options?.field) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const head = HEADS.find((item) => item.id === driver);
  const payback = r.payback != null ? ` · pays back in ${r.payback.toFixed(1)} months` : "";

  return (
    <main className="page roi-page">
      <header className="page-header roi-header">
        <div>
          <p className="kicker">
            <Link href="/roi" className="sr-back">
              Suite ROI
            </Link>{" "}
            · Forex module
          </p>
          <h1>
            Forex calling agent <span className="gradient-text">ROI</span>
          </h1>
          <p className="lede">
            What a voice agent on your forex enquiries is worth each month. Every figure traces back to an assumption you
            can change.
          </p>
        </div>
        <div className="roi-header-tools">
          <div className="roi-aov">
            <span>Average order value</span>
            <div className="segmented" role="group" aria-label="Average order value preset">
              {AOV_PRESETS.map((preset) => (
                <button key={preset.value} type="button" aria-pressed={x.aov === preset.value} onClick={() => setValue("aov", preset.value)}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <button className="roi-export" type="button" onClick={() => downloadCsv(x, r)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
            </svg>
            Export to Excel
          </button>
        </div>
      </header>

      <section className="card roi-hero" aria-label="Headline value" aria-live="polite">
        <div className="roi-hero-main">
          <p className="kicker">Net value per month</p>
          <strong className={r.net < 0 ? "roi-hero-num neg" : "roi-hero-num gradient-text"}>{inr(r.net)}</strong>
          <p className="roi-hero-sub">
            {inr(r.net * 12)} a year after the Vibrium fee{payback}
          </p>
        </div>
        <dl className="roi-hero-stats">
          <div>
            <dt>Value delivered</dt>
            <dd>{inr(r.benefit)}</dd>
            <small>per month</small>
          </div>
          <div>
            <dt>Vibrium fee</dt>
            <dd>{inr(x.vcost)}</dd>
            <small>per month</small>
          </div>
          <div>
            <dt>Return on fee</dt>
            <dd>{times(r.roi)}</dd>
            <small>value ÷ fee</small>
          </div>
          <div>
            <dt>Enterprise value</dt>
            <dd>{inr(r.ev)}</dd>
            <small>created</small>
          </div>
        </dl>
      </section>

      <div className="roi-tabs" role="tablist" aria-label="ROI sections">
        {TABS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => go(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? <Overview x={x} r={r} go={go} /> : null}
      {tab === "drivers" ? (
        <div className="roi-drivers">
          <nav className="roi-driver-list" aria-label="Value drivers">
            {HEADS.map((item) => {
              const value = item.value(r);
              return (
                <button key={item.id} type="button" aria-current={driver === item.id ? "true" : undefined} onClick={() => setDriver(item.id)}>
                  <i className={`roi-dot ${item.kind}`} aria-hidden="true" />
                  <span>
                    {item.name}
                    <small>{item.bucket}</small>
                  </span>
                  <b className={value < 0 ? "neg" : undefined}>{inr(value)}</b>
                </button>
              );
            })}
            <button type="button" aria-current={driver === "unit" ? "true" : undefined} onClick={() => setDriver("unit")}>
              <i className="roi-dot unit" aria-hidden="true" />
              <span>
                Value per order
                <small>Basis for every revenue driver</small>
              </span>
              <b>{inr(r.mf)}</b>
            </button>
          </nav>
          <div className="roi-driver-detail">
            {head ? <HeadView head={head} x={x} r={r} go={go} /> : <UnitValue x={x} r={r} go={go} />}
          </div>
        </div>
      ) : null}
      {tab === "valuation" ? <Valuation x={x} r={r} go={go} /> : null}
      {tab === "kpi" ? <Kpis x={x} r={r} /> : null}
      {tab === "assumptions" ? <Assumptions x={x} setValue={setValue} reset={() => setX({ ...DEFAULTS })} /> : null}
      {tab === "sources" ? <Sources x={x} /> : null}
    </main>
  );
}

type Go = (tab: TabId, options?: { field?: string; driver?: DriverId }) => void;

function UsedChips({ ids, x, go }: { ids: string[]; x: RoiValues; go: Go }) {
  return (
    <div className="roi-used">
      {ids.map((id) => (
        <button key={id} type="button" className="roi-chip" onClick={() => go("assumptions", { field: id })}>
          <i className={`roi-dot ${INPUT_BY_ID[id].source}`} aria-hidden="true" />
          <span>{INPUT_BY_ID[id].label}</span>
          <b>{formatInput(id, x)}</b>
        </button>
      ))}
    </div>
  );
}

function Bignum({ label, value, sub, negative }: { label: string; value: string; sub: string; negative?: boolean }) {
  return (
    <div className="card roi-big">
      <span>{label}</span>
      <strong className={negative ? "neg" : undefined}>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

function Section({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <section className="roi-section">
      <header className="roi-section-head">
        <h2>{title}</h2>
        <p>{lede}</p>
      </header>
      {children}
    </section>
  );
}

function Overview({ x, r, go }: { x: RoiValues; r: RoiResult; go: Go }) {
  const rows = HEADS.map((head) => ({ head, value: head.value(r) }));
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), x.vcost, 1);
  const hasNegative = rows.some((row) => row.value < 0);
  const zero = hasNegative ? Math.min(35, Math.max(...rows.map((row) => (row.value < 0 ? (Math.abs(row.value) / max) * 100 : 0))) + 2) : 0;
  const span = 100 - zero;
  const estimates = INPUTS.filter((input) => input.source === "est").length;
  const growthShare = r.benefit ? r.revTotal / r.benefit : 0;

  const bar = (label: string, value: number, kind: string, target?: DriverId) => {
    const width = (Math.abs(value) / max) * span;
    const left = value < 0 ? Math.max(0, zero - width) : zero;
    return (
      <div className="roi-bar" key={label}>
        {target ? (
          <button type="button" className="roi-bar-label" onClick={() => go("drivers", { driver: target })}>
            {label}
          </button>
        ) : (
          <span className="roi-bar-label">{label}</span>
        )}
        <div className="roi-track">
          {hasNegative ? <i className="zero" style={{ left: `${zero}%` }} /> : null}
          <i className={`fill ${value < 0 ? "n" : kind}`} style={{ left: `${left}%`, width: `${width}%` }} />
        </div>
        <span className={value < 0 ? "roi-amt neg" : "roi-amt"}>{inr(value)}</span>
      </div>
    );
  };

  const checks = [
    r.extra < 0 ? "Conversion uplift is negative at the 12% travel benchmark. Enter your actual human FX conversion; the benchmark is not FX-specific." : null,
    "Validate the order value: ₹76,000 is a typical digital average; ₹1.5L is the assisted-order figure to test.",
    x.inb ? null : "Add your inbound FX call volume to switch on the customer experience driver.",
    "Confirm the monthly fee against your commercials.",
  ].filter((item): item is string => item !== null);

  return (
    <div className="roi-overview">
      <div className="roi-overview-grid">
        <section className="card roi-panel">
          <header className="roi-panel-head">
            <h2>Monthly value by driver</h2>
            <p>Revenue drivers are valued at the margin you earn per fulfilled order. Cost drivers use the loaded cost of the agents and rework they replace.</p>
          </header>
          <div className="roi-bars">
            {rows.map(({ head, value }) => bar(head.name, value, head.kind, head.id))}
            <hr />
            {bar("Vibrium fee", -x.vcost, "n")}
          </div>
          <div className="roi-legend">
            <span className="roi-tag growth"><i aria-hidden="true" />Revenue growth</span>
            <span className="roi-tag cx"><i aria-hidden="true" />Customer experience</span>
            <span className="roi-tag cost"><i aria-hidden="true" />Cost saving</span>
            <span className="roi-tag loss"><i aria-hidden="true" />Fee or negative</span>
          </div>
        </section>

        <section className="card roi-panel">
          <header className="roi-panel-head">
            <h2>How it adds up</h2>
          </header>
          <table className="roi-plain">
            <tbody>
              <tr><td>Revenue growth drivers</td><td className="r">{inr(r.revTotal)}</td></tr>
              <tr><td>Cost saving drivers</td><td className="r">{inr(r.costTotal)}</td></tr>
              <tr><td>Vibrium fee</td><td className="r neg">{inr(-x.vcost)}</td></tr>
              <tr className="total"><td>Net value per month</td><td className={r.net < 0 ? "r neg" : "r"}>{inr(r.net)}</td></tr>
            </tbody>
          </table>
          <p className="roi-text">
            <b>{num(r.ordGained)}</b> extra orders a month, each worth {inr(r.mf)} in revenue now and about {inr(r.ltv)} over three
            years with repeat purchases.
          </p>
          <p className="roi-text">
            {pct(growthShare, 0)} of the value is revenue growth, which listed companies are rewarded for more than cost cuts.{" "}
            <button type="button" className="roi-link" onClick={() => go("valuation")}>See valuation</button>
          </p>
        </section>
      </div>

      <section className="card roi-panel">
        <header className="roi-panel-head">
          <h2>Worth confirming</h2>
          <p>
            {estimates} of {INPUTS.length} inputs are estimates.{" "}
            <button type="button" className="roi-link" onClick={() => go("assumptions")}>Review assumptions</button>
          </p>
        </header>
        <ul className="roi-checks">
          {checks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Assumptions({ x, setValue, reset }: { x: RoiValues; setValue: (id: string, value: number) => void; reset: () => void }) {
  const stepFor = (unit: string) => (unit === "pct" ? "0.01" : unit === "inr" ? "1000" : "1");
  const suffix: Record<string, string> = { pct: "%", x: "×", min: "min", mo: "mo", cr: "Cr" };
  const edited = INPUTS.filter((input) => x[input.id] !== input.value).length;
  return (
    <Section title="Assumptions" lede="Pre-loaded starting points. Change any of them and every figure updates. Percentages are entered as whole numbers.">
      <div className="roi-assume-bar">
        <div className="roi-legend">
          {(Object.keys(SOURCE_LABELS) as RoiSource[]).map((source) => (
            <SourceTag key={source} source={source} />
          ))}
        </div>
        <button type="button" className="roi-btn" onClick={reset} disabled={edited === 0}>
          {edited === 0 ? "Using defaults" : `Reset ${edited} edited`}
        </button>
      </div>
      {INPUT_GROUPS.map((group, groupIndex) => (
        <div className="card roi-panel roi-group" key={group}>
          <h3>{group}</h3>
          {INPUTS.filter((input) => input.group === groupIndex).map((input) => {
            const value = x[input.id];
            const shown = input.unit === "pct" ? Number((value * 100).toFixed(4)) : value;
            const isEdited = value !== input.value;
            return (
              <div key={input.id} className={`roi-irow${input.source === "est" ? " est" : ""}${isEdited ? " edited" : ""}`}>
                <div className="roi-ilabel">
                  <label htmlFor={`roi-f-${input.id}`}>{input.label}</label>
                  <p>{input.note}</p>
                  <div className="roi-imeta">
                    <SourceTag source={input.source} />
                    {isEdited ? (
                      <button type="button" className="roi-link" onClick={() => setValue(input.id, input.value)}>
                        Reset to {input.unit === "pct" ? pct(input.value, 2) : input.unit === "inr" ? inr(input.value) : input.value}
                      </button>
                    ) : null}
                  </div>
                </div>
                <span className="roi-field">
                  {input.unit === "inr" ? <span>₹</span> : null}
                  <input
                    id={`roi-f-${input.id}`}
                    type="number"
                    inputMode="decimal"
                    step={stepFor(input.unit)}
                    value={shown}
                    onChange={(event) => {
                      const parsed = parseFloat(event.target.value);
                      if (Number.isFinite(parsed)) setValue(input.id, input.unit === "pct" ? parsed / 100 : parsed);
                    }}
                  />
                  {suffix[input.unit] ? <span>{suffix[input.unit]}</span> : null}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </Section>
  );
}

function HeadView({ head, x, r, go }: { head: ValueHead; x: RoiValues; r: RoiResult; go: Go }) {
  const value = head.value(r);
  const read = head.read?.(x, r);
  return (
    <Section title={head.name} lede={head.what}>
      <div className="roi-grid">
        <div className="card roi-panel">
          <StepsTable steps={head.steps(x, r)} />
          {read ? <p className="roi-callout">{read}</p> : null}
        </div>
        <div>
          <Bignum label={`${head.bucket}, per month`} value={inr(value)} sub={`${inr(value * 12)} a year`} negative={value < 0} />
          <h3 className="roi-h3">Inputs used</h3>
          <p className="meta">Select one to edit it.</p>
          <UsedChips ids={head.uses} x={x} go={go} />
          {head.id === "prod" ? (
            <>
              <h3 className="roi-h3">Cost per order</h3>
              <table className="roi-plain">
                <tbody>
                  <tr><td>Human agent</td><td className="r">{inr(r.costHumanOrder)}</td></tr>
                  <tr><td>Vibrium AI</td><td className="r">{inr(r.costAIOrder)}</td></tr>
                </tbody>
              </table>
              <p className="meta">
                Human: loaded cost ÷ (calls a month × today&apos;s conversion). AI: fee ÷ all AI orders. AI talk time this month:{" "}
                {num(x.leads * x.conn * x.dur)} minutes.
              </p>
            </>
          ) : null}
          {head.id === "avoid" ? (
            <p className="roi-callout info">
              <b>Not counted: regulatory exposure.</b> FX sales carry KYC, LRS and FEMA obligations, and regulators do penalise
              lapses (for example, RBI fined an authorised dealer ₹36.28 lakh in March 2025 over LRS reporting). The QA agent
              audits 100% of calls against a script, where manual QA typically reviews about 2%. Raise this as risk reduction,
              not as rupees.
            </p>
          ) : null}
          {head.id === "cx" ? (
            <>
              <h3 className="roi-h3">Customer experience signals</h3>
              <ul className="roi-list">
                <li>Speed to first call: AI within minutes, against an average company response of 38 hours (InsideSales audit of 4,723 firms).</li>
                <li>Availability: every call answered, after hours too. a voice bot removes abandoned calls.</li>
                <li>Consistency: same rate, same disclosures, every call.</li>
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function UnitValue({ x, r, go }: { x: RoiValues; r: RoiResult; go: Go }) {
  const steps: Step[] = [
    { label: "Revenue per order", work: `${inr(x.aov)} × ${pct(x.margin, 2)} margin`, value: r.m, format: "inr" },
    { label: "Revenue per booked order", work: `${inr(r.m)} × ${pct(x.fulfil)} fulfilled`, value: r.mf, format: "inr" },
    { label: "EBIT per booked order", work: `${inr(r.mf)} × ${pct(x.drop, 1)} FX EBIT margin`, value: r.ebitOrder, format: "inr" },
    { label: "Three-year value per customer", work: `${inr(r.mf)} × (1 + ${x.repeat} repeat purchase)`, value: r.ltv, format: "inr" },
  ];
  const range: [number, number][] = [[76000, 0.005], [76000, 0.0115], [150000, 0.0115], [150000, 0.02]];
  return (
    <Section title="Value per order" lede="What one FX order is worth to you. Every revenue head uses this number, so it is the first thing to validate.">
      <div className="roi-grid">
        <div className="card roi-panel">
          <StepsTable steps={steps} />
          <p className="roi-callout info">
            Order value: ₹76,000 is a typical average digital forex transaction. Assisted orders through calls and branches are
            likely larger, so test ₹1.5L against your own order data before you rely on it.
          </p>
        </div>
        <div>
          <Bignum label="Revenue per booked order" value={inr(r.mf)} sub={`${inr(r.ltv)} over three years`} />
          <h3 className="roi-h3">Inputs used</h3>
          <UsedChips ids={["aov", "margin", "fulfil", "drop", "repeat"]} x={x} go={go} />
          <h3 className="roi-h3">Range to show</h3>
          <table className="roi-plain">
            <tbody>
              {range.map(([aov, margin]) => (
                <tr key={`${aov}-${margin}`}>
                  <td>{inr(aov)} at {pct(margin, 2)}</td>
                  <td className="r">{inr(aov * margin * x.fulfil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="meta">Margin range: the VE review discussed a 1.15% customer-facing markup and 0.5–3% spreads; some banks charge retail customers 3–5% (Business Standard, 2025).</p>
        </div>
      </div>
    </Section>
  );
}

function Valuation({ x, r, go }: { x: RoiValues; r: RoiResult; go: Go }) {
  const steps: Step[] = [
    { label: "Annual revenue from growth heads", work: `${inr(r.revTotal)} × 12`, value: r.revTotal * 12, format: "inr" },
    { label: "EBIT from growth", work: `${inr(r.revTotal * 12)} × ${pct(x.drop, 1)}`, value: r.ebitGrow, format: "inr" },
    { label: "EBIT from cost heads, after fee", work: `(${inr(r.costTotal)} − ${inr(x.vcost)}) × 12`, value: r.ebitCost, format: "inr" },
    { label: "Enterprise value from growth", work: `${inr(r.ebitGrow)} × ${x.mGrow}×`, value: r.evGrow, format: "inr" },
    { label: "Enterprise value from cost", work: `${inr(r.ebitCost)} × ${x.mCost}×`, value: r.evCost, format: "inr" },
    { label: "Enterprise value created", work: `${inr(r.evGrow)} + ${inr(r.evCost)}`, value: r.ev, format: "inr" },
  ];
  return (
    <Section title="Valuation impact" lede="If you are listed, the board reads value through earnings and the multiple the market pays for them. Revenue growth is valued at a higher multiple than cost savings, because investors reward growth that can repeat.">
      <div className="roi-grid">
        <div className="card roi-panel">
          <StepsTable steps={steps} />
          <p className="roi-callout info">
            The fee is charged against the cost heads, so if the agents saved cost less than the fee, that line goes negative and
            pulls value down. Revenue EBIT uses the FX segment&apos;s 45.3% margin, which is conservative for extra orders on
            existing infrastructure.
          </p>
        </div>
        <div>
          <Bignum label="Enterprise value created" value={inr(r.ev)} sub="" negative={r.ev < 0} />
          <table className="roi-plain">
            <tbody>
              <tr><td>Extra EBIT a year</td><td className="r">{inr(r.ebit)}</td></tr>
              <tr><td>As a share of FX segment EBIT</td><td className="r">{pct(r.ofFx, 2)}</td></tr>
              <tr><td>Per share</td><td className="r">₹{r.perShare == null ? "—" : r.perShare.toFixed(2)}</td></tr>
            </tbody>
          </table>
          <h3 className="roi-h3">Inputs used</h3>
          <UsedChips ids={["drop", "mGrow", "mCost", "shares", "fxEbit"]} x={x} go={go} />
          <h3 className="roi-h3">Why growth earns the higher multiple</h3>
          <ul className="roi-list">
            <li>Treacy &amp; Company, ~500 US companies: organic revenue growth is the strongest financial driver of shareholder value; margin gains correlate only modestly with stock returns.</li>
            <li>McKinsey, 615 large companies: firms that kept pushing margins up for years tended to fall behind peers on shareholder return.</li>
            <li>The multiples here are typical for listed travel services (about 10× EV/EBIT today, 12× for growth). Change the two multiples to show the difference between growth and cost value.</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

function Kpis({ x, r }: { x: RoiValues; r: RoiResult }) {
  const status = (value: number, benchmark: number | null, higherIsBetter: boolean) => {
    if (benchmark == null) return <span className="roi-status na">No benchmark</span>;
    const ok = higherIsBetter ? value >= benchmark : value <= benchmark;
    return <span className={`roi-status ${ok ? "ok" : "bad"}`}>{ok ? "At or better" : "Below"}</span>;
  };
  const pulse: [string, string, string][] = [
    ["Value to your business a month", inr(r.benefit), "Sum of value heads"],
    ["Net value a month", inr(r.net), "Value − Vibrium fee"],
    ["Return on fee", times(r.roi), "Value ÷ fee"],
    ["Revenue per lead called", inr(r.aiRate * r.mf), "AI orders × revenue per booked order ÷ leads"],
    ["Cost per order, AI vs human", `${inr(r.costAIOrder)} vs ${inr(r.costHumanOrder)}`, "Fee ÷ AI orders; loaded agent cost ÷ agent orders"],
    ["Extra EBIT a year", inr(r.ebit), "See Valuation impact"],
    ["Enterprise value created", inr(r.ev), "EBIT × multiples"],
  ];
  const signals: [string, string, string, ReactNode][] = [
    ["Connect rate", pct(x.conn), "Cold pickup in India ≈20%; AI collections 31–48% first try", status(x.conn, 0.31, true)],
    ["Orders booked, of connected", pct(x.succ), "Inbound travel calls convert 41% on the call (Invoca); outbound runs lower", status(0, null, true)],
    ["Lead-to-order conversion", pct(r.aiRate, 2), "12% travel booking, low confidence", status(r.aiRate, x.base, true)],
    ["Leads followed up", pct(1), `${pct(x.cov)} today (benchmark)`, status(1, x.cov, true)],
    ["Time to first call", "Minutes", "38 hours average (InsideSales); typical purchase cycle 4–7 days", status(1, 0, true)],
    ["Average call duration", `${x.dur} min`, "Track trend; no benchmark", status(0, null, true)],
    ["Booked orders fulfilled", pct(x.fulfil), "Track against your fulfilment", status(0, null, true)],
    ["Inbound abandonment", "≈0%", `${pct(x.aband, 2)} average (Talkdesk)`, status(0, x.aband, false)],
    ["Calls audited by QA agent", "100%", "≤2% with manual QA (Call Centre Helper)", status(1, 0.02, true)],
  ];
  return (
    <Section title="KPIs" lede="Pulse is the financial view for business heads; signals are the operational view the team tracks weekly. Once the agent has run for a few weeks, replace modelled values with actuals from the Vibrium dashboard.">
      <div className="roi-overview">
        <section>
          <h3 className="roi-h3 roi-h3-gap">Pulse · financial</h3>
          <div className="roi-pulse">
            {pulse.map(([kpi, value, how]) => (
              <article className="card roi-pulse-card" key={kpi}>
                <span>{kpi}</span>
                <strong>{value}</strong>
                <small>{how}</small>
              </article>
            ))}
          </div>
        </section>
        <section>
          <h3 className="roi-h3 roi-h3-gap">Signals · operational</h3>
          <div className="card roi-panel roi-flush">
            <div className="table-wrap">
              <table className="roi-kpi-table">
                <thead>
                  <tr><th>KPI</th><th className="r">Value</th><th>Benchmark</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {signals.map(([kpi, value, benchmark, badge]) => (
                    <tr key={kpi}><td className="kpi-name">{kpi}</td><td className="r">{value}</td><td className="work">{benchmark}</td><td>{badge}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </Section>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Sources({ x }: { x: RoiValues }) {
  return (
    <Section title="Sources" lede="Every benchmark used in the model. Inputs tagged as estimates have no published source and should be validated against your own data.">
      <div className="roi-overview">
        <section className="card roi-panel roi-flush">
          <ul className="roi-source-list">
            {SOURCES.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  <span>{source.title}</span>
                  <small>{hostOf(source.url)}</small>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="roi-h3 roi-h3-gap">Estimates to validate</h3>
          <div className="card roi-panel roi-flush">
            <ul className="roi-estimates">
              {INPUTS.filter((input) => input.source === "est").map((input) => (
                <li key={input.id}>
                  <div>
                    <strong>{input.label}</strong>
                    <small>{input.note}</small>
                  </div>
                  <b>{formatInput(input.id, x)}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </Section>
  );
}
