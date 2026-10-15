"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULTS as FOREX_DEFAULTS, formatStep, inr, pct, SOURCE_LABELS, times, type RoiValues, type Step } from "../../data/roi-model";
import {
  computeSuite,
  formatSuiteInput,
  inputById,
  MODULES,
  SHARED_INPUTS,
  SUITE_DEFAULTS,
  SUITE_INPUTS,
  type Driver,
  type ModuleResult,
  type SuiteInput,
  type SuiteResult,
  type SuiteValues,
} from "../../data/suite-roi";

const SUITE_KEY = "vts.roi.suite.v1";
const FOREX_KEY = "vts.roi.forex.v1";

type TabId = "overview" | "modules" | "why" | "assumptions";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "modules", label: "By module" },
  { id: "why", label: "Why a suite" },
  { id: "assumptions", label: "Assumptions" },
];

interface Saved {
  values: SuiteValues;
  enabled: Record<string, boolean>;
}

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

/** Travel Suite ROI: every module's value, what the suite adds on top, and the return on the whole fee. */
export function SuiteRoiPage() {
  const [values, setValues] = useState<SuiteValues>(SUITE_DEFAULTS);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [forex, setForex] = useState<RoiValues>(FOREX_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [selected, setSelected] = useState<string>("planner");
  const [focusId, setFocusId] = useState<string | null>(null);
  const r = useMemo(() => computeSuite(values, enabled, forex), [values, enabled, forex]);

  useEffect(() => {
    const saved = readJson<Saved>(SUITE_KEY);
    if (saved) {
      const clean: SuiteValues = { ...SUITE_DEFAULTS };
      for (const key of Object.keys(SUITE_DEFAULTS)) if (Number.isFinite(saved.values?.[key])) clean[key] = saved.values[key];
      setValues(clean);
      setEnabled(saved.enabled ?? {});
    }
    const savedForex = readJson<RoiValues>(FOREX_KEY);
    if (savedForex) setForex({ ...FOREX_DEFAULTS, ...savedForex });
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(SUITE_KEY, JSON.stringify({ values, enabled }));
    } catch {
      // Edits last for this visit only.
    }
  }, [values, enabled, loaded]);

  useEffect(() => {
    if (tab !== "assumptions" || !focusId) return;
    const field = document.getElementById(`sr-f-${focusId}`);
    field?.scrollIntoView({ block: "center" });
    field?.focus();
    setFocusId(null);
  }, [tab, focusId]);

  const go = (next: TabId, options?: { module?: string; field?: string }) => {
    setTab(next);
    if (options?.module) setSelected(options.module);
    setFocusId(options?.field ?? null);
    if (!options?.field) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const setValue = (id: string, value: number) => setValues((current) => ({ ...current, [id]: value }));
  const toggle = (id: string) => setEnabled((current) => ({ ...current, [id]: current[id] === false }));
  const on = r.modules.filter((module) => module.enabled).length;

  return (
    <main className="page roi-page">
      <header className="page-header roi-header">
        <div>
          <p className="kicker">Automation · Travel Suite</p>
          <h1>
            Travel Suite <span className="gradient-text">ROI</span>
          </h1>
          <p className="lede">
            What every agent in the suite is worth to your business each month, what the suite adds that separate tools cannot,
            and the return on one fee.
          </p>
        </div>
        <div className="roi-header-tools">
          <Link className="roi-export" href="/roi/forex">
            Forex calling model
          </Link>
          <button className="roi-export" type="button" onClick={() => downloadCsv(r, values)}>
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
            {inr(r.net * 12)} a year after the fee · the fee is earned back in {Math.max(Math.round(r.payback), 1)} days each month
          </p>
        </div>
        <dl className="roi-hero-stats">
          <div>
            <dt>Value delivered</dt>
            <dd>{inr(r.value)}</dd>
            <small>per month</small>
          </div>
          <div>
            <dt>Suite fee</dt>
            <dd>{inr(r.fee)}</dd>
            <small>{r.discount > 0 ? `${inr(r.discount)} bundle saving` : "per month"}</small>
          </div>
          <div>
            <dt>Return on fee</dt>
            <dd>{times(r.roi)}</dd>
            <small>value ÷ fee</small>
          </div>
          <div>
            <dt>Modules on</dt>
            <dd>
              {on} of {MODULES.length}
            </dd>
            <small>switch any off below</small>
          </div>
        </dl>
      </section>

      <div className="roi-tabs" role="tablist" aria-label="Suite ROI sections">
        {TABS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => go(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? <Overview r={r} toggle={toggle} go={go} /> : null}
      {tab === "modules" ? <ByModule r={r} selected={selected} setSelected={setSelected} values={values} go={go} /> : null}
      {tab === "why" ? <WhySuite r={r} /> : null}
      {tab === "assumptions" ? (
        <Assumptions values={values} setValue={setValue} reset={() => setValues({ ...SUITE_DEFAULTS })} />
      ) : null}
    </main>
  );
}

type Go = (tab: TabId, options?: { module?: string; field?: string }) => void;

function Overview({ r, toggle, go }: { r: SuiteResult; toggle: (id: string) => void; go: Go }) {
  const on = r.modules.filter((module) => module.enabled);
  const max = Math.max(...on.map((module) => module.value), r.suiteValue, 1);
  const moduleTotal = on.reduce((sum, module) => sum + module.value, 0);
  const growth = [...on.flatMap((module) => module.drivers), ...r.suiteDrivers].filter((driver) => driver.kind !== "cost").reduce((sum, driver) => sum + driver.value, 0);

  return (
    <div className="roi-overview">
      <div className="roi-overview-grid">
        <section className="card roi-panel">
          <header className="roi-panel-head">
            <h2>Monthly value by module</h2>
            <p>Each bar is what the module's agents earn or save in a month. Select one to see the working.</p>
          </header>
          <div className="roi-bars">
            {on.map((module) => (
              <div className="roi-bar sr-bar" key={module.module.id}>
                <button type="button" className="roi-bar-label" onClick={() => go("modules", { module: module.module.id })}>
                  {module.module.name}
                </button>
                <div className="roi-track">
                  <i className="fill cost" style={{ left: 0, width: `${(Math.max(module.value, 0) / max) * 100}%` }} />
                </div>
                <span className="roi-amt">{inr(module.value)}</span>
                <span className="sr-roi">{times(module.roi)}</span>
              </div>
            ))}
            {r.suiteDrivers.length > 0 ? (
              <>
                <hr />
                <div className="roi-bar sr-bar">
                  <button type="button" className="roi-bar-label" onClick={() => go("modules", { module: "suite" })}>
                    Suite effects
                  </button>
                  <div className="roi-track">
                    <i className="fill growth" style={{ left: 0, width: `${(r.suiteValue / max) * 100}%` }} />
                  </div>
                  <span className="roi-amt">{inr(r.suiteValue)}</span>
                  <span className="sr-roi">only in a suite</span>
                </div>
              </>
            ) : null}
          </div>
        </section>

        <section className="card roi-panel">
          <header className="roi-panel-head">
            <h2>How it adds up</h2>
          </header>
          <table className="roi-plain">
            <tbody>
              <tr><td>Value from {on.length} modules</td><td className="r">{inr(moduleTotal)}</td></tr>
              <tr><td>Suite effects</td><td className="r">{inr(r.suiteValue)}</td></tr>
              <tr><td>Fees at list price</td><td className="r neg">{inr(-r.feeList)}</td></tr>
              {r.discount > 0 ? <tr><td>Bundle discount</td><td className="r">{inr(r.discount)}</td></tr> : null}
              <tr className="total"><td>Net value per month</td><td className={r.net < 0 ? "r neg" : "r"}>{inr(r.net)}</td></tr>
            </tbody>
          </table>
          <p className="roi-text">
            {pct(r.value ? growth / r.value : 0, 0)} of the value is new revenue, not just cost saved.
            {on.every((module) => (module.roi ?? 0) > 1) ? " Every module on its own returns more than its fee." : ""}
          </p>
        </section>
      </div>

      <section>
        <h3 className="roi-h3 roi-h3-gap">Modules in your plan</h3>
        <div className="sr-modules">
          {r.modules.map((module) => (
            <article key={module.module.id} className={`card sr-module${module.enabled ? "" : " off"}`}>
              <header>
                <div>
                  <h3>{module.module.name}</h3>
                  <p>{module.module.pitch}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  className="pl-switch"
                  aria-checked={module.enabled}
                  aria-label={`Include ${module.module.name}`}
                  onClick={() => toggle(module.module.id)}
                >
                  <i aria-hidden="true" />
                </button>
              </header>
              <dl>
                <div>
                  <dt>Value</dt>
                  <dd>{inr(module.value)}</dd>
                </div>
                <div>
                  <dt>Fee</dt>
                  <dd>{inr(module.fee)}</dd>
                </div>
                <div>
                  <dt>Return</dt>
                  <dd className="sr-return">{times(module.roi)}</dd>
                </div>
              </dl>
              <button type="button" className="roi-link" onClick={() => go("modules", { module: module.module.id })}>
                See the working
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
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

function DriverCard({ driver }: { driver: Driver }) {
  return (
    <section className="card roi-panel">
      <header className="roi-panel-head sr-driver-head">
        <div>
          <h2>{driver.name}</h2>
          <p>{driver.what}</p>
        </div>
        <strong className={driver.value < 0 ? "neg" : undefined}>{inr(driver.value)}</strong>
      </header>
      <StepsTable steps={driver.steps} />
    </section>
  );
}

function ByModule({
  r,
  selected,
  setSelected,
  values,
  go,
}: {
  r: SuiteResult;
  selected: string;
  setSelected: (id: string) => void;
  values: SuiteValues;
  go: Go;
}) {
  const current: ModuleResult | null = r.modules.find((module) => module.module.id === selected) ?? null;

  return (
    <div className="roi-drivers">
      <nav className="roi-driver-list" aria-label="Modules">
        {r.modules.map((module) => (
          <button key={module.module.id} type="button" aria-current={selected === module.module.id ? "true" : undefined} onClick={() => setSelected(module.module.id)}>
            <i className={`roi-dot ${module.enabled ? "cost" : "unit"}`} aria-hidden="true" />
            <span>
              {module.module.name}
              <small>{module.enabled ? `${times(module.roi)} return` : "Not in the plan"}</small>
            </span>
            <b>{inr(module.value)}</b>
          </button>
        ))}
        <button type="button" aria-current={selected === "suite" ? "true" : undefined} onClick={() => setSelected("suite")}>
          <i className="roi-dot growth" aria-hidden="true" />
          <span>
            Suite effects
            <small>Only when modules share a lead</small>
          </span>
          <b>{inr(r.suiteValue)}</b>
        </button>
      </nav>

      <div className="roi-driver-detail sr-detail">
        {current ? (
          <>
            <header className="roi-section-head">
              <h2>{current.module.name}</h2>
              <p>{current.module.pitch}</p>
              <p className="sr-agents">
                Agents: {current.module.agents} ·{" "}
                <Link href={current.module.href} className="roi-link">
                  Open the module
                </Link>
              </p>
            </header>
            <div className="sr-module-sum">
              <div>
                <span>Value</span>
                <strong>{inr(current.value)}</strong>
              </div>
              <div>
                <span>Fee</span>
                <strong>{inr(current.fee)}</strong>
              </div>
              <div>
                <span>Net</span>
                <strong>{inr(current.net)}</strong>
              </div>
              <div>
                <span>Return</span>
                <strong className="gradient-text">{times(current.roi)}</strong>
              </div>
            </div>
            {current.drivers.map((driver) => (
              <DriverCard key={driver.id} driver={driver} />
            ))}
            {current.module.id === "forex" ? (
              <p className="roi-callout info">
                Forex uses the detailed forex calling model, with its own 27 assumptions and sources.{" "}
                <Link href="/roi/forex" className="roi-link">
                  Open the forex model
                </Link>
              </p>
            ) : (
              <section>
                <h3 className="roi-h3 roi-h3-gap">Inputs used</h3>
                <div className="roi-used sr-used">
                  {[...current.module.inputs.map((input) => `${current.module.id}.${input.id}`), "shared.deskCost"].map((id) => {
                    const input = inputById(id) as SuiteInput;
                    return (
                      <button key={id} type="button" className="roi-chip" onClick={() => go("assumptions", { field: id })}>
                        <i className={`roi-dot ${input.source}`} aria-hidden="true" />
                        <span>{input.label}</span>
                        <b>{formatSuiteInput(input, values[id])}</b>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            <header className="roi-section-head">
              <h2>Suite effects</h2>
              <p>
                Value no single tool can create, because the planner, the quote desk, and the forex desk share one lead and one
                traveller record.
              </p>
            </header>
            {r.suiteDrivers.length > 0 ? (
              r.suiteDrivers.map((driver) => <DriverCard key={driver.id} driver={driver} />)
            ) : (
              <p className="roi-callout">Turn on the Trip planner to see suite effects: it is where the holidays come from.</p>
            )}
            {r.discount > 0 ? (
              <section className="card roi-panel">
                <header className="roi-panel-head sr-driver-head">
                  <div>
                    <h2>Bundle discount</h2>
                    <p>One platform and one contract for four or more modules.</p>
                  </div>
                  <strong>{inr(r.discount)}</strong>
                </header>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

const COMPARE: [string, string, string][] = [
  ["The traveller", "Re-explains the trip to each tool and each desk", "Tells it once; every agent works from the same lead"],
  ["A holiday booking", "Never reaches the forex or insurance desk", "Forex and insurance are offered on every holiday"],
  ["Quality", "A 2% sample of calls, one channel at a time", "Every call, chat, and mail scored on your form"],
  ["Your data", "Split across a chatbot, a dialer, a QA tool, and a PDF maker", "One record from first chat to branch handover"],
  ["Cost", "Four contracts, four integrations, four logins", "One fee, one platform, one place to see results"],
];

function WhySuite({ r }: { r: SuiteResult }) {
  const crossSell = r.suiteDrivers.reduce((sum, driver) => sum + driver.value, 0);
  const points = [
    { title: "One lead, every desk", value: "1 record", text: "A chat on your website becomes a quote, a forex order, a care call, and an audited conversation without anyone typing it twice." },
    { title: "Sell more on every trip", value: inr(crossSell), text: "Forex and insurance offered on the holidays the planner books. A standalone tool never sees the holiday." },
    { title: "One fee", value: inr(r.discount), text: "Bundle saving each month for four or more modules, on one contract." },
    { title: "Every conversation audited", value: "100%", text: "Voice, chat, and email from every module scored by the same audit agents." },
  ];
  return (
    <div className="roi-overview">
      <header className="roi-section-head">
        <h2>Why a suite beats separate tools</h2>
        <p>The modules pay for themselves one by one. Together they share one lead, so each sells more than it could alone.</p>
      </header>
      <div className="sr-why">
        {points.map((point) => (
          <article key={point.title} className="card sr-why-card">
            <strong>{point.value}</strong>
            <h3>{point.title}</h3>
            <p>{point.text}</p>
          </article>
        ))}
      </div>
      <section className="card roi-panel roi-flush">
        <div className="table-wrap">
          <table className="roi-kpi-table sr-compare">
            <thead>
              <tr>
                <th />
                <th>Separate tools</th>
                <th>Vibrium Travel Suite</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([row, separate, suite]) => (
                <tr key={row}>
                  <td className="kpi-name">{row}</td>
                  <td className="work">{separate}</td>
                  <td className="sr-yes">{suite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Assumptions({ values, setValue, reset }: { values: SuiteValues; setValue: (id: string, value: number) => void; reset: () => void }) {
  const groups: { title: string; scope: string; inputs: SuiteInput[] }[] = [
    { title: "Shared across modules", scope: "shared", inputs: SHARED_INPUTS },
    ...MODULES.filter((module) => module.id !== "forex").map((module) => ({ title: module.name, scope: module.id, inputs: module.inputs })),
    { title: "Suite effects", scope: "suite", inputs: SUITE_INPUTS },
  ];
  const edited = Object.keys(SUITE_DEFAULTS).filter((key) => values[key] !== SUITE_DEFAULTS[key]).length;
  const suffix: Record<string, string> = { pct: "%", min: "min", hrs: "h" };

  return (
    <section className="roi-section">
      <header className="roi-section-head">
        <h2>Assumptions</h2>
        <p>Starting points for every module. Change any of them and the whole suite reprices. Percentages are whole numbers.</p>
      </header>
      <div className="roi-assume-bar">
        <div className="roi-legend">
          {(["client", "ai", "bench", "vib", "est"] as const).map((source) => (
            <span key={source} className={`roi-tag ${source}`}>
              <i aria-hidden="true" />
              {SOURCE_LABELS[source]}
            </span>
          ))}
        </div>
        <button type="button" className="roi-btn" onClick={reset} disabled={edited === 0}>
          {edited === 0 ? "Using defaults" : `Reset ${edited} edited`}
        </button>
      </div>
      <div className="card roi-panel roi-group">
        <h3>Forex</h3>
        <p className="roi-text">
          Forex has its own detailed model with 27 assumptions.{" "}
          <Link href="/roi/forex" className="roi-link">
            Edit them in the forex model
          </Link>
        </p>
      </div>
      {groups.map((group) => (
        <div className="card roi-panel roi-group" key={group.scope}>
          <h3>{group.title}</h3>
          {group.inputs.map((input) => {
            const id = `${group.scope}.${input.id}`;
            const value = values[id];
            const shown = input.unit === "pct" ? Number((value * 100).toFixed(4)) : value;
            const isEdited = value !== input.value;
            return (
              <div key={id} className={`roi-irow${input.source === "est" ? " est" : ""}${isEdited ? " edited" : ""}`}>
                <div className="roi-ilabel">
                  <label htmlFor={`sr-f-${id}`}>{input.label}</label>
                  <p>{input.note}</p>
                  <div className="roi-imeta">
                    <span className={`roi-tag ${input.source}`}>
                      <i aria-hidden="true" />
                      {SOURCE_LABELS[input.source]}
                    </span>
                    {isEdited ? (
                      <button type="button" className="roi-link" onClick={() => setValue(id, input.value)}>
                        Reset to {formatSuiteInput(input, input.value)}
                      </button>
                    ) : null}
                  </div>
                </div>
                <span className="roi-field">
                  {input.unit === "inr" ? <span>₹</span> : null}
                  <input
                    id={`sr-f-${id}`}
                    type="number"
                    inputMode="decimal"
                    step={input.unit === "pct" ? "0.1" : input.unit === "inr" ? "500" : "1"}
                    value={shown}
                    onChange={(event) => {
                      const parsed = parseFloat(event.target.value);
                      if (Number.isFinite(parsed)) setValue(id, input.unit === "pct" ? parsed / 100 : parsed);
                    }}
                  />
                  {suffix[input.unit] ? <span>{suffix[input.unit]}</span> : null}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function downloadCsv(r: SuiteResult, values: SuiteValues) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [
    ["Travel Suite ROI"],
    [],
    ["Module", "In plan", "Value per month (INR)", "Fee per month (INR)", "Net (INR)", "Return on fee"],
    ...r.modules.map((module): (string | number)[] => [
      module.module.name,
      module.enabled ? "Yes" : "No",
      Math.round(module.value),
      Math.round(module.fee),
      Math.round(module.net),
      module.roi == null ? "" : module.roi.toFixed(2),
    ]),
    ...r.suiteDrivers.map((driver): (string | number)[] => [`Suite effect: ${driver.name}`, "Yes", Math.round(driver.value), 0, Math.round(driver.value), ""]),
    ["Bundle discount", "", "", -Math.round(r.discount), Math.round(r.discount), ""],
    ["Total", "", Math.round(r.value), Math.round(r.fee), Math.round(r.net), r.roi == null ? "" : r.roi.toFixed(2)],
    [],
    ["Driver", "Module", "Value per month (INR)"],
    ...r.modules.flatMap((module) => module.drivers.map((driver): (string | number)[] => [driver.name, module.module.name, Math.round(driver.value)])),
    [],
    ["Assumption", "Value", "Unit", "Source", "Note"],
    ...Object.keys(SUITE_DEFAULTS).map((id): (string | number)[] => {
      const input = inputById(id) as SuiteInput;
      return [`${id.split(".")[0]}: ${input.label}`, values[id], input.unit, SOURCE_LABELS[input.source], input.note];
    }),
  ];
  const csv = rows.map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "travel-suite-roi.csv";
  link.click();
  URL.revokeObjectURL(url);
}

