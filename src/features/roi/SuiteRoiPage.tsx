"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  applySize,
  computeSuite,
  DEFAULTS,
  FAMILIES,
  familyColor,
  formatKpi,
  formatVar,
  inr,
  kpiByRole,
  num,
  pct,
  PROCESSES_ROI,
  setVolume,
  SHARED_VARS,
  SIZE_PRESETS,
  SOURCE_LABELS,
  varById,
  working,
  yearCurve,
  type KpiResult,
  type KpiVar,
  type ProcessResult,
  type Source,
  type SuiteResult,
  type SuiteValues,
  type YearPoint,
} from "../../data/suite-roi";

const KEY = "vts.roi.kpi.v2";
const DIRECT_COLOR = "#2a78d6";
const UNLOCKED_COLOR = "#1baf7a";

interface Saved {
  values: SuiteValues;
  enabled: Record<string, boolean>;
  size?: string;
}

const roiText = (roi: number | null) => (roi == null ? "—" : pct(roi, 0));

/** Eases a number to its new value, so every change to the calculator lands with a visible jump. */
function useCountUp(target: number, duration = 700): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      from.current = target;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = origin + (target - origin) * eased;
      setShown(value);
      from.current = value;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return shown;
}

function Counter({ value, format = inr }: { value: number; format?: (value: number) => string }) {
  return <>{format(useCountUp(Number.isFinite(value) ? value : 0))}</>;
}

