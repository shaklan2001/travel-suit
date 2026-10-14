"use client";

import { useState } from "react";
import { DROP_OFFS, FUNNEL, type FunnelPeriod } from "../../data/holiday-funnel";
import { inrShort } from "../../data/trip-document";

const pct = (part: number, whole: number, digits = 0) => (whole ? `${((part / whole) * 100).toFixed(digits)}%` : "—");

/** Funnel: from a widget open to a paid booking, and the revenue the planner brought in. */
export function FunnelDashboard() {
  const [period, setPeriod] = useState<FunnelPeriod>("30d");
  const data = FUNNEL[period];
  const stages = data.stages;
  const top = stages[0].value;
  const leads = stages.find((stage) => stage.id === "lead")?.value ?? 0;
  const chats = stages.find((stage) => stage.id === "chat")?.value ?? 0;
  const bookings = stages[stages.length - 1].value;
  const maxWeek = Math.max(...data.weeks.map((week) => week.leads), 1);
  const maxDestination = Math.max(...data.destinations.map((row) => row.leads), 1);

  return (
    <div className="pl-stack">
      <section className="pl-intro pl-intro-row">
        <div>
          <h2>From a chat on your site to a paid booking</h2>
          <p>Every stage of the trip planner, the revenue it brought in, and where travellers drop off.</p>
        </div>
        <div className="segmented" role="group" aria-label="Period">
          {(Object.keys(FUNNEL) as FunnelPeriod[]).map((value) => (
            <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>
              {FUNNEL[value].label}
            </button>
          ))}
        </div>
      </section>

      <section className="pl-kpis" aria-label="Funnel figures">
        <article className="card pl-kpi-hero">
          <span>Booked revenue</span>
          <strong>{inrShort(data.revenue)}</strong>
          <small>
            {bookings} bookings · {inrShort(data.revenue / bookings)} average
          </small>
        </article>
        <article className="card">
          <span>Chat to lead</span>
          <strong>{pct(leads, chats)}</strong>
          <small>of chats asked for a quote</small>
        </article>
        <article className="card">
          <span>Lead to booking</span>
          <strong>{pct(bookings, leads)}</strong>
          <small>of leads booked</small>
        </article>
        <article className="card">
          <span>Revenue per 1,000 visitors</span>
          <strong>{inrShort((data.revenue / data.visitors) * 1000)}</strong>
          <small>{data.visitors.toLocaleString("en-IN")} site visitors</small>
        </article>
      </section>

      <section className="card pl-card">
        <header className="pl-card-head pl-card-head-row">
          <div>
            <h3>Funnel</h3>
            <p>
              {pct(bookings, top, 1)} of widget opens became a booking · median time to quote {data.medianQuoteMinutes} min
            </p>
          </div>
        </header>
        <ol className="fn-funnel">
          {stages.map((stage, index) => {
            const previous = index > 0 ? stages[index - 1].value : null;
            return (
              <li key={stage.id}>
                <div className="fn-label">
                  <strong>{stage.label}</strong>
                  <small>{stage.detail}</small>
                </div>
                <div className="fn-bar-track">
                  <span className="fn-bar" style={{ width: `${Math.max((stage.value / top) * 100, 2)}%` }} />
                </div>
                <div className="fn-value">
                  <strong>{stage.value.toLocaleString("en-IN")}</strong>
                  {previous !== null ? <small>{pct(stage.value, previous)} of previous</small> : <small>start</small>}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="fn-grid">
        <section className="card pl-card">
          <header className="pl-card-head">
            <h3>By channel</h3>
          </header>
          <div className="table-wrap">
            <table className="fn-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th className="r">Chats</th>
                  <th className="r">Leads</th>
                  <th className="r">Bookings</th>
                  <th className="r">Revenue</th>
                  <th className="r">Chat → booking</th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((row) => (
                  <tr key={row.channel}>
                    <td>{row.channel}</td>
                    <td className="r">{row.chats.toLocaleString("en-IN")}</td>
                    <td className="r">{row.leads}</td>
                    <td className="r">{row.bookings}</td>
                    <td className="r">{inrShort(row.revenue)}</td>
                    <td className="r">{pct(row.bookings, row.chats, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card pl-card">
          <header className="pl-card-head pl-card-head-row">
            <div>
              <h3>Leads and bookings</h3>
              <p>{data.label}</p>
            </div>
            <div className="fn-legend">
              <span>
                <i className="leads" /> Leads
              </span>
              <span>
                <i className="bookings" /> Bookings
              </span>
            </div>
          </header>
          <div className="fn-columns" role="img" aria-label={`Leads and bookings, ${data.label.toLowerCase()}`}>
            {data.weeks.map((week) => (
              <div key={week.label} className="fn-col">
                <div className="fn-col-bars">
                  <span className="leads" style={{ height: `${(week.leads / maxWeek) * 100}%` }} title={`${week.leads} leads`} />
                  <span className="bookings" style={{ height: `${(week.bookings / maxWeek) * 100}%` }} title={`${week.bookings} bookings`} />
                </div>
                <small>{week.label}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fn-grid">
        <section className="card pl-card">
          <header className="pl-card-head">
            <h3>Top destinations</h3>
            <p>Leads, with the share that booked</p>
          </header>
          <ul className="fn-dest">
            {data.destinations.map((row) => (
              <li key={row.name}>
                <span>{row.name}</span>
                <div className="fn-bar-track small">
                  <span className="fn-bar" style={{ width: `${(row.leads / maxDestination) * 100}%` }} />
                </div>
                <b>{row.leads}</b>
                <small>{pct(row.bookings, row.leads)} booked</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="card pl-card">
          <header className="pl-card-head">
            <h3>Where travellers drop off</h3>
            <p>And what the agents change next</p>
          </header>
          <ul className="fn-insights">
            {DROP_OFFS.map((item) => (
              <li key={item.stage}>
                <small>{item.stage}</small>
                <strong>{item.insight}</strong>
                <span>{item.action}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
