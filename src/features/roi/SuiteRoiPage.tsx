"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  applySize,
  beforeAfter,
  computeSuite,
  DEFAULTS,
  DIVISION_COLORS,
  formatLever,
  formatStep,
  inr,
  leverById,
  num,
  SHARED,
  SIZE_PRESETS,
  SOURCE_LABELS,
  SUITE,
  times,
  yearCurve,
  type BeforeAfter,
  type Driver,
  type DivisionResult,
  type Lever,
  type SuiteResult,
  type SuiteValues,
  type YearPoint,
} from "../../data/suite-roi";

const KEY = "vts.roi.calc.v1";

interface Saved {
  values: SuiteValues;
  enabled: Record<string, boolean>;
  size?: string;
}

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
  return <>{format(useCountUp(value))}</>;
}

/** Travel Suite ROI calculator: size the business, pick the divisions, and watch what the agents earn. */
export function SuiteRoiPage() {
  const [values, setValues] = useState<SuiteValues>(DEFAULTS);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [size, setSize] = useState<string>("established");
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<string>("international");
  const r = useMemo(() => computeSuite(values, enabled), [values, enabled]);
  const curve = useMemo(() => yearCurve(r), [r]);
  const changes = useMemo(() => beforeAfter(values, r), [values, r]);

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
  const on = r.divisions.filter((item) => item.enabled);
  const current = r.divisions.find((item) => item.division.id === active) ?? r.divisions[0];
  const bookings = extraBookings(values, r);
  const year = curve[curve.length - 1];

  return (
    <main className="page roi-page rx-page">
      <section className="rx-hero" aria-label="What the suite earns you">
        <div className="rx-hero-glow" aria-hidden="true" />
        <div className="rx-hero-top">
          <p className="rx-kicker">Travel Suite · ROI calculator</p>
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
              Your AI agents earn you
              <span className="rx-big">
                <Counter value={r.net * 12} />
              </span>
              <span className="rx-big-sub">more every year, after the Vibrium fee.</span>
            </h1>
            <div className="rx-badges">
              <span className="rx-badge hot">
                <b>
                  <Counter value={r.roi ?? 0} format={(value) => `${value.toFixed(1)}×`} />
                </b>
                return on every rupee
              </span>
              <span className="rx-badge">
                <b>
                  <Counter value={r.net} />
                </b>
                net every month
              </span>
              <span className="rx-badge">
                <b>{Math.max(Math.round(r.paybackDays), 1)} days</b>
                to earn back the monthly fee
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
            <p className="rx-sizer-title">Pick your divisions</p>
            <div className="rx-chips">
              {r.divisions.map((item) => (
                <button
                  key={item.division.id}
                  type="button"
                  aria-pressed={item.enabled}
                  className="rx-chip"
                  style={{ "--c": DIVISION_COLORS[item.division.id] } as CSSProperties}
                  onClick={() => toggle(item.division.id)}
                >
                  <i aria-hidden="true" />
                  {item.division.short}
                </button>
              ))}
            </div>
            {size === "custom" ? <p className="rx-sizer-note">Using your own volumes from the calculator below.</p> : null}
          </div>
        </div>

        <dl className="rx-stats">
          <div>
            <dt>Extra bookings and orders</dt>
            <dd>
              <Counter value={bookings} format={(value) => num(value)} />
            </dd>
            <small>every month</small>
          </div>
          <div>
            <dt>Hours given back to your team</dt>
            <dd>
              <Counter value={r.hoursSaved} format={(value) => num(value)} />
            </dd>
            <small>≈ {num(r.hoursSaved / Math.max(values["shared.deskHours"], 1))} people a month</small>
          </div>
          <div>
            <dt>Value delivered</dt>
            <dd>
              <Counter value={r.value} />
            </dd>
            <small>per month, {on.length} divisions</small>
          </div>
          <div>
            <dt>Your fee</dt>
            <dd>
              <Counter value={r.fee} />
            </dd>
            <small>{r.discount > 0 ? `${inr(r.discount)} bundle saving` : "per month"}</small>
          </div>
        </dl>
      </section>

      <section className="card rx-card">
        <header className="rx-card-head">
          <div>
            <p className="rx-overline">Your first year</p>
            <h2>
              {inr(year?.earned ?? 0)} earned against {inr(year?.paid ?? 0)} paid
            </h2>
            <p>Value builds as the agents go live in the first three months, then the gap keeps widening every month.</p>
          </div>
          <span className="rx-multiple">{times(year && year.paid ? year.earned / year.paid : null)}</span>
        </header>
        <YearChart points={curve} />
      </section>

      <div className="rx-grid">
        <section className="card rx-card">
          <header className="rx-card-head">
            <div>
              <p className="rx-overline">Where the money comes from</p>
              <h2>{inr(r.value)} a month</h2>
            </div>
          </header>
          <Donut r={r} onPick={(id) => setActive(id)} />
        </section>

        <section className="card rx-card">
          <header className="rx-card-head">
            <div>
              <p className="rx-overline">What changes on the floor</p>
              <h2>Today vs with the agents</h2>
            </div>
          </header>
          <BeforeAfterBars rows={changes} />
        </section>
      </div>

      <section className="rx-calc" aria-label="Calculator by division">
        <header className="rx-calc-head">
          <div>
            <p className="rx-overline">Calculator</p>
            <h2>Put in your numbers, see what happens</h2>
            <p>Pick a division, drag the volumes, and follow each one from what comes in to what it earns.</p>
          </div>
        </header>
        <div className="rx-tabs" role="tablist" aria-label="Divisions">
          {r.divisions.map((item) => (
            <button
              key={item.division.id}
              type="button"
              role="tab"
              aria-selected={active === item.division.id}
              className={item.enabled ? undefined : "off"}
              style={{ "--c": DIVISION_COLORS[item.division.id] } as CSSProperties}
              onClick={() => setActive(item.division.id)}
            >
              <i aria-hidden="true" />
              <span>
                {item.division.name}
                <small>{item.enabled ? inr(item.value) : "Not in the plan"}</small>
              </span>
            </button>
          ))}
        </div>
        <DivisionPanel key={current.division.id} item={current} values={values} setValue={setValue} toggle={() => toggle(current.division.id)} />
      </section>

      <details className="card roi-panel rc-finetune">
        <summary>
          <span>
            <strong>Fine-tune the suite</strong>
            <small>Desk cost per hour, cross-sell on holidays, and the bundle discount</small>
          </span>
        </summary>
        <div className="rc-finetune-body">
          {[...SHARED.map((lever) => ({ lever, id: `shared.${lever.id}` })), ...SUITE.map((lever) => ({ lever, id: `suite.${lever.id}` }))].map(({ lever, id }) => (
            <RateRow key={id} id={id} lever={lever} value={values[id]} onChange={(value) => setValue(id, value)} />
          ))}
        </div>
      </details>
    </main>
  );
}

