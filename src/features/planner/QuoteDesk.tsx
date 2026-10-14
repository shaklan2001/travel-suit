"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { destinationById, photoUrl, STYLE_LABELS } from "../../data/destinations";
import {
  CHANNEL_LABELS,
  choicesToQuery,
  defaultChoices,
  flightOptions,
  HOLIDAY_LEADS,
  inr,
  leadPlan,
  leadTitle,
  PACKAGE_GST,
  priceQuote,
  STATUS_LABELS,
  stayOptions,
  type HolidayLead,
  type LeadStatus,
  type QuoteChoices,
} from "../../data/holiday-desk";
import { MONTHS, travellerLabel } from "../../data/trip-planner";

type Filter = "all" | LeadStatus;
type ExtraKey = "sightseeing" | "visa" | "insurance" | "forex";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "quoting", label: "Quoting" },
  { id: "quoted", label: "Sent" },
  { id: "follow_up", label: "Follow-up" },
  { id: "booked", label: "Booked" },
];

/** Quote desk: every lead from the widget, the options to compare, and the price that goes out. */
export function QuoteDesk() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState(HOLIDAY_LEADS[0].code);
  const [statuses, setStatuses] = useState<Record<string, LeadStatus>>(() =>
    Object.fromEntries(HOLIDAY_LEADS.map((lead) => [lead.code, lead.status])),
  );
  const [choices, setChoices] = useState<Record<string, QuoteChoices>>(() =>
    Object.fromEntries(HOLIDAY_LEADS.map((lead) => [lead.code, defaultChoices(lead)])),
  );
  const [toast, setToast] = useState<string | null>(null);

  const visible = HOLIDAY_LEADS.filter((lead) => filter === "all" || statuses[lead.code] === filter);
  const lead = HOLIDAY_LEADS.find((item) => item.code === selected) ?? HOLIDAY_LEADS[0];
  const counts = (status: LeadStatus) => HOLIDAY_LEADS.filter((item) => statuses[item.code] === status).length;
  const sentValue = HOLIDAY_LEADS.filter((item) => ["quoted", "follow_up", "booked"].includes(statuses[item.code])).reduce(
    (sum, item) => sum + priceQuote(item, choices[item.code]).total,
    0,
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };
  const setStatus = (code: string, status: LeadStatus) => setStatuses((current) => ({ ...current, [code]: status }));

  return (
    <div className="pl-stack">
      <section className="pl-kpis" aria-label="Quote desk figures">
        <article className="card">
          <span>New leads</span>
          <strong>{counts("new")}</strong>
          <small>from the widget and WhatsApp</small>
        </article>
        <article className="card">
          <span>Being quoted</span>
          <strong>{counts("quoting")}</strong>
          <small>options picked, price pending</small>
        </article>
        <article className="card">
          <span>Quotes out</span>
          <strong>{counts("quoted") + counts("follow_up")}</strong>
          <small>{inr(sentValue)} in value</small>
        </article>
        <article className="card">
          <span>Median time to quote</span>
          <strong>18 min</strong>
          <small>from lead to sent PDF</small>
        </article>
      </section>

      <div className="pl-desk">
        <aside className="card pl-leads" aria-label="Leads">
          <div className="pl-lead-filters" role="tablist" aria-label="Filter leads">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <ul>
            {visible.map((item) => {
              const destination = destinationById(item.brief.destinationId ?? "");
              return (
                <li key={item.code}>
                  <button type="button" aria-current={item.code === lead.code ? "true" : undefined} onClick={() => setSelected(item.code)}>
                    <span className="pl-lead-thumb" style={{ backgroundImage: `url(${photoUrl(destination?.photos[0] ?? "", 160)})` }} />
                    <span className="pl-lead-text">
                      <strong>{item.names}</strong>
                      <small>{leadTitle(item)}</small>
                      <em>
                        {CHANNEL_LABELS[item.channel]} · {item.received}
                      </em>
                    </span>
                    <span className={`pl-status ${statuses[item.code]}`}>{STATUS_LABELS[statuses[item.code]]}</span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 ? <li className="pl-empty">No leads here right now.</li> : null}
          </ul>
        </aside>

        <LeadWorkspace
          key={lead.code}
          lead={lead}
          status={statuses[lead.code]}
          choices={choices[lead.code]}
          onChoices={(next) => {
            setChoices((current) => ({ ...current, [lead.code]: next }));
            if (statuses[lead.code] === "new") setStatus(lead.code, "quoting");
          }}
          onSend={(channel) => {
            setStatus(lead.code, "quoted");
            notify(`Quote sent to ${lead.names} on ${channel}.`);
          }}
          onBooked={() => {
            setStatus(lead.code, "booked");
            notify(`${lead.code} marked as booked.`);
          }}
        />
      </div>

      {toast ? (
        <div className="pl-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

interface LeadWorkspaceProps {
  lead: HolidayLead;
  status: LeadStatus;
  choices: QuoteChoices;
  onChoices: (choices: QuoteChoices) => void;
  onSend: (channel: string) => void;
  onBooked: () => void;
}

function LeadWorkspace({ lead, status, choices, onChoices, onSend, onBooked }: LeadWorkspaceProps) {
  const destination = destinationById(lead.brief.destinationId ?? "");
  const flights = useMemo(() => flightOptions(lead), [lead]);
  const stays = useMemo(() => stayOptions(lead), [lead]);
  const plan = useMemo(() => leadPlan(lead), [lead]);
  const quote = priceQuote(lead, choices);
  const [showPlan, setShowPlan] = useState(false);
  const international = destination?.region === "international";
  const set = <K extends keyof QuoteChoices>(key: K, value: QuoteChoices[K]) => onChoices({ ...choices, [key]: value });
  const pax = lead.brief.pax ?? 2;

  const facts: [string, string][] = [
    ["Travellers", travellerLabel(lead.brief) ?? `${pax} travellers`],
    ["From", lead.brief.origin ?? "—"],
    ["When", lead.brief.month ? MONTHS[lead.brief.month - 1] : "Flexible"],
    ["Length", `${lead.brief.days} days`],
    ["Stay", STYLE_LABELS[lead.brief.style ?? "comfort"]],
    ["AI estimate", `${inr(plan.totalLow)} – ${inr(plan.totalHigh)}`],
  ];

  return (
    <div className="pl-workspace">
      <section className="card pl-lead-head">
        <div className="pl-lead-cover" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,20,32,.78), rgba(8,20,32,.2)), url(${photoUrl(destination?.photos[0] ?? "", 1200)})` }}>
          <div>
            <p className="pl-overline">
              {lead.code} · {CHANNEL_LABELS[lead.channel]} · {lead.received}
            </p>
            <h2>{lead.names}</h2>
            <p>{leadTitle(lead)}</p>
          </div>
          <span className={`pl-status ${status}`}>{STATUS_LABELS[status]}</span>
        </div>
        <blockquote className="pl-ask">“{lead.ask}”</blockquote>
        <dl className="pl-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="pl-link" onClick={() => setShowPlan((open) => !open)} aria-expanded={showPlan}>
          {showPlan ? "Hide" : "Show"} the {plan.days.length}-day plan from the chat
        </button>
        {showPlan ? (
          <ol className="pl-plan">
            {plan.days.map((day) => (
              <li key={day.day}>
                <b>Day {day.day}</b> {day.text}
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <div className="pl-quote-grid">
        <div className="pl-stack">
          <section className="card pl-card">
            <header className="pl-card-head pl-card-head-row">
              <div>
                <h3>Flights</h3>
                <p>
                  {lead.brief.origin} → {destination?.gateway} · return · {pax} {pax === 1 ? "adult" : "adults"} · ranked by Fare Compare
                </p>
              </div>
            </header>
            <div className="pl-options" role="radiogroup" aria-label="Flight options">
              {flights.map((flight) => (
                <button
                  key={flight.id}
                  type="button"
                  role="radio"
                  aria-checked={choices.flightId === flight.id}
                  className="pl-option"
                  onClick={() => set("flightId", flight.id)}
                >
                  <span className="pl-option-main">
                    <strong>{flight.airline}</strong>
                    <small>{flight.flightNo}</small>
                  </span>
                  <span className="pl-flight-times">
                    <b>{flight.depart}</b>
                    <i aria-hidden="true">
                      <em>{flight.duration}</em>
                    </i>
                    <b>{flight.arrive}</b>
                    <small>{flight.stops === 0 ? "Non-stop" : `1 stop · ${flight.via}`}</small>
                  </span>
                  <span className="pl-option-price">
                    {flight.tag ? <em className={`pl-tag ${flight.tag === "Cheapest" ? "ok" : flight.tag === "Fastest" ? "info" : ""}`}>{flight.tag}</em> : null}
                    <strong>{inr(flight.fare)}</strong>
                    <small>per person · {flight.baggage}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="card pl-card">
            <header className="pl-card-head">
              <h3>Stays</h3>
              <p>
                {Math.max((lead.brief.days ?? 6) - 1, 1)} nights · {Math.ceil(pax / 2)} room{pax > 2 ? "s" : ""} · shortlisted by Stay Match
              </p>
            </header>
            <div className="pl-options" role="radiogroup" aria-label="Stay options">
              {stays.map((stay, index) => (
                <button
                  key={stay.id}
                  type="button"
                  role="radio"
                  aria-checked={choices.stayId === stay.id}
                  className="pl-option pl-stay"
                  onClick={() => set("stayId", stay.id)}
                >
                  <span className="pl-stay-photo" style={{ backgroundImage: `url(${photoUrl(destination?.photos[index % (destination?.photos.length ?? 1)] ?? "", 300)})` }} />
                  <span className="pl-option-main">
                    <strong>{stay.name}</strong>
                    <small>
                      {stay.area} · {"★".repeat(stay.stars)} · {stay.rating} guest rating
                    </small>
                    <em>{stay.reason}</em>
                  </span>
                  <span className="pl-option-price">
                    <strong>{inr(stay.rate)}</strong>
                    <small>per room night · {stay.board}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="card pl-card">
            <header className="pl-card-head">
              <h3>Extras</h3>
            </header>
            <ul className="pl-toggles">
              {(
                [
                  ["sightseeing", "Transfers and sightseeing", "Private transfers and every day tour in the plan", true],
                  ["visa", "Visa assistance", international ? "Visa desk files and tracks the application" : "Not needed for this trip", international],
                  ["insurance", "Travel insurance", "Medical, baggage, and trip cancellation", true],
                  ["forex", "Forex card", international ? "Arranged by the forex desk, delivered before the trip" : "Not needed for this trip", international],
                 ] as [ExtraKey, string, string, boolean][]
              ).map(([key, label, detail, enabled]) => (
                <li key={key}>
                  <div>
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    className="pl-switch"
                    aria-label={label}
                    aria-checked={Boolean(choices[key]) && enabled}
                    disabled={!enabled}
                    onClick={() => set(key, !choices[key])}
                  >
                    <i aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="card pl-price" aria-label="Quote">
          <header>
            <p className="pl-overline">Quote · drafted by Quote Builder</p>
            <strong className="pl-price-total">{inr(quote.total)}</strong>
            <small>
              {inr(quote.perPerson)} per person · all taxes included
            </small>
          </header>
          <ul className="pl-price-lines">
            {quote.lines.map((line) => (
              <li key={line.label}>
                <span>
                  {line.label}
                  <small>{line.detail}</small>
                </span>
                <b>{inr(line.cost)}</b>
              </li>
            ))}
            <li className="pl-price-sub">
              <span>Cost</span>
              <b>{inr(quote.cost)}</b>
            </li>
          </ul>
          <label className="pl-markup">
            <span>
              Your markup <b>{choices.markupPct}%</b>
            </span>
            <input type="range" min={0} max={25} step={1} value={choices.markupPct} onChange={(event) => set("markupPct", Number(event.target.value))} />
          </label>
          <ul className="pl-price-lines">
            <li>
              <span>Markup</span>
              <b>{inr(quote.markup)}</b>
            </li>
            <li>
              <span>GST on package ({Math.round(PACKAGE_GST * 100)}%)</span>
              <b>{inr(quote.gst)}</b>
            </li>
            <li className="pl-price-total-row">
              <span>Total to the traveller</span>
              <b>{inr(quote.total)}</b>
            </li>
          </ul>
          <p className={`pl-margin${quote.marginPct < 0.07 ? " low" : ""}`}>
            Margin {(quote.marginPct * 100).toFixed(1)}% · {inr(quote.markup)} on this booking
          </p>
          <div className="pl-actions">
            <Link className="pl-btn primary" href={`/planner/documents?${choicesToQuery(lead, choices)}`}>
              Design the quote PDF
            </Link>
            <div className="pl-actions-row">
              <button type="button" className="pl-btn" onClick={() => onSend("WhatsApp")}>
                Send on WhatsApp
              </button>
              <button type="button" className="pl-btn" onClick={() => onSend("email")}>
                Email
              </button>
            </div>
            {status === "quoted" || status === "follow_up" ? (
              <button type="button" className="pl-btn ghost" onClick={onBooked}>
                Mark as booked
              </button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