/** Travel Suite ROI: every process's value and return come from its KPI book, and the suite adds them up. */
export function SuiteRoiPage() {
  const [values, setValues] = useState<SuiteValues>(DEFAULTS);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [size, setSize] = useState<string>("established");
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<string>(PROCESSES_ROI[0].id);
  const r = useMemo(() => computeSuite(values, enabled), [values, enabled]);
  const curve = useMemo(() => yearCurve(r), [r]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Saved | null;
      if (saved) {
        const clean: SuiteValues = { ...DEFAULTS };
        for (const key of Object.keys(DEFAULTS)) if (Number.isFinite(saved.values?.[key])) clean[key] = saved.values[key];
        setValues(clean);
        setEnabled(saved.enabled ?? {});
        if (saved.size) setSize(saved.size);
      }
    } catch {
      // Defaults apply.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ values, enabled, size }));
    } catch {
      // Edits last for this visit only.
    }
  }, [values, enabled, size, loaded]);

  const setValue = (id: string, value: number) => {
    setValues((current) => ({ ...current, [id]: value }));
    setSize("custom");
  };
  const toggle = (id: string) => setEnabled((current) => ({ ...current, [id]: current[id] === false }));
  const pickSize = (id: string, factor: number) => {
    setSize(id);
    setValues((current) => applySize(current, factor));
  };
  const open = (id: string) => {
    setActive(id);
    document.getElementById("roi-calculator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const on = r.processes.filter((item) => item.enabled);
  const current = r.processes.find((item) => item.process.id === active) ?? r.processes[0];
  const year = curve[curve.length - 1];

  return (
    <main className="page roi-page rx-page">
      <section className="rx-hero" aria-label="What the suite creates">
        <div className="rx-hero-glow" aria-hidden="true" />
        <div className="rx-hero-top">
          <p className="rx-kicker">Travel Suite · ROI from the process KPIs</p>
          <div className="rx-hero-tools">
            <button type="button" className="rx-ghost" onClick={() => downloadCsv(r, values)}>
              Export to Excel
            </button>
            <button
              type="button"
              className="rx-ghost"
              onClick={() => {
                setValues({ ...DEFAULTS });
                setEnabled({});
                setSize("established");
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="rx-hero-main">
          <div>
            <h1>
              Your AI agents create
              <span className="rx-big">
                <Counter value={r.net * 12} />
              </span>
              <span className="rx-big-sub">more every year, after the AI investment.</span>
            </h1>
            <div className="rx-badges">
              <span className="rx-badge hot">
                <b>
                  <Counter value={r.roi ?? 0} format={(value) => pct(value, 0)} />
                </b>
                suite ROI
              </span>
              <span className="rx-badge">
                <b>
                  <Counter value={r.net} />
                </b>
                net every month
              </span>
              <span className="rx-badge">
                <b>{Math.max(Math.round(r.paybackDays), 1)} days</b>
                to earn back the monthly investment
              </span>
            </div>
          </div>

          <div className="rx-sizer">
            <p className="rx-sizer-title">Size your business</p>
            <div className="rx-sizes" role="radiogroup" aria-label="Business size">
              {SIZE_PRESETS.map((preset) => (
                <button key={preset.id} type="button" role="radio" aria-checked={size === preset.id} onClick={() => pickSize(preset.id, preset.factor)}>
                  <strong>{preset.label}</strong>
                  <small>{preset.detail}</small>
                </button>
              ))}
            </div>
            <p className="rx-sizer-title">Pick your processes</p>
            <div className="rx-chips">
              {r.processes.map((item) => (
                <button
                  key={item.process.id}
                  type="button"
                  aria-pressed={item.enabled}
                  className="rx-chip"
                  style={{ "--c": familyColor(item.process.family) } as CSSProperties}
                  onClick={() => toggle(item.process.id)}
                >
                  <i aria-hidden="true" />
                  {item.process.short}
                </button>
              ))}
            </div>
            {size === "custom" ? <p className="rx-sizer-note">Using your own KPI variables from the calculator below.</p> : null}
          </div>
        </div>

        <dl className="rx-stats">
          <div>
            <dt>Total value created · Σ P-07</dt>
            <dd>
              <Counter value={r.value} />
            </dd>
            <small>per month, {on.length} processes</small>
          </div>
          <div>
            <dt>Direct value</dt>
            <dd>
              <Counter value={r.direct} />
            </dd>
            <small>effort and cost the agents take off</small>
          </div>
          <div>
            <dt>Unlocked value</dt>
            <dd>
              <Counter value={r.unlocked} />
            </dd>
            <small>revenue, leakage, incidents × confidence</small>
          </div>
          <div>
            <dt>AI investment · Σ C4</dt>
            <dd>
              <Counter value={r.investment} />
            </dd>
            <small>per month</small>
          </div>
        </dl>
      </section>

      <section className="card rx-card">
        <header className="rx-card-head">
          <div>
            <p className="rx-overline">Your first year</p>
            <h2>
              {inr(year?.earned ?? 0)} created against {inr(year?.paid ?? 0)} invested
            </h2>
            <p>Value builds as the agents go live in the first three months, then the gap keeps widening every month.</p>
          </div>
          <span className="rx-multiple">{roiText(year && year.paid ? (year.earned - year.paid) / year.paid : null)}</span>
        </header>
        <YearChart points={curve} />
      </section>

      <div className="rx-grid">
        <section className="card rx-card">
          <header className="rx-card-head">
            <div>
              <p className="rx-overline">Where the value comes from</p>
              <h2>{inr(r.value)} a month</h2>
            </div>
          </header>
          <Donut r={r} onPick={open} />
        </section>

        <section className="card rx-card">
          <header className="rx-card-head">
            <div>
              <p className="rx-overline">Direct and unlocked, by process</p>
              <h2>How P-07 splits</h2>
            </div>
          </header>
          <SplitBars r={r} onPick={open} />
        </section>
      </div>

      <section className="card rx-card">
        <header className="rx-card-head">
          <div>
            <p className="rx-overline">Process scorecard</p>
            <h2>Every process, read off its own KPIs</h2>
            <p>Target achievement, unit cost, value created (P-07), and ROI (P-08) for each process. The suite row adds P-07 and C4 across the plan.</p>
          </div>
        </header>
        <Scorecard r={r} onPick={open} />
      </section>

      <section className="rx-calc" id="roi-calculator" aria-label="Calculator by process">
        <header className="rx-calc-head">
          <div>
            <p className="rx-overline">Calculator</p>
            <h2>Put in your KPI variables, see every KPI move</h2>
            <p>Pick a process, drag its volume, or edit any variable. Each KPI shows its formula and the numbers going into it.</p>
          </div>
        </header>
        <div className="rx-tabs kx-tabs" role="tablist" aria-label="Processes">
          {r.processes.map((item) => (
            <button
              key={item.process.id}
              type="button"
              role="tab"
              aria-selected={active === item.process.id}
              className={item.enabled ? undefined : "off"}
              style={{ "--c": familyColor(item.process.family) } as CSSProperties}
              onClick={() => setActive(item.process.id)}
            >
              <i aria-hidden="true" />
              <span>
                {item.process.short}
                <small>{item.enabled ? inr(item.value) : "Not in the plan"}</small>
              </span>
            </button>
          ))}
        </div>
        <ProcessPanel
          key={current.process.id}
          item={current}
          values={values}
          setValue={setValue}
          setVolume={(next) => {
            setValues((state) => setVolume(state, current.process, next));
            setSize("custom");
          }}
          toggle={() => toggle(current.process.id)}
        />
      </section>

      <details className="card roi-panel rc-finetune">
        <summary>
          <span>
            <strong>Suite-wide variables</strong>
            <small>C5 human cost per task and G9 confidence, used by every process formula</small>
          </span>
        </summary>
        <div className="rc-finetune-body">
          {SHARED_VARS.map((variable) => {
            const id = `shared.${variable.key}`;
            return <VarRow key={id} id={id} variable={variable} value={values[id]} onChange={(value) => setValue(id, value)} />;
          })}
        </div>
      </details>
    </main>
  );
}

/* ───────── charts ───────── */

const W = 760;
const H = 280;
const PAD = { top: 20, right: 120, bottom: 34, left: 64 };

/** Rounds a tick interval up to 1, 2, 2.5, or 5 times a power of ten. */
function niceStep(rough: number): number {
  const power = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1))));
  const scaled = rough / power;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return nice * power;
}