function extraBookings(values: SuiteValues, r: SuiteResult): number {
  const get = (id: string) => values[id] ?? DEFAULTS[id] ?? 0;
  const isOn = (id: string) => r.divisions.some((item) => item.division.id === id && item.enabled);
  let total = 0;
  if (isOn("forex")) total += Math.max(get("forex.leads") * get("forex.connect") * get("forex.succ") - get("forex.leads") * get("forex.cov") * get("forex.base"), 0);
  if (isOn("international"))
    total += get("international.visitors") * get("international.open") * get("international.chat") * get("international.lead") * get("international.book") * get("international.incremental");
  if (isOn("corporate")) total += get("corporate.bookings") * get("corporate.won");
  if (isOn("domestic")) total += get("domestic.travellers") * get("domestic.rebook");
  if (isOn("qc")) total += get("qc.calls") * get("qc.uplift");
  return total;
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
  const raw = Math.max(...points.map((point) => point.earned), 1);
  const step = niceStep(raw / 4);
  const max = Math.ceil(raw / step) * step;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (month: number) => PAD.left + ((month - 1) / 11) * innerW;
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;
  const earnedPath = points.map((point, index) => `${index ? "L" : "M"}${x(point.month)},${y(point.earned)}`).join(" ");
  const area = `${earnedPath} L${x(12)},${y(0)} L${x(1)},${y(0)} Z`;
  const paidPath = points.map((point, index) => `${index ? "L" : "M"}${x(point.month)},${y(point.paid)}`).join(" ");
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  const last = points[points.length - 1];
  const point = hover !== null ? points[hover] : null;

  return (
    <div className="rx-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`First year: ${inr(last.earned)} earned, ${inr(last.paid)} paid`} onMouseLeave={() => setHover(null)}>
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
          Earned {inr(last.earned)}
        </text>
        <text x={x(12) + 12} y={y(last.paid) + 4} className="rx-end-label">
          Fee {inr(last.paid)}
        </text>
        {point ? (
          <g>
            <line x1={x(point.month)} x2={x(point.month)} y1={PAD.top} y2={PAD.top + innerH} className="rx-cross" />
            <circle cx={x(point.month)} cy={y(point.earned)} r="5" fill="#2c70f6" stroke="#fff" strokeWidth="2" />
            <circle cx={x(point.month)} cy={y(point.paid)} r="4" fill="#9aa9b1" stroke="#fff" strokeWidth="2" />
          </g>
        ) : null}
        {points.map((item, index) => (
          <rect
            key={item.month}
            x={x(item.month) - innerW / 22}
            y={PAD.top}
            width={innerW / 11}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}
      </svg>
      {point ? (
        <div className="rx-tip" style={{ left: `${(x(point.month) / W) * 100}%` }}>
          <strong>Month {point.month}</strong>
          <span>
            <i className="earned" /> Earned {inr(point.earned)}
          </span>
          <span>
            <i className="paid" /> Fee paid {inr(point.paid)}
          </span>
          <b>Ahead by {inr(point.earned - point.paid)}</b>
        </div>
      ) : null}
      <div className="rx-legend">
        <span>
          <i className="earned" /> Value earned, cumulative
        </span>
        <span>
          <i className="paid" /> Vibrium fee, cumulative
        </span>
      </div>
    </div>
  );
}

function Donut({ r, onPick }: { r: SuiteResult; onPick: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const slices = [
    ...r.divisions.filter((item) => item.enabled && item.value > 0).map((item) => ({ id: item.division.id, name: item.division.short, value: item.value, color: DIVISION_COLORS[item.division.id] })),
    ...(r.suiteValue > 0 ? [{ id: "suite", name: "Suite cross-sell", value: r.suiteValue, color: "#7b8a93" }] : []),
  ];
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const focus = slices.find((slice) => slice.id === hover);

  return (
    <div className="rx-donut">
      <svg viewBox="0 0 220 220" role="img" aria-label="Monthly value by division">
        <g transform="rotate(-90 110 110)">
          {slices.map((slice) => {
            const length = (slice.value / total) * circumference;
            const gap = slices.length > 1 ? 3 : 0;
            const dash = `${Math.max(length - gap, 0.5)} ${circumference}`;
            const element = (
              <circle
                key={slice.id}
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={hover === slice.id ? 30 : 24}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                className="rx-slice"
                onMouseEnter={() => setHover(slice.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => slice.id !== "suite" && onPick(slice.id)}
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
            <span>{slice.name}</span>
            <b>{inr(slice.value)}</b>
            <small>{Math.round((slice.value / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BeforeAfterBars({ rows }: { rows: BeforeAfter[] }) {
  if (rows.length === 0) return <p className="rx-empty">Turn on Forex, Corporate, Domestic, or Call QC to compare today with the agents.</p>;
  return (
    <ul className="rx-ba">
      {rows.map((row) => {
        const max = Math.max(row.today, row.after, 1);
        const lift = row.today > 0 ? row.after / row.today : null;
        return (
          <li key={row.label}>
            <div className="rx-ba-head">
              <strong>{row.label}</strong>
              <span className="rx-lift">{lift ? `${lift.toFixed(1)}×` : "new"}</span>
            </div>
            <div className="rx-ba-row">
              <small>Today</small>
              <span className="rx-ba-track">
                <i className="today" style={{ width: `${Math.max((row.today / max) * 100, row.today ? 1.5 : 0)}%` }} />
              </span>
              <b>{num(row.today)}</b>
            </div>
            <div className="rx-ba-row">
              <small>With agents</small>
              <span className="rx-ba-track">
                <i className="after" style={{ width: `${(row.after / max) * 100}%` }} />
              </span>
              <b>{num(row.after)}</b>
            </div>
            <p>{row.note}</p>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────── division calculator ───────── */

function DivisionPanel({
  item,
  values,
  setValue,
  toggle,
}: {
  item: DivisionResult;
  values: SuiteValues;
  setValue: (id: string, value: number) => void;
  toggle: () => void;
}) {
  const { division } = item;
  const color = DIVISION_COLORS[division.id];
  return (
    <div className="card rx-panel" style={{ "--c": color } as CSSProperties}>
      <header className="rc-division-head">
        <div>
          <h3>{division.name}</h3>
          <p>{division.pitch}</p>
          <p className="sr-agents">
            Agents: {division.agents} ·{" "}
            <Link href={division.href} className="roi-link">
              Open the division
            </Link>
          </p>
        </div>
        <IncludeSwitch on={item.enabled} label={`Include ${division.name}`} onToggle={toggle} />
      </header>

      <div className="rx-panel-grid">
        <div className="rc-volumes">
          {division.volumes.map((lever) => {
            const id = `${division.id}.${lever.id}`;
            return <VolumeSlider key={id} id={id} lever={lever} value={values[id]} onChange={(value) => setValue(id, value)} />;
          })}
        </div>
        <div className="rx-result">
          <span>This division earns you</span>
          <strong>
            <Counter value={item.net} />
          </strong>
          <small>
            net a month · {times(item.roi)} its fee of {inr(item.fee)}
          </small>
        </div>
      </div>

      <ol className="rc-flow">
        {item.flow.map((step) => (
          <li key={step.label} className={step.money ? "money" : undefined}>
            <small>{step.label}</small>
            <strong>{step.value}</strong>
            <span>{step.detail}</span>
          </li>
        ))}
      </ol>

      <div className="rx-drivers">
        {item.drivers.map((driver) => (
          <DriverCard key={driver.id} driver={driver} />
        ))}
      </div>

      <details className="rc-finetune rx-inner">
        <summary>
          <span>
            <strong>Fine-tune the rates</strong>
            <small>Conversion, minutes saved, margins, and the fee for {division.name.toLowerCase()}</small>
          </span>
        </summary>
        <div className="rc-finetune-body">
          {division.rates.map((lever) => {
            const id = `${division.id}.${lever.id}`;
            return <RateRow key={id} id={id} lever={lever} value={values[id]} onChange={(value) => setValue(id, value)} />;
          })}
        </div>
      </details>
    </div>
  );
}

/* ───────── inputs ───────── */

function shownValue(lever: Lever, value: number): number {
  return lever.unit === "pct" ? Number((value * 100).toFixed(4)) : value;
}

function parseInput(lever: Lever, raw: string): number | null {
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed)) return null;
  return lever.unit === "pct" ? parsed / 100 : parsed;
}

const SUFFIX: Record<string, string> = { pct: "%", min: "min", hrs: "h" };

function VolumeSlider({ id, lever, value, onChange }: { id: string; lever: Lever; value: number; onChange: (value: number) => void }) {
  const min = lever.min ?? 0;
  const max = Math.max(lever.max ?? value * 2, value);
  const fill = ((value - min) / Math.max(max - min, 1)) * 100;
  return (
    <div className="rc-volume">
      <div className="rc-volume-head">
        <label htmlFor={`rc-${id}`}>{lever.label}</label>
        <span className="roi-field rc-volume-field">
          {lever.unit === "inr" ? <span>₹</span> : null}
          <input
            id={`rc-${id}`}
            type="number"
            inputMode="numeric"
            value={value}
            min={0}
            step={lever.step ?? 1}
            onChange={(event) => {
              const parsed = parseInput(lever, event.target.value);
              if (parsed !== null && parsed >= 0) onChange(parsed);
            }}
          />
        </span>
      </div>
      <input
        className="rc-range"
        type="range"
        min={min}
        max={max}
        step={lever.step ?? 1}
        value={value}
        aria-label={lever.label}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="rc-volume-foot">
        <small>{lever.note}</small>
        <small>
          {formatLever(lever, min)} – {formatLever(lever, max)}
        </small>
      </div>
    </div>
  );
}

function RateRow({ id, lever, value, onChange }: { id: string; lever: Lever; value: number; onChange: (value: number) => void }) {
  const edited = value !== lever.value;
  return (
    <div className={`roi-irow${lever.source === "est" ? " est" : ""}${edited ? " edited" : ""}`}>
      <div className="roi-ilabel">
        <label htmlFor={`rc-${id}`}>{lever.label}</label>
        <p>{lever.note}</p>
        <div className="roi-imeta">
          <span className={`roi-tag ${lever.source}`}>
            <i aria-hidden="true" />
            {SOURCE_LABELS[lever.source]}
          </span>
          {edited ? (
            <button type="button" className="roi-link" onClick={() => onChange(lever.value)}>
              Reset to {formatLever(lever, lever.value)}
            </button>
          ) : null}
        </div>
      </div>
      <span className="roi-field">
        {lever.unit === "inr" ? <span>₹</span> : null}
        <input
          id={`rc-${id}`}
          type="number"
          inputMode="decimal"
          step={lever.unit === "pct" ? "0.1" : lever.unit === "inr" ? "100" : "1"}
          value={shownValue(lever, value)}
          onChange={(event) => {
            const parsed = parseInput(lever, event.target.value);
            if (parsed !== null) onChange(parsed);
          }}
        />
        {SUFFIX[lever.unit] ? <span>{SUFFIX[lever.unit]}</span> : null}
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


function DriverCard({ driver }: { driver: Driver }) {
  return (
    <details className="card roi-panel rc-driver">
      <summary>
        <span className={`roi-dot ${driver.kind}`} aria-hidden="true" />
        <span className="rc-driver-text">
          <strong>{driver.name}</strong>
          <small>{driver.what}</small>
        </span>
        <b className={driver.value < 0 ? "neg" : undefined}>{inr(driver.value)}</b>
      </summary>
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
            {driver.steps.map((step, index) => (
              <tr key={step.label} className={index === driver.steps.length - 1 ? "total" : undefined}>
                <td>{step.label}</td>
                <td className="work">{step.work}</td>
                <td className={step.value < 0 ? "r neg" : "r"}>{formatStep(step.value, step.format)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}


/* ───────── export ───────── */

function downloadCsv(r: SuiteResult, values: SuiteValues) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [
    ["Travel Suite ROI calculator"],
    [],
    ["Division", "In plan", "Volume", "Value per month (INR)", "Fee per month (INR)", "Net (INR)", "Return on fee"],
    ...r.divisions.map((item): (string | number)[] => [
      item.division.name,
      item.enabled ? "Yes" : "No",
      item.headline,
      Math.round(item.value),
      Math.round(item.fee),
      Math.round(item.net),
      item.roi == null ? "" : item.roi.toFixed(2),
    ]),
    ...r.suiteDrivers.map((driver): (string | number)[] => [`Suite effect: ${driver.name}`, "Yes", "", Math.round(driver.value), 0, Math.round(driver.value), ""]),
    ["Total", "", "", Math.round(r.value), Math.round(r.fee), Math.round(r.net), r.roi == null ? "" : r.roi.toFixed(2)],
    [],
    ["Flow", "Division", "Value"],
    ...r.divisions.flatMap((item) => item.flow.map((step): (string | number)[] => [step.label, item.division.name, step.value])),
    [],
    ["Input", "Value", "Unit", "Source", "Note"],
    ...Object.keys(DEFAULTS).map((id): (string | number)[] => {
      const lever = leverById(id) as Lever;
      return [`${id.split(".")[0]}: ${lever.label}`, values[id], lever.unit, SOURCE_LABELS[lever.source], lever.note];
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
