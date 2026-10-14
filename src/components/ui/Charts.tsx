"use client";

import { useState } from "react";
import type { DayVolume, StageCount } from "../../data/types";

interface StageBarsProps {
  title: string;
  unit: string;
  stages: StageCount[];
}

/** Single-series horizontal bars: how many items sit at each stage right now. */
export function StageBars({ title, unit, stages }: StageBarsProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...stages.map((stage) => stage.value), 1);
  const total = stages.reduce((sum, stage) => sum + stage.value, 0);

  return (
    <figure className="card chart-card">
      <figcaption className="chart-head">
        <span>
          <strong>{title}</strong>
          <small>
            {total} {unit} open now
          </small>
        </span>
      </figcaption>
      <ul className="stage-bars" onMouseLeave={() => setActive(null)}>
        {stages.map((stage, index) => (
          <li
            key={stage.label}
            className={active === index ? "active" : undefined}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            tabIndex={0}
            aria-label={`${stage.label}: ${stage.value} ${unit}`}
          >
            <span className="stage-label">{stage.label}</span>
            <span className="stage-track">
              <span className="stage-fill" style={{ width: `${(stage.value / max) * 100}%` }} />
            </span>
            <span className="stage-value">{stage.value}</span>
            {active === index ? (
              <span className="chart-tip" role="tooltip">
                <b>{stage.label}</b>
                {stage.value} {unit} · {Math.round((stage.value / total) * 100)}% of open
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <ChartTable headers={["Stage", unit]} rows={stages.map((stage) => [stage.label, String(stage.value)])} />
    </figure>
  );
}

interface WeekColumnsProps {
  title: string;
  week: DayVolume[];
}

/** Two-series stacked columns: per day, what the agents closed and what needed a person. */
export function WeekColumns({ title, week }: WeekColumnsProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...week.map((day) => day.auto + day.human), 1);
  const auto = week.reduce((sum, day) => sum + day.auto, 0);
  const human = week.reduce((sum, day) => sum + day.human, 0);
  const rate = Math.round((auto / Math.max(auto + human, 1)) * 100);

  return (
    <figure className="card chart-card">
      <figcaption className="chart-head">
        <span>
          <strong>{title}</strong>
          <small>
            {auto + human} handled · {human} needed a person
          </small>
        </span>
        <span className="chart-hero" aria-label={`${rate} percent closed by agents`}>
          {rate}%<small>closed by agents</small>
        </span>
      </figcaption>
      <div className="chart-legend" aria-hidden="true">
        <span>
          <i className="swatch series-1" /> Closed by agents
        </span>
        <span>
          <i className="swatch series-2" /> Needed a person
        </span>
      </div>
      <div className="week-columns" onMouseLeave={() => setActive(null)}>
        {week.map((day, index) => {
          const total = day.auto + day.human;
          return (
            <div
              key={day.day}
              className={`week-col${active === index ? " active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              tabIndex={0}
              aria-label={`${day.day}: ${day.auto} closed by agents, ${day.human} needed a person`}
            >
              <span className="week-stack" style={{ height: `${(total / max) * 100}%` }}>
                <span className="week-seg series-2" style={{ flexGrow: day.human }} />
                <span className="week-seg series-1" style={{ flexGrow: day.auto }} />
              </span>
              <span className="week-day">{day.day}</span>
              {active === index ? (
                <span className="chart-tip" role="tooltip">
                  <b>{day.day}</b>
                  <span>
                    <i className="swatch series-1" /> {day.auto} closed by agents
                  </span>
                  <span>
                    <i className="swatch series-2" /> {day.human} needed a person
                  </span>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <ChartTable
        headers={["Day", "Closed by agents", "Needed a person"]}
        rows={week.map((day) => [day.day, String(day.auto), String(day.human)])}
      />
    </figure>
  );
}

interface MixRow {
  label: string;
  auto: number;
  human: number;
}

/** Stacked horizontal bars: per process, how much agents closed and how much needed a person. */
export function ProcessMixBars({ title, rows }: { title: string; rows: MixRow[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...rows.map((row) => row.auto + row.human), 1);

  return (
    <figure className="card chart-card">
      <figcaption className="chart-head">
        <span>
          <strong>{title}</strong>
          <small>Last 7 days, by process</small>
        </span>
      </figcaption>
      <div className="chart-legend" aria-hidden="true">
        <span>
          <i className="swatch series-1" /> Closed by agents
        </span>
        <span>
          <i className="swatch series-2" /> Needed a person
        </span>
      </div>
      <ul className="stage-bars mix-bars" onMouseLeave={() => setActive(null)}>
        {rows.map((row, index) => {
          const total = row.auto + row.human;
          return (
            <li
              key={row.label}
              className={active === index ? "active" : undefined}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              tabIndex={0}
              aria-label={`${row.label}: ${row.auto} closed by agents, ${row.human} needed a person`}
            >
              <span className="stage-label">{row.label}</span>
              <span className="mix-track">
                <span className="mix-stack" style={{ width: `${(total / max) * 100}%` }}>
                  <span className="mix-seg series-1" style={{ flexGrow: row.auto }} />
                  <span className="mix-seg series-2" style={{ flexGrow: row.human }} />
                </span>
              </span>
              <span className="stage-value">{total}</span>
              {active === index ? (
                <span className="chart-tip" role="tooltip">
                  <b>{row.label}</b>
                  <span>
                    <i className="swatch series-1" /> {row.auto} closed by agents
                  </span>
                  <span>
                    <i className="swatch series-2" /> {row.human} needed a person
                  </span>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <ChartTable
        headers={["Process", "Closed by agents", "Needed a person"]}
        rows={rows.map((row) => [row.label, String(row.auto), String(row.human)])}
      />
    </figure>
  );
}

function ChartTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <details className="chart-table">
      <summary>Show as table</summary>
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td key={`${row[0]}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