function YearChart({ points }: { points: YearPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const raw = Math.max(...points.map((point) => Math.max(point.earned, point.paid)), 1);
  const step = niceStep(raw / 4);
  const max = Math.ceil(raw / step) * step;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (month: number) => PAD.left + ((month - 1) / 11) * innerW;
  const y = (value: number) => PAD.top + innerH - (Math.max(value, 0) / max) * innerH;
  const earnedPath = points.map((point, index) => `${index ? "L" : "M"}${x(point.month)},${y(point.earned)}`).join(" ");
  const area = `${earnedPath} L${x(12)},${y(0)} L${x(1)},${y(0)} Z`;
  const paidPath = points.map((point, index) => `${index ? "L" : "M"}${x(point.month)},${y(point.paid)}`).join(" ");
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  const last = points[points.length - 1];
  const point = hover !== null ? points[hover] : null;

  return (
    <div className="rx-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`First year: ${inr(last.earned)} created, ${inr(last.paid)} invested`} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="rxArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c70f6" stopOpacity="0.45" />
            <stop offset="1" stopColor="#00ccc5" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="rxLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2c70f6" />
            <stop offset="1" stopColor="#00ccc5" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="rx-grid-line" />
            <text x={PAD.left - 10} y={y(tick) + 4} textAnchor="end" className="rx-axis">
              {inr(tick)}
            </text>
          </g>
        ))}
        {points.map((item) => (
          <text key={item.month} x={x(item.month)} y={H - 10} textAnchor="middle" className="rx-axis">
            M{item.month}
          </text>
        ))}
        <path d={area} fill="url(#rxArea)" className="rx-area" />
        <path d={earnedPath} fill="none" stroke="url(#rxLine)" strokeWidth="3" strokeLinejoin="round" className="rx-line" pathLength={1} />
        <path d={paidPath} fill="none" stroke="#9aa9b1" strokeWidth="2" strokeDasharray="5 5" />
        <circle cx={x(12)} cy={y(last.earned)} r="5" fill="#00ccc5" stroke="#fff" strokeWidth="2" />
        <circle cx={x(12)} cy={y(last.paid)} r="4" fill="#9aa9b1" stroke="#fff" strokeWidth="2" />
        <text x={x(12) + 12} y={y(last.earned) + 4} className="rx-end-label strong">
          Created {inr(last.earned)}
        </text>
        <text x={x(12) + 12} y={y(last.paid) + 4} className="rx-end-label">
          C4 {inr(last.paid)}
        </text>
        {point ? (
          <g>
            <line x1={x(point.month)} x2={x(point.month)} y1={PAD.top} y2={PAD.top + innerH} className="rx-cross" />
            <circle cx={x(point.month)} cy={y(point.earned)} r="5" fill="#2c70f6" stroke="#fff" strokeWidth="2" />
            <circle cx={x(point.month)} cy={y(point.paid)} r="4" fill="#9aa9b1" stroke="#fff" strokeWidth="2" />
          </g>
        ) : null}
        {points.map((item, index) => (
          <rect key={item.month} x={x(item.month) - innerW / 22} y={PAD.top} width={innerW / 11} height={innerH} fill="transparent" onMouseEnter={() => setHover(index)} />
        ))}
      </svg>
      {point ? (
        <div className="rx-tip" style={{ left: `${(x(point.month) / W) * 100}%` }}>
          <strong>Month {point.month}</strong>
          <span>
            <i className="earned" /> Value created {inr(point.earned)}
          </span>
          <span>
            <i className="paid" /> AI investment {inr(point.paid)}
          </span>
          <b>Ahead by {inr(point.earned - point.paid)}</b>
        </div>
      ) : null}
      <div className="rx-legend">
        <span>
          <i className="earned" /> Value created (Σ P-07), cumulative
        </span>
        <span>
          <i className="paid" /> AI investment (Σ C4), cumulative
        </span>
      </div>
    </div>
  );
}

function Donut({ r, onPick }: { r: SuiteResult; onPick: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const slices = FAMILIES.map((family) => {
    const members = r.processes.filter((item) => item.enabled && item.process.family === family.id);
    return { id: family.id, name: family.name, value: members.reduce((sum, item) => sum + Math.max(item.value, 0), 0), color: family.color, first: members[0]?.process.id, count: members.length };
  }).filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const focus = slices.find((slice) => slice.id === hover);

  if (slices.length === 0) return <p className="rx-empty">Turn on a process to see where its value comes from.</p>;
  return (
    <div className="rx-donut">
      <svg viewBox="0 0 220 220" role="img" aria-label="Monthly value created by process family">
        <g transform="rotate(-90 110 110)">
          {slices.map((slice) => {
            const length = (slice.value / total) * circumference;
            const gap = slices.length > 1 ? 3 : 0;
            const element = (
              <circle
                key={slice.id}
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={hover === slice.id ? 30 : 24}
                strokeDasharray={`${Math.max(length - gap, 0.5)} ${circumference}`}
                strokeDashoffset={-offset}
                className="rx-slice"
                onMouseEnter={() => setHover(slice.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => slice.first && onPick(slice.first)}
              />
            );
            offset += length;
            return element;
          })}
        </g>
        <text x="110" y="104" textAnchor="middle" className="rx-donut-label">
          {focus ? focus.name : "Every month"}
        </text>
        <text x="110" y="128" textAnchor="middle" className="rx-donut-value">
          {inr(focus ? focus.value : total)}
        </text>
      </svg>
      <ul className="rx-donut-legend">
        {slices.map((slice) => (
          <li key={slice.id} onMouseEnter={() => setHover(slice.id)} onMouseLeave={() => setHover(null)} className={hover === slice.id ? "on" : undefined}>
            <i style={{ background: slice.color }} />
            <span>
              {slice.name}
              {slice.count > 1 ? <em className="kx-count"> · {slice.count} processes</em> : null}
            </span>
            <b>{inr(slice.value)}</b>
            <small>{Math.round((slice.value / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SplitBars({ r, onPick }: { r: SuiteResult; onPick: (id: string) => void }) {
  const rows = r.processes.filter((item) => item.enabled);
  if (rows.length === 0) return <p className="rx-empty">Turn on a process to see its direct and unlocked value.</p>;
  const max = Math.max(...rows.map((item) => Math.max(item.direct, 0) + Math.max(item.unlocked, 0)), 1);
  return (
    <div className="kx-split">
      <ul>
        {rows.map((item) => (
          <li key={item.process.id}>
            <button type="button" className="rc-name" onClick={() => onPick(item.process.id)}>
              {item.process.short}
            </button>
            <span className="kx-split-track" title={`Direct ${inr(item.direct)} · Unlocked ${inr(item.unlocked)}`}>
              <i style={{ width: `${(Math.max(item.direct, 0) / max) * 100}%`, background: DIRECT_COLOR }} />
              <i style={{ width: `${(Math.max(item.unlocked, 0) / max) * 100}%`, background: UNLOCKED_COLOR }} />
            </span>
            <b>{inr(item.value)}</b>
          </li>
        ))}
      </ul>
      <div className="rx-legend">
        <span>
          <i style={{ background: DIRECT_COLOR }} /> Direct · {inr(r.direct)}
        </span>
        <span>
          <i style={{ background: UNLOCKED_COLOR }} /> Unlocked · {inr(r.unlocked)}
        </span>
      </div>
    </div>
  );
}

function Scorecard({ r, onPick }: { r: SuiteResult; onPick: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <table className="rc-table kx-score">
        <thead>
          <tr>
            <th>Process</th>
            <th className="r">Target achievement</th>
            <th>Unit cost</th>
            <th className="r">Value created · P-07</th>
            <th className="r">AI investment · C4</th>
            <th className="r">ROI · P-08</th>
          </tr>
        </thead>
        <tbody>
          {r.processes.map((item) => {
            const target = kpiByRole(item, "target");
            const cost = kpiByRole(item, "cost");
            return (
              <tr key={item.process.id} className={item.enabled ? undefined : "off"}>
                <td>
                  <span className="kx-proc">
                    <i style={{ background: familyColor(item.process.family) }} aria-hidden="true" />
                    <button type="button" className="rc-name" onClick={() => onPick(item.process.id)}>
                      {item.process.short}
                    </button>
                  </span>
                </td>
                <td className="r">
                  {target ? formatKpi(target.value, target.def.format) : "—"}
                  <small className="kx-code">{target?.def.code}</small>
                </td>
                <td>
                  <b className="kx-num">{cost ? formatKpi(cost.value, cost.def.format) : "—"}</b>
                  <small className="kx-sub">
                    {cost?.def.code} {cost?.def.name.toLowerCase()}
                  </small>
                </td>
                <td className="r">{inr(item.value)}</td>
                <td className="r">{inr(item.investment)}</td>
                <td className={`r ${item.roi != null && item.roi < 0 ? "neg" : "rc-return"}`}>{roiText(item.roi)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Suite · processes in the plan</td>
            <td />
            <td />
            <td className="r">{inr(r.value)}</td>
            <td className="r">{inr(r.investment)}</td>
            <td className="r rc-return">{roiText(r.roi)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ───────── process calculator ───────── */

const SOURCE_ORDER: Source[] = ["client", "ai", "bench", "est", "vib"];

function ProcessPanel({
  item,
  values,
  setValue,
  setVolume: onVolume,
  toggle,
}: {
  item: ProcessResult;
  values: SuiteValues;
  setValue: (id: string, value: number) => void;
  setVolume: (value: number) => void;
  toggle: () => void;
}) {
  const { process } = item;
  const color = familyColor(process.family);
  const volumeVar = process.variables.find((variable) => variable.key === process.volume.key) as KpiVar;
  const volumeId = `${process.id}.${process.volume.key}`;
  const pulse = item.kpis.filter((kpi) => kpi.def.group === "pulse");
  const signals = item.kpis.filter((kpi) => kpi.def.group === "signal");
  const p07 = item.kpis.find((kpi) => kpi.def.code === "P-07");
  const p08 = item.kpis.find((kpi) => kpi.def.code === "P-08");

  return (
    <div className="card rx-panel" style={{ "--c": color } as CSSProperties}>
      <header className="rc-division-head">
        <div>
          <h3>{process.name}</h3>
          <p>{process.pitch}</p>
          <p className="sr-agents">
            Agents: {process.agents} ·{" "}
            <Link href={process.href} className="roi-link">
              Open the process
            </Link>
          </p>
        </div>
        <IncludeSwitch on={item.enabled} label={`Include ${process.name}`} onToggle={toggle} />
      </header>

      <div className="rx-panel-grid">
        <div className="rc-volumes">
          <VolumeSlider id={volumeId} variable={volumeVar} range={process.volume} value={values[volumeId]} onChange={onVolume} />
        </div>
        <div className="rx-result">
          <span>P-07 · Total value created</span>
          <strong>
            <Counter value={item.value} />
          </strong>
          <small>
            a month · P-08 ROI {roiText(item.roi)} on C4 {inr(item.investment)}
          </small>
        </div>
      </div>

      <section aria-label="Pulse KPIs">
        <h4 className="kx-h">Pulse</h4>
        <div className="kx-grid">
          {pulse.map((kpi) => (
            <KpiTile key={kpi.def.code} kpi={kpi} item={item} />
          ))}
        </div>
      </section>

      <section aria-label="Signal KPIs">
        <h4 className="kx-h">Signals</h4>
        <div className="kx-grid">
          {signals.map((kpi) => (kpi.def.funnel ? <FunnelTile key={kpi.def.code} kpi={kpi} item={item} /> : <KpiTile key={kpi.def.code} kpi={kpi} item={item} />))}
        </div>
      </section>

      <details className="card roi-panel rc-driver kx-build" open>
        <summary>
          <span className="roi-dot growth" aria-hidden="true" />
          <span className="rc-driver-text">
            <strong>How P-07 and P-08 are built</strong>
            <small>{p07?.def.meaning}</small>
          </span>
          <b>{inr(item.value)}</b>
        </summary>
        <div className="table-wrap">
          <table className="roi-steps">
            <thead>
              <tr>
                <th>Step</th>
                <th>Formula</th>
                <th>Working</th>
                <th className="r">Value</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: `Direct · ${process.direct.name}`, part: process.direct, value: item.direct },
                { label: `Unlocked · ${process.unlocked.name}`, part: process.unlocked, value: item.unlocked },
              ].map((row) => (
                <tr key={row.label}>
                  <td>
                    {row.label}
                    <small className="kx-sub">{row.part.meaning}</small>
                  </td>
                  <td className="work">
                    <code>{row.part.formula}</code>
                  </td>
                  <td className="work">{working(row.part.formula, process, item.get, item.done)}</td>
                  <td className={row.value < 0 ? "r neg" : "r"}>{inr(row.value)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>P-07 · Total value created</td>
                <td className="work">
                  <code>Direct + Unlocked</code>
                </td>
                <td className="work">
                  {inr(item.direct)} + {inr(item.unlocked)}
                </td>
                <td className="r">{inr(item.value)}</td>
              </tr>
              <tr className="total">
                <td>P-08 · ROI</td>
                <td className="work">
                  <code>{p08?.def.formula}</code>
                </td>
                <td className="work">{p08?.working}</td>
                <td className="r">{roiText(item.roi)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <details className="rc-finetune rx-inner">
        <summary>
          <span>
            <strong>KPI variables</strong>
            <small>
              {process.variables.length} variables for {process.short.toLowerCase()}: client systems, AI process runs, baselines, targets, and estimates
            </small>
          </span>
        </summary>
        <div className="rc-finetune-body">
          {SOURCE_ORDER.map((source) => {
            const group = process.variables.filter((variable) => variable.source === source);
            if (group.length === 0) return null;
            return (
              <Fragment key={source}>
                <h5 className="kx-group">{SOURCE_LABELS[source]}</h5>
                {group.map((variable) => {
                  const id = `${process.id}.${variable.key}`;
                  return <VarRow key={id} id={id} variable={variable} value={values[id]} onChange={(value) => setValue(id, value)} />;
                })}
              </Fragment>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function KpiTile({ kpi, item }: { kpi: KpiResult; item: ProcessResult }) {
  const { def, value } = kpi;
  const compare = def.compare ? varById(`${item.process.id}.${def.compare.key}`) : null;
  const base = def.compare ? item.get(def.compare.key) : null;
  const better = def.compare && base != null && Number.isFinite(value) ? (def.compare.better === "up" ? value >= base : value <= base) : null;
  const highlight = def.role === "value" || def.role === "roi";
  return (
    <article className={`kx-tile${highlight ? " hi" : ""}`}>
      <header>
        <span className="kx-code">{def.code}</span>
        <span className="kx-name">{def.name}</span>
      </header>
      <strong className={value < 0 ? "neg" : undefined}>{def.role === "roi" ? roiText(value) : formatKpi(value, def.format)}</strong>
      {compare && base != null ? (
        <span className={`kx-compare ${better ? "good" : "bad"}`}>
          {better ? "▲" : "▼"} vs {def.compare?.key} {formatVar(compare, base)}
        </span>
      ) : null}
      <small>{def.meaning}</small>
      <code title={kpi.working}>
        {def.formula}
        {kpi.working && kpi.working !== def.formula ? <em> = {kpi.working}</em> : null}
      </code>
    </article>
  );
}

function FunnelTile({ kpi, item }: { kpi: KpiResult; item: ProcessResult }) {
  const funnel = kpi.def.funnel!;
  const counts = funnel.stages.map((key) => item.get(key));
  const top = Math.max(counts[0] || 0, 1);
  const bench = funnel.benchmark ? item.get(funnel.benchmark) : null;
  const gap = bench != null && Number.isFinite(kpi.value) ? (kpi.value - bench) * 100 : null;
  return (
    <article className="kx-tile kx-funnel">
      <header>
        <span className="kx-code">{kpi.def.code}</span>
        <span className="kx-name">{kpi.def.name}</span>
        <code>{kpi.def.formula}</code>
      </header>
      <ol>
        {funnel.stages.map((key, index) => (
          <li key={key}>
            <span>
              {funnel.labels[index]} <em>{key}</em>
            </span>
            <span className="kx-funnel-track">
              <i style={{ width: `${Math.max((counts[index] / top) * 100, counts[index] ? 1.5 : 0)}%` }} />
            </span>
            <b>{num(counts[index])}</b>
            <small>{index ? pct(counts[index] / Math.max(counts[index - 1], 1)) : ""}</small>
          </li>
        ))}
      </ol>
      <p>
        End to end <b>{pct(kpi.value)}</b>
        {bench != null ? (
          <>
            {" "}
            · benchmark {funnel.benchmark} {pct(bench)} ·{" "}
            <span className={`kx-compare ${gap != null && gap >= 0 ? "good" : "bad"}`}>{gap != null ? formatKpi(gap, "pp") : "—"} gap</span>
          </>
        ) : null}
      </p>
    </article>
  );
}

/* ───────── inputs ───────── */

function shownValue(variable: KpiVar, value: number): number {
  return variable.unit === "pct" ? Number((value * 100).toFixed(4)) : value;
}

function parseInput(variable: KpiVar, raw: string): number | null {
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed)) return null;
  return variable.unit === "pct" ? parsed / 100 : parsed;
}

const SUFFIX: Partial<Record<KpiVar["unit"], string>> = { pct: "%", min: "min", hrs: "h", days: "days", sec: "s", pts: "pts" };

function VolumeSlider({
  id,
  variable,
  range,
  value,
  onChange,
}: {
  id: string;
  variable: KpiVar;
  range: { min: number; max: number; step: number };
  value: number;
  onChange: (value: number) => void;
}) {
  const max = Math.max(range.max, value);
  const fill = ((value - range.min) / Math.max(max - range.min, 1)) * 100;
  return (
    <div className="rc-volume">
      <div className="rc-volume-head">
        <label htmlFor={`rc-${id}`}>
          <span className="kx-code">{variable.key}</span> {variable.label} per month
        </label>
        <span className="roi-field rc-volume-field">
          <input
            id={`rc-${id}`}
            type="number"
            inputMode="numeric"
            value={value}
            min={1}
            step={range.step}
            onChange={(event) => {
              const parsed = parseInput(variable, event.target.value);
              if (parsed !== null && parsed > 0) onChange(parsed);
            }}
          />
        </span>
      </div>
      <input
        className="rc-range"
        type="range"
        min={range.min}
        max={max}
        step={range.step}
        value={value}
        aria-label={variable.label}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="rc-volume-foot">
        <small>{variable.meaning} The counts and sums that follow from it move with it.</small>
        <small>
          {num(range.min)} – {num(max)}
        </small>
      </div>
    </div>
  );
}

function VarRow({ id, variable, value, onChange }: { id: string; variable: KpiVar; value: number; onChange: (value: number) => void }) {
  const edited = value !== variable.value;
  return (
    <div className={`roi-irow${variable.source === "est" ? " est" : ""}${edited ? " edited" : ""}`}>
      <div className="roi-ilabel">
        <label htmlFor={`rc-${id}`}>
          <span className="kx-code">{variable.key}</span> {variable.label}
        </label>
        <p>{variable.meaning}</p>
        <div className="roi-imeta">
          <span className={`roi-tag ${variable.source}`}>
            <i aria-hidden="true" />
            {SOURCE_LABELS[variable.source]}
          </span>
          <small className="kx-system">{variable.system}</small>
          {edited ? (
            <button type="button" className="roi-link" onClick={() => onChange(variable.value)}>
              Reset to {formatVar(variable, variable.value)}
            </button>
          ) : null}
        </div>
      </div>
      <span className="roi-field">
        {variable.unit === "inr" ? <span>₹</span> : null}
        <input
          id={`rc-${id}`}
          type="number"
          inputMode="decimal"
          step={variable.unit === "pct" ? "0.1" : variable.unit === "inr" ? "100" : "1"}
          value={shownValue(variable, value)}
          onChange={(event) => {
            const parsed = parseInput(variable, event.target.value);
            if (parsed !== null) onChange(parsed);
          }}
        />
        {SUFFIX[variable.unit] ? <span>{SUFFIX[variable.unit]}</span> : null}
      </span>
    </div>
  );
}

function IncludeSwitch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <label className="rc-include">
      <span>{on ? "In the plan" : "Not in the plan"}</span>
      <button type="button" role="switch" className="pl-switch" aria-checked={on} aria-label={label} onClick={onToggle}>
        <i aria-hidden="true" />
      </button>
    </label>
  );
}

/* ───────── export ───────── */

function downloadCsv(r: SuiteResult, values: SuiteValues) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [
    ["Travel Suite ROI from the process KPIs"],
    [],
    ["Process", "In plan", "Direct (INR)", "Unlocked (INR)", "P-07 Total value created (INR)", "C4 AI investment (INR)", "P-08 ROI"],
    ...r.processes.map((item): (string | number)[] => [
      item.process.name,
      item.enabled ? "Yes" : "No",
      Math.round(item.direct),
      Math.round(item.unlocked),
      Math.round(item.value),
      Math.round(item.investment),
      item.roi == null ? "" : `${(item.roi * 100).toFixed(1)}%`,
    ]),
    ["Suite", "", Math.round(r.direct), Math.round(r.unlocked), Math.round(r.value), Math.round(r.investment), r.roi == null ? "" : `${(r.roi * 100).toFixed(1)}%`],
    [],
    ["Process", "Code", "Group", "KPI", "Formula", "Working", "Value"],
    ...r.processes.flatMap((item) =>
      item.kpis.map((kpi): (string | number)[] => [
        item.process.name,
        kpi.def.code,
        kpi.def.group === "pulse" ? "Pulse" : "Signals",
        kpi.def.name,
        kpi.def.formula,
        kpi.working,
        kpi.def.role === "roi" ? roiText(kpi.value) : formatKpi(kpi.value, kpi.def.format),
      ]),
    ),
    [],
    ["Process", "Variable", "Name", "Value", "Unit", "Source", "System"],
    ...Object.keys(DEFAULTS).map((id): (string | number)[] => {
      const variable = varById(id) as KpiVar;
      const [scope] = id.split(".");
      const name = scope === "shared" ? "Suite-wide" : PROCESSES_ROI.find((process) => process.id === scope)?.name ?? scope;
      return [name, variable.key, variable.label, values[id], variable.unit, SOURCE_LABELS[variable.source], variable.system];
    }),
  ];
  const csv = rows.map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "travel-suite-roi-kpis.csv";
  link.click();
  URL.revokeObjectURL(url);
}
